#import "ZKitWheelPicker.h"

#import <QuartzCore/QuartzCore.h>
#import <React/RCTConvert.h>
#import <React/RCTUtils.h>

#import "ZKitWheelPickerLabel.h"

@interface ZKitWheelPickerRowView : UIView

@property (nonatomic, assign) NSInteger row;
@property (nonatomic, assign, getter=isItemDisabled) BOOL itemDisabled;
@property (nonatomic, strong) ZKitWheelPickerLabel *label;
@property (nonatomic, strong) UIView *selectionContainer;
@property (nonatomic, strong) ZKitWheelPickerLabel *selectedLabel;

@end

@implementation ZKitWheelPickerRowView
@end

@interface ZKitWheelPicker() <UIPickerViewDataSource, UIPickerViewDelegate, UIPickerViewAccessibilityDelegate> {
  // React Native may set every exported prop again during a commit. Keep those
  // setters cheap and collapse the genuinely changed props into one picker
  // refresh on the next main-loop turn.
  BOOL _updateScheduled;
  BOOL _needsReload;
  BOOL _needsLayoutUpdate;
  BOOL _needsSelectionUpdate;
  BOOL _needsColorUpdate;
  BOOL _hasAppliedSelection;
  // Keep the JS-requested index separate from the currently applied row.
  // React Native does not guarantee whether `items` or `selectedIndex` arrives
  // first in a prop transaction, so clamping must wait for the batched apply.
  NSInteger _requestedSelectedIndex;
  NSMapTable<NSNumber *, ZKitWheelPickerRowView *> *_visibleRowViews;
  NSHashTable<UIPanGestureRecognizer *> *_trackedPanGestures;
  CADisplayLink *_selectionDisplayLink;
  CFTimeInterval _minimumTrackingUntil;
}

- (void)scheduleReload:(BOOL)reload layout:(BOOL)layout selection:(BOOL)selection;
- (void)scheduleColorUpdate;
- (void)applyScheduledUpdates;
- (void)finishSyncCurrentSelection:(BOOL)shouldSnap requestId:(NSInteger)requestId;
- (void)restoreRequestedSelection;
- (void)commitSelectionAtRow:(NSInteger)row syncRequestId:(NSNumber *)syncRequestId;
- (void)refreshSelectionMasks;
- (void)updateSelectionMaskForRowView:(ZKitWheelPickerRowView *)rowView
                        selectionBand:(CGRect)selectionBand;
- (void)refreshVisibleRowAppearances;
- (void)registerPanGesturesInView:(UIView *)view;
- (void)startSelectionTrackingForDuration:(CFTimeInterval)duration;
- (void)stopSelectionTracking;

@end

@implementation ZKitWheelPicker

static BOOL ZKitStopDeceleratingScrollViews(UIView *view)
{
  BOOL wasMoving = NO;

  for (UIView *subview in view.subviews) {
    if ([subview isKindOfClass:[UIScrollView class]]) {
      UIScrollView *scrollView = (UIScrollView *)subview;
      wasMoving = wasMoving || scrollView.isTracking || scrollView.isDragging ||
          scrollView.isDecelerating || scrollView.layer.animationKeys.count > 0;
      [scrollView setContentOffset:scrollView.contentOffset animated:NO];
      [scrollView.layer removeAllAnimations];
    }

    wasMoving = ZKitStopDeceleratingScrollViews(subview) || wasMoving;
  }

  return wasMoving;
}

static BOOL ZKitHasMovingScrollViews(UIView *view)
{
  for (UIView *subview in view.subviews) {
    if ([subview isKindOfClass:[UIScrollView class]]) {
      UIScrollView *scrollView = (UIScrollView *)subview;
      UIGestureRecognizerState panState = scrollView.panGestureRecognizer.state;
      if (scrollView.isTracking || scrollView.isDragging || scrollView.isDecelerating ||
          panState == UIGestureRecognizerStateBegan || panState == UIGestureRecognizerStateChanged) {
        return YES;
      }
    }

    if (ZKitHasMovingScrollViews(subview)) {
      return YES;
    }
  }

  return NO;
}

- (instancetype)initWithFrame:(CGRect)frame
{
  self = [super initWithFrame:frame];
  if (!self) {
    return nil;
  }

  _items = @[];
  _selectedIndex = NSNotFound;
  _requestedSelectedIndex = NSNotFound;
  _disabled = NO;
  _color = [UIColor blackColor];
  _itemColor = [UIColor grayColor];
  _disabledColor = [UIColor lightGrayColor];
  _font = [UIFont systemFontOfSize:21 weight:UIFontWeightRegular];
  _rowHeight = 0;
  _numberOfLines = 1;
  _visibleRowViews = [NSMapTable strongToWeakObjectsMapTable];
  _trackedPanGestures = [NSHashTable weakObjectsHashTable];

  self.delegate = self;
  self.dataSource = self;
  self.userInteractionEnabled = YES;

  return self;
}

RCT_NOT_IMPLEMENTED(- (instancetype)initWithCoder:(NSCoder *)coder)

- (void)dealloc
{
  [self stopSelectionTracking];
  for (UIPanGestureRecognizer *gesture in _trackedPanGestures) {
    [gesture removeTarget:self action:@selector(handlePickerPan:)];
  }
}

- (void)didMoveToWindow
{
  [super didMoveToWindow];
  if (self.window == nil) {
    [self stopSelectionTracking];
  } else {
    // Retained sheets can reparent this picker without changing its bounds.
    // Recompute the fixed selection band even when UIKit skips a size change.
    [self setNeedsLayout];
    [self refreshSelectionMasks];
  }
}

- (void)layoutSubviews
{
  [super layoutSubviews];
  [self registerPanGesturesInView:self];
  [self refreshSelectionMasks];
}

- (void)accessibilityIncrement
{
  if (!_disabled) {
    [super accessibilityIncrement];
  }
}

- (void)accessibilityDecrement
{
  if (!_disabled) {
    [super accessibilityDecrement];
  }
}

- (void)setItems:(NSArray<NSDictionary *> *)items
{
  NSArray<NSDictionary *> *nextItems = items ?: @[];
  if (_items == nextItems || [_items isEqualToArray:nextItems]) {
    return;
  }

  _items = [nextItems copy];
  [self scheduleReload:YES layout:YES selection:YES];
}

- (void)setSelectedIndex:(NSInteger)selectedIndex
{
  if (_requestedSelectedIndex == selectedIndex) {
    return;
  }

  _requestedSelectedIndex = selectedIndex;
  [self scheduleReload:NO layout:NO selection:YES];
}

- (void)setDisabled:(BOOL)disabled
{
  if (_disabled == disabled) {
    return;
  }

  _disabled = disabled;
  self.userInteractionEnabled = !disabled;
  if (disabled) {
    self.accessibilityTraits |= UIAccessibilityTraitNotEnabled;
    ZKitStopDeceleratingScrollViews(self);
    [self stopSelectionTracking];
    // Keep the snap batched with selectedIndex/items because React Native does
    // not guarantee prop setter order within the same commit.
    [self scheduleReload:NO layout:NO selection:YES];
  } else {
    self.accessibilityTraits &= ~UIAccessibilityTraitNotEnabled;
  }
}

- (void)setColor:(UIColor *)color
{
  UIColor *nextColor = color ?: [UIColor blackColor];
  if (_color == nextColor || [_color isEqual:nextColor]) {
    return;
  }

  _color = nextColor;
  [self scheduleColorUpdate];
}

- (void)setItemColor:(UIColor *)itemColor
{
  UIColor *nextColor = itemColor ?: [UIColor grayColor];
  if (_itemColor == nextColor || [_itemColor isEqual:nextColor]) {
    return;
  }

  _itemColor = nextColor;
  [self scheduleColorUpdate];
}

- (void)setDisabledColor:(UIColor *)disabledColor
{
  UIColor *nextColor = disabledColor ?: [UIColor lightGrayColor];
  if (_disabledColor == nextColor || [_disabledColor isEqual:nextColor]) {
    return;
  }

  _disabledColor = nextColor;
  [self scheduleColorUpdate];
}

- (void)setFont:(UIFont *)font
{
  UIFont *nextFont = font ?: [UIFont systemFontOfSize:21 weight:UIFontWeightRegular];
  if (_font == nextFont || [_font isEqual:nextFont]) {
    return;
  }

  _font = nextFont;
  [self scheduleReload:YES layout:YES selection:NO];
}

- (void)setRowHeight:(CGFloat)rowHeight
{
  if (_rowHeight == rowHeight) {
    return;
  }

  _rowHeight = rowHeight;
  [self scheduleReload:YES layout:YES selection:NO];
}

- (void)setNumberOfLines:(NSInteger)numberOfLines
{
  NSInteger nextNumberOfLines = MAX(1, numberOfLines);
  if (_numberOfLines == nextNumberOfLines) {
    return;
  }

  _numberOfLines = nextNumberOfLines;
  [self scheduleReload:YES layout:YES selection:NO];
}

- (void)scheduleReload:(BOOL)reload layout:(BOOL)layout selection:(BOOL)selection
{
  _needsReload = _needsReload || reload;
  _needsLayoutUpdate = _needsLayoutUpdate || layout;
  _needsSelectionUpdate = _needsSelectionUpdate || selection;

  if (_updateScheduled) {
    return;
  }

  _updateScheduled = YES;
  __weak ZKitWheelPicker *weakSelf = self;
  dispatch_async(dispatch_get_main_queue(), ^{
    [weakSelf applyScheduledUpdates];
  });
}

- (void)scheduleColorUpdate
{
  _needsColorUpdate = YES;
  [self scheduleReload:NO layout:NO selection:NO];
}

- (void)applyScheduledUpdates
{
  if (!_updateScheduled && !_needsReload && !_needsLayoutUpdate && !_needsSelectionUpdate && !_needsColorUpdate) {
    return;
  }

  BOOL shouldReload = _needsReload;
  BOOL shouldLayout = _needsLayoutUpdate;
  BOOL shouldUpdateSelection = _needsSelectionUpdate || shouldReload;
  BOOL shouldUpdateColors = _needsColorUpdate;

  _updateScheduled = NO;
  _needsReload = NO;
  _needsLayoutUpdate = NO;
  _needsSelectionUpdate = NO;
  _needsColorUpdate = NO;

  NSInteger targetIndex = NSNotFound;
  if (_items.count > 0) {
    targetIndex = _requestedSelectedIndex == NSNotFound ? 0 : _requestedSelectedIndex;
    targetIndex = MAX(0, MIN(targetIndex, (NSInteger)_items.count - 1));
  }

  if (shouldReload) {
    [_visibleRowViews removeAllObjects];
    [self reloadAllComponents];
  }
  if (shouldLayout) {
    [self setNeedsLayout];
  }

  if (shouldUpdateColors) {
    [self refreshVisibleRowAppearances];
  }

  if (!shouldUpdateSelection) {
    return;
  }

  if (_items.count == 0) {
    _selectedIndex = NSNotFound;
    _hasAppliedSelection = NO;
    return;
  }

  _selectedIndex = targetIndex;

  NSInteger currentIndex = [self selectedRowInComponent:0];
  BOOL animated = !_disabled && _hasAppliedSelection && !shouldReload;
  if (currentIndex != targetIndex) {
    // Reloads invalidate the picker rows, so applying a selection in the same
    // batch must be immediate. Subsequent selection-only updates retain the
    // existing animated behavior.
    [self selectRow:targetIndex
        inComponent:0
           animated:animated];
  }

  if (animated && currentIndex != targetIndex) {
    [self startSelectionTrackingForDuration:0.5];
  } else {
    [self layoutIfNeeded];
    [self refreshSelectionMasks];
  }
  _hasAppliedSelection = YES;
}

- (void)syncCurrentSelection:(NSInteger)requestId
{
  // A close command can arrive in the same main-loop turn as the final React
  // prop commit. Flush that pending batch before reading the native selection.
  [self applyScheduledUpdates];

  if (_items.count == 0) {
    return;
  }

  BOOL shouldSnap = ZKitStopDeceleratingScrollViews(self);
  [self layoutIfNeeded];

  if (!shouldSnap) {
    [self finishSyncCurrentSelection:NO requestId:requestId];
    return;
  }

  // UIPickerView updates its selected row after an interrupted deceleration on
  // the next main-loop turn. Preserve that behavior only for the moving case;
  // an already settled picker can report its value synchronously on close.
  dispatch_async(dispatch_get_main_queue(), ^{
    [self finishSyncCurrentSelection:YES requestId:requestId];
  });
}

- (void)scrollToIndex:(NSInteger)index animated:(BOOL)animated
{
  // Commands and prop updates share the main UI queue. Flush a pending prop
  // batch first so this command clamps against the newest item collection.
  [self applyScheduledUpdates];

  _requestedSelectedIndex = index;
  if (_items.count == 0) {
    _selectedIndex = NSNotFound;
    _hasAppliedSelection = NO;
    return;
  }

  NSInteger targetIndex = MAX(0, MIN(index, (NSInteger)_items.count - 1));
  _selectedIndex = targetIndex;
  BOOL shouldAnimate = animated && !_disabled;
  [self selectRow:targetIndex inComponent:0 animated:shouldAnimate];
  if (shouldAnimate) {
    [self startSelectionTrackingForDuration:0.5];
  } else {
    [self stopSelectionTracking];
    [self layoutIfNeeded];
    [self refreshSelectionMasks];
  }
  _hasAppliedSelection = YES;
}

- (void)finishSyncCurrentSelection:(BOOL)shouldSnap requestId:(NSInteger)requestId
{
  if (_items.count == 0) {
    return;
  }

  NSInteger row = [self selectedRowInComponent:0];
  if (row < 0) {
    row = _selectedIndex != NSNotFound ? _selectedIndex : 0;
  }

  row = MAX(0, MIN(row, (NSInteger)_items.count - 1));
  if (shouldSnap) {
    [self selectRow:row inComponent:0 animated:NO];
  }
  [self stopSelectionTracking];
  [self commitSelectionAtRow:row syncRequestId:@(requestId)];
}

- (void)restoreRequestedSelection
{
  if (_items.count == 0) {
    return;
  }

  NSInteger targetIndex = _requestedSelectedIndex == NSNotFound ? 0 : _requestedSelectedIndex;
  targetIndex = MAX(0, MIN(targetIndex, (NSInteger)_items.count - 1));
  [self stopSelectionTracking];
  [self selectRow:targetIndex inComponent:0 animated:NO];
  _selectedIndex = targetIndex;
  [self layoutIfNeeded];
  [self refreshSelectionMasks];
}

- (void)commitSelectionAtRow:(NSInteger)row syncRequestId:(NSNumber *)syncRequestId
{
  if (row < 0 || row >= (NSInteger)_items.count) {
    return;
  }

  _selectedIndex = row;
  _requestedSelectedIndex = row;
  [self refreshSelectionMasks];

  if (_onChange) {
    NSMutableDictionary *event = [@{
      @"newIndex": @(row),
      @"newValue": RCTNullIfNil(_items[row][@"value"]),
    } mutableCopy];
    if (syncRequestId != nil) {
      event[@"syncRequestId"] = syncRequestId;
    }
    _onChange(event);
  }
}

- (void)configureAppearanceForRowView:(ZKitWheelPickerRowView *)rowView
{
  NSInteger row = rowView.row;
  NSDictionary *item = row >= 0 && row < (NSInteger)_items.count ? _items[row] : nil;
  BOOL disabled = [item[@"disabled"] boolValue];
  UIColor *customDisabledColor = disabled ? [RCTConvert UIColor:item[@"textColor"]] : nil;
  UIColor *normalColor = disabled
      ? (customDisabledColor ?: _disabledColor ?: _itemColor ?: _color)
      : (_itemColor ?: _color);

  rowView.itemDisabled = disabled;
  rowView.label.textColor = normalColor;
  rowView.selectedLabel.textColor = disabled ? normalColor : (_color ?: _itemColor);
  if (disabled) {
    rowView.selectionContainer.hidden = YES;
  }
}

- (void)refreshVisibleRowAppearances
{
  for (ZKitWheelPickerRowView *rowView in _visibleRowViews.objectEnumerator) {
    if (rowView.superview != nil) {
      [self configureAppearanceForRowView:rowView];
    }
  }
  [self refreshSelectionMasks];
}

- (void)refreshSelectionMasks
{
  if (_items.count == 0 || self.bounds.size.height <= 0) {
    return;
  }

  CGFloat bandHeight = [self pickerView:self rowHeightForComponent:0];
  CGRect selectionBand = CGRectMake(
      CGRectGetMinX(self.bounds),
      CGRectGetMidY(self.bounds) - (bandHeight / 2.0),
      CGRectGetWidth(self.bounds),
      bandHeight);

  [UIView performWithoutAnimation:^{
    for (ZKitWheelPickerRowView *rowView in self->_visibleRowViews.objectEnumerator) {
      [self updateSelectionMaskForRowView:rowView selectionBand:selectionBand];
    }
  }];
}

- (void)updateSelectionMaskForRowView:(ZKitWheelPickerRowView *)rowView
                        selectionBand:(CGRect)selectionBand
{
  if (rowView.superview == nil || rowView.hidden || rowView.alpha <= 0 ||
      rowView.isItemDisabled || rowView.row < 0 || rowView.row >= (NSInteger)_items.count) {
    rowView.selectionContainer.hidden = YES;
    return;
  }

  CGRect rowRect = [rowView convertRect:rowView.bounds toView:self];
  CGRect visibleSelection = CGRectIntersection(rowRect, selectionBand);
  if (CGRectIsNull(visibleSelection) || CGRectIsEmpty(visibleSelection)) {
    rowView.selectionContainer.hidden = YES;
    return;
  }

  CGRect localSelection = [rowView convertRect:visibleSelection fromView:self];
  localSelection = CGRectIntersection(rowView.bounds, localSelection);
  if (CGRectIsNull(localSelection) || CGRectIsEmpty(localSelection)) {
    rowView.selectionContainer.hidden = YES;
    return;
  }

  rowView.selectionContainer.hidden = NO;
  if (!CGRectEqualToRect(rowView.selectionContainer.frame, localSelection)) {
    rowView.selectionContainer.frame = localSelection;
  }
  CGRect selectedLabelFrame = CGRectOffset(rowView.bounds, -localSelection.origin.x, -localSelection.origin.y);
  if (!CGRectEqualToRect(rowView.selectedLabel.frame, selectedLabelFrame)) {
    rowView.selectedLabel.frame = selectedLabelFrame;
  }
}

- (void)registerPanGesturesInView:(UIView *)view
{
  for (UIView *subview in view.subviews) {
    if ([subview isKindOfClass:[UIScrollView class]]) {
      UIPanGestureRecognizer *gesture = ((UIScrollView *)subview).panGestureRecognizer;
      if (gesture != nil && ![_trackedPanGestures containsObject:gesture]) {
        [_trackedPanGestures addObject:gesture];
        [gesture addTarget:self action:@selector(handlePickerPan:)];
      }
    }
    [self registerPanGesturesInView:subview];
  }
}

- (void)handlePickerPan:(UIPanGestureRecognizer *)gesture
{
  switch (gesture.state) {
    case UIGestureRecognizerStateBegan:
    case UIGestureRecognizerStateChanged:
      [self startSelectionTrackingForDuration:0.12];
      [self refreshSelectionMasks];
      break;
    case UIGestureRecognizerStateEnded:
    case UIGestureRecognizerStateCancelled:
    case UIGestureRecognizerStateFailed:
      // UIKit sets its deceleration flag just after the pan ends. Keep a short
      // floor so tracking cannot stop in that transition frame.
      [self startSelectionTrackingForDuration:0.5];
      break;
    default:
      break;
  }
}

- (void)startSelectionTrackingForDuration:(CFTimeInterval)duration
{
  _minimumTrackingUntil = MAX(_minimumTrackingUntil, CACurrentMediaTime() + duration);
  if (_selectionDisplayLink != nil || self.window == nil) {
    return;
  }

  _selectionDisplayLink = [CADisplayLink displayLinkWithTarget:self selector:@selector(trackVisualSelection:)];
  [_selectionDisplayLink addToRunLoop:NSRunLoop.mainRunLoop forMode:NSRunLoopCommonModes];
}

- (void)trackVisualSelection:(CADisplayLink *)displayLink
{
  [self refreshSelectionMasks];
  if (displayLink.timestamp >= _minimumTrackingUntil && !ZKitHasMovingScrollViews(self)) {
    [self stopSelectionTracking];
  }
}

- (void)stopSelectionTracking
{
  [_selectionDisplayLink invalidate];
  _selectionDisplayLink = nil;
  _minimumTrackingUntil = 0;
}

- (NSInteger)numberOfComponentsInPickerView:(__unused UIPickerView *)pickerView
{
  return 1;
}

- (NSInteger)pickerView:(__unused UIPickerView *)pickerView numberOfRowsInComponent:(__unused NSInteger)component
{
  return _items.count;
}

- (NSString *)pickerView:(__unused UIPickerView *)pickerView
             titleForRow:(NSInteger)row
            forComponent:(__unused NSInteger)component
{
  if (row < 0 || row >= (NSInteger)_items.count) {
    return @"";
  }

  return [RCTConvert NSString:_items[row][@"label"]] ?: @"";
}

- (CGFloat)pickerView:(__unused UIPickerView *)pickerView rowHeightForComponent:(__unused NSInteger)component
{
  if (_rowHeight > 0) {
    return _rowHeight;
  }

  return (_font.lineHeight * MAX(1, _numberOfLines)) + 20.0;
}

- (UIView *)pickerView:(UIPickerView *)pickerView
            viewForRow:(NSInteger)row
          forComponent:(NSInteger)component
           reusingView:(UIView *)view
{
  CGSize rowSize = [pickerView rowSizeForComponent:component];
  CGFloat rowHeight = rowSize.height;
  CGFloat rowWidth = rowSize.width;

  NSDictionary *item = nil;
  if (row >= 0 && row < (NSInteger)_items.count) {
    item = _items[row];
  }

  ZKitWheelPickerRowView *rowView = [view isKindOfClass:[ZKitWheelPickerRowView class]]
      ? (ZKitWheelPickerRowView *)view
      : nil;
  if (!rowView) {
    rowView = [[ZKitWheelPickerRowView alloc] initWithFrame:CGRectZero];
    ZKitWheelPickerLabel *label = [[ZKitWheelPickerLabel alloc] initWithFrame:CGRectZero];
    UIView *selectionContainer = [[UIView alloc] initWithFrame:CGRectZero];
    ZKitWheelPickerLabel *selectedLabel = [[ZKitWheelPickerLabel alloc] initWithFrame:CGRectZero];
    selectionContainer.clipsToBounds = YES;
    selectionContainer.userInteractionEnabled = NO;
    selectionContainer.isAccessibilityElement = NO;
    selectionContainer.hidden = YES;
    selectedLabel.userInteractionEnabled = NO;
    selectedLabel.isAccessibilityElement = NO;
    [selectionContainer addSubview:selectedLabel];
    rowView.label = label;
    rowView.selectionContainer = selectionContainer;
    rowView.selectedLabel = selectedLabel;
    rowView.row = NSNotFound;
    [rowView addSubview:label];
    [rowView addSubview:selectionContainer];
  }

  if (rowView.row != NSNotFound && rowView.row != row) {
    [_visibleRowViews removeObjectForKey:@(rowView.row)];
  }
  rowView.row = row;
  [_visibleRowViews setObject:rowView forKey:@(row)];
  rowView.frame = CGRectMake(0, 0, rowWidth, rowHeight);
  rowView.selectionContainer.hidden = YES;

  NSString *title = [self pickerView:pickerView titleForRow:row forComponent:component];
  for (ZKitWheelPickerLabel *label in @[rowView.label, rowView.selectedLabel]) {
    label.frame = CGRectMake(0, 0, rowWidth, rowHeight);
    label.font = _font;
    label.textAlignment = NSTextAlignmentCenter;
    label.text = title;
    label.numberOfLines = MAX(1, _numberOfLines);
    label.lineBreakMode = NSLineBreakByTruncatingTail;
    label.adjustsFontSizeToFitWidth = NO;
    label.leftInset = 20.0;
    label.rightInset = 20.0;
  }
  rowView.label.accessibilityIdentifier = item[@"testID"];
  rowView.selectedLabel.accessibilityIdentifier = nil;
  [self configureAppearanceForRowView:rowView];

  return rowView;
}

- (void)pickerView:(__unused UIPickerView *)pickerView
      didSelectRow:(NSInteger)row
       inComponent:(__unused NSInteger)component
{
  if (_disabled) {
    [self restoreRequestedSelection];
    return;
  }

  [self commitSelectionAtRow:row syncRequestId:nil];
}

- (NSString *)pickerView:(UIPickerView *)pickerView accessibilityLabelForComponent:(NSInteger)component
{
  return self.accessibilityLabel;
}

- (NSString *)pickerView:(UIPickerView *)pickerView accessibilityHintForComponent:(NSInteger)component
{
  return self.accessibilityHint;
}

@end
