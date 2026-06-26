#import "ZKitWheelPicker.h"

#import <React/RCTConvert.h>
#import <React/RCTUtils.h>

#import "ZKitWheelPickerLabel.h"

@interface ZKitWheelPicker() <UIPickerViewDataSource, UIPickerViewDelegate, UIPickerViewAccessibilityDelegate>
@end

@implementation ZKitWheelPicker

static void ZKitStopDeceleratingScrollViews(UIView *view)
{
  for (UIView *subview in view.subviews) {
    if ([subview isKindOfClass:[UIScrollView class]]) {
      UIScrollView *scrollView = (UIScrollView *)subview;
      [scrollView setContentOffset:scrollView.contentOffset animated:NO];
      [scrollView.layer removeAllAnimations];
    }

    ZKitStopDeceleratingScrollViews(subview);
  }
}

- (instancetype)initWithFrame:(CGRect)frame
{
  self = [super initWithFrame:frame];
  if (!self) {
    return nil;
  }

  _items = @[];
  _selectedIndex = NSNotFound;
  _color = [UIColor blackColor];
  _font = [UIFont systemFontOfSize:21 weight:UIFontWeightRegular];
  _rowHeight = 0;
  _numberOfLines = 1;

  self.delegate = self;
  self.dataSource = self;

  // 保持系统中间选中指示线稳定显示。
  [self selectRow:0 inComponent:0 animated:YES];

  return self;
}

RCT_NOT_IMPLEMENTED(- (instancetype)initWithCoder:(NSCoder *)coder)

- (void)setItems:(NSArray<NSDictionary *> *)items
{
  _items = [items copy] ?: @[];
  [self reloadAllComponents];
  [self setNeedsLayout];

  if (_items.count == 0) {
    return;
  }

  NSInteger targetIndex = _selectedIndex == NSNotFound ? 0 : _selectedIndex;
  targetIndex = MAX(0, MIN(targetIndex, (NSInteger)_items.count - 1));
  _selectedIndex = targetIndex;

  dispatch_async(dispatch_get_main_queue(), ^{
    [self selectRow:targetIndex inComponent:0 animated:NO];
  });
}

- (void)setSelectedIndex:(NSInteger)selectedIndex
{
  if (_selectedIndex == selectedIndex) {
    return;
  }

  NSInteger previousIndex = _selectedIndex;
  _selectedIndex = selectedIndex;

  if (_items.count == 0) {
    return;
  }

  NSInteger targetIndex = MAX(0, MIN(selectedIndex, (NSInteger)_items.count - 1));
  BOOL animated = previousIndex != NSNotFound;

  dispatch_async(dispatch_get_main_queue(), ^{
    [self selectRow:targetIndex inComponent:0 animated:animated];
  });
}

- (void)setColor:(UIColor *)color
{
  _color = color ?: [UIColor blackColor];
  [self reloadAllComponents];
  [self setNeedsLayout];
}

- (void)setFont:(UIFont *)font
{
  _font = font ?: [UIFont systemFontOfSize:21 weight:UIFontWeightRegular];
  [self reloadAllComponents];
  [self setNeedsLayout];
}

- (void)setRowHeight:(CGFloat)rowHeight
{
  if (_rowHeight == rowHeight) {
    return;
  }

  _rowHeight = rowHeight;
  [self reloadAllComponents];
  [self setNeedsLayout];
}

- (void)setNumberOfLines:(NSInteger)numberOfLines
{
  _numberOfLines = MAX(1, numberOfLines);
  [self reloadAllComponents];
  [self setNeedsLayout];
}

- (void)syncCurrentSelection
{
  if (_items.count == 0) {
    return;
  }

  ZKitStopDeceleratingScrollViews(self);
  [self layoutIfNeeded];

  dispatch_async(dispatch_get_main_queue(), ^{
    NSInteger row = [self selectedRowInComponent:0];
    if (row < 0) {
      row = self->_selectedIndex != NSNotFound ? self->_selectedIndex : 0;
    }

    row = MAX(0, MIN(row, (NSInteger)self->_items.count - 1));
    [self selectRow:row inComponent:0 animated:NO];
    [self pickerView:self didSelectRow:row inComponent:0];
  });
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
  CGFloat rowHeight = [pickerView rowSizeForComponent:component].height;
  CGFloat rowWidth = [pickerView rowSizeForComponent:component].width;

  if (!view) {
    view = [[UIView alloc] initWithFrame:CGRectZero];
    ZKitWheelPickerLabel *label = [[ZKitWheelPickerLabel alloc] initWithFrame:CGRectZero];
    [view insertSubview:label atIndex:0];
  }

  view.frame = CGRectMake(0, 0, rowWidth, rowHeight);

  ZKitWheelPickerLabel *label = (ZKitWheelPickerLabel *)view.subviews.firstObject;
  label.frame = CGRectMake(0, 0, rowWidth, rowHeight);
  label.font = _font;
  label.textColor = [RCTConvert UIColor:_items[row][@"textColor"]] ?: _color;
  label.textAlignment = NSTextAlignmentCenter;
  label.text = [self pickerView:pickerView titleForRow:row forComponent:component];
  label.accessibilityIdentifier = _items[row][@"testID"];
  label.numberOfLines = MAX(1, _numberOfLines);
  label.lineBreakMode = NSLineBreakByTruncatingTail;
  label.adjustsFontSizeToFitWidth = NO;
  label.leftInset = 20.0;
  label.rightInset = 20.0;

  return view;
}

- (void)pickerView:(__unused UIPickerView *)pickerView
      didSelectRow:(NSInteger)row
       inComponent:(__unused NSInteger)component
{
  _selectedIndex = row;

  if (_onChange && row >= 0 && row < (NSInteger)_items.count) {
    _onChange(@{
      @"newIndex": @(row),
      @"newValue": RCTNullIfNil(_items[row][@"value"]),
    });
  }
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
