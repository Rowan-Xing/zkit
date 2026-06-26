#import "ZKitWheelPickerLabel.h"

@implementation ZKitWheelPickerLabel

- (instancetype)initWithFrame:(CGRect)frame
{
  self = [super initWithFrame:frame];
  if (self) {
    self.topInset = 0.0;
    self.bottomInset = 0.0;
    self.leftInset = 0.0;
    self.rightInset = 0.0;
  }
  return self;
}

- (void)drawTextInRect:(CGRect)rect
{
  UIEdgeInsets insets = UIEdgeInsetsMake(self.topInset, self.leftInset, self.bottomInset, self.rightInset);
  [super drawTextInRect:UIEdgeInsetsInsetRect(rect, insets)];
}

- (CGSize)intrinsicContentSize
{
  CGSize intrinsicSize = [super intrinsicContentSize];
  intrinsicSize.height += self.topInset + self.bottomInset;
  intrinsicSize.width += self.leftInset + self.rightInset;
  return intrinsicSize;
}

@end
