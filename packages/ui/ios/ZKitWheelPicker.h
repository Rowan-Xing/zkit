#import <UIKit/UIKit.h>

#import <React/RCTComponent.h>

@interface ZKitWheelPicker : UIPickerView <UIPickerViewDataSource, UIPickerViewDelegate, UIPickerViewAccessibilityDelegate>

@property (nonatomic, copy) NSArray<NSDictionary *> *items;
@property (nonatomic, assign) NSInteger selectedIndex;
@property (nonatomic, assign, getter=isDisabled) BOOL disabled;
@property (nonatomic, strong) UIColor *color;
@property (nonatomic, strong) UIColor *itemColor;
@property (nonatomic, strong) UIColor *disabledColor;
@property (nonatomic, strong) UIFont *font;
@property (nonatomic, assign) CGFloat rowHeight;
@property (nonatomic, assign) NSInteger numberOfLines;

@property (nonatomic, copy) RCTBubblingEventBlock onChange;

- (void)syncCurrentSelection:(NSInteger)requestId;
- (void)scrollToIndex:(NSInteger)index animated:(BOOL)animated;

@end
