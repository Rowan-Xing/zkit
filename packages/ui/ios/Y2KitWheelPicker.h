#import <UIKit/UIKit.h>

#import <React/RCTComponent.h>

@interface Y2KitWheelPicker : UIPickerView <UIPickerViewDataSource, UIPickerViewDelegate, UIPickerViewAccessibilityDelegate>

@property (nonatomic, copy) NSArray<NSDictionary *> *items;
@property (nonatomic, assign) NSInteger selectedIndex;
@property (nonatomic, strong) UIColor *color;
@property (nonatomic, strong) UIFont *font;
@property (nonatomic, assign) CGFloat rowHeight;
@property (nonatomic, assign) NSInteger numberOfLines;

@property (nonatomic, copy) RCTBubblingEventBlock onChange;

- (void)syncCurrentSelection;

@end
