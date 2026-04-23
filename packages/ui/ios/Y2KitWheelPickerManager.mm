#import "Y2KitWheelPickerManager.h"

#import <React/RCTBridge.h>
#import <React/RCTFont.h>
#import <React/RCTUIManager.h>

#import "Y2KitWheelPicker.h"

@implementation Y2KitWheelPickerManager

RCT_EXPORT_MODULE(Y2KitWheelPicker)

- (UIView *)view
{
  return [Y2KitWheelPicker new];
}

RCT_EXPORT_VIEW_PROPERTY(items, NSArray<NSDictionary *>)
RCT_EXPORT_VIEW_PROPERTY(selectedIndex, NSInteger)
RCT_EXPORT_VIEW_PROPERTY(onChange, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(color, UIColor)
RCT_EXPORT_VIEW_PROPERTY(numberOfLines, NSInteger)
RCT_EXPORT_VIEW_PROPERTY(rowHeight, CGFloat)
RCT_CUSTOM_VIEW_PROPERTY(fontSize, NSNumber, Y2KitWheelPicker)
{
  view.font = [RCTFont updateFont:view.font withSize:json ?: @(defaultView.font.pointSize)];
}
RCT_CUSTOM_VIEW_PROPERTY(fontWeight, NSString, Y2KitWheelPicker)
{
  view.font = [RCTFont updateFont:view.font withWeight:json];
}
RCT_CUSTOM_VIEW_PROPERTY(fontStyle, NSString, Y2KitWheelPicker)
{
  view.font = [RCTFont updateFont:view.font withStyle:json];
}
RCT_CUSTOM_VIEW_PROPERTY(fontFamily, NSString, Y2KitWheelPicker)
{
  view.font = [RCTFont updateFont:view.font withFamily:json ?: defaultView.font.familyName];
}

RCT_EXPORT_METHOD(syncCurrentSelection:(nonnull NSNumber *)reactTag)
{
  [self.bridge.uiManager addUIBlock:^(__unused RCTUIManager *uiManager, NSDictionary<NSNumber *, UIView *> *viewRegistry) {
    UIView *view = viewRegistry[reactTag];
    if (![view isKindOfClass:[Y2KitWheelPicker class]]) {
      return;
    }

    [(Y2KitWheelPicker *)view syncCurrentSelection];
  }];
}

@end
