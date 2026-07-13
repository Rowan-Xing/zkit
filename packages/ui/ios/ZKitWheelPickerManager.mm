#import "ZKitWheelPickerManager.h"

#import <React/RCTBridge.h>
#import <React/RCTFont.h>
#import <React/RCTUIManager.h>

#import "ZKitWheelPicker.h"

@implementation ZKitWheelPickerManager

RCT_EXPORT_MODULE(ZKitWheelPicker)

- (UIView *)view
{
  return [ZKitWheelPicker new];
}

RCT_EXPORT_VIEW_PROPERTY(items, NSArray<NSDictionary *>)
RCT_EXPORT_VIEW_PROPERTY(selectedIndex, NSInteger)
RCT_EXPORT_VIEW_PROPERTY(disabled, BOOL)
RCT_EXPORT_VIEW_PROPERTY(onChange, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(color, UIColor)
RCT_EXPORT_VIEW_PROPERTY(itemColor, UIColor)
RCT_EXPORT_VIEW_PROPERTY(disabledColor, UIColor)
RCT_EXPORT_VIEW_PROPERTY(numberOfLines, NSInteger)
RCT_EXPORT_VIEW_PROPERTY(rowHeight, CGFloat)
RCT_CUSTOM_VIEW_PROPERTY(fontSize, NSNumber, ZKitWheelPicker)
{
  view.font = [RCTFont updateFont:view.font withSize:json ?: @(defaultView.font.pointSize)];
}
RCT_CUSTOM_VIEW_PROPERTY(fontWeight, NSString, ZKitWheelPicker)
{
  view.font = [RCTFont updateFont:view.font withWeight:json];
}
RCT_CUSTOM_VIEW_PROPERTY(fontStyle, NSString, ZKitWheelPicker)
{
  view.font = [RCTFont updateFont:view.font withStyle:json];
}
RCT_CUSTOM_VIEW_PROPERTY(fontFamily, NSString, ZKitWheelPicker)
{
  view.font = [RCTFont updateFont:view.font withFamily:json ?: defaultView.font.familyName];
}

RCT_EXPORT_METHOD(syncCurrentSelection:(nonnull NSNumber *)reactTag
                  requestId:(NSInteger)requestId)
{
  [self.bridge.uiManager addUIBlock:^(__unused RCTUIManager *uiManager, NSDictionary<NSNumber *, UIView *> *viewRegistry) {
    UIView *view = viewRegistry[reactTag];
    if (![view isKindOfClass:[ZKitWheelPicker class]]) {
      return;
    }

    [(ZKitWheelPicker *)view syncCurrentSelection:requestId];
  }];
}

RCT_EXPORT_METHOD(scrollToIndex:(nonnull NSNumber *)reactTag
                  index:(NSInteger)index
                  animated:(BOOL)animated)
{
  [self.bridge.uiManager addUIBlock:^(__unused RCTUIManager *uiManager, NSDictionary<NSNumber *, UIView *> *viewRegistry) {
    UIView *view = viewRegistry[reactTag];
    if (![view isKindOfClass:[ZKitWheelPicker class]]) {
      return;
    }

    [(ZKitWheelPicker *)view scrollToIndex:index animated:animated];
  }];
}

@end
