# SliderCaptcha

滑动拼图验证码弹层组件，负责通用的 UI、拖拽映射、校验反馈和失败后自动刷新。

## 设计边界

- `y2kit-ui` 负责：
  - 弹层展示
  - 图片缩放与坐标换算
  - 滑块拖拽与释放触发校验
  - `loading / verifying / success / error` 状态反馈
  - 校验失败后的自动重载
- 业务方负责：
  - 拉取验证码题目
  - 调用业务接口做验证
  - 成功后的页面跳转、倒计时、埋点等副作用

## 最小示例

```tsx
import * as React from 'react';
import { SliderCaptcha, type SliderCaptchaChallenge } from 'y2kit-ui';

type LoginCaptchaChallenge = SliderCaptchaChallenge & {
  nonceStr: string;
};

function Example() {
  const [visible, setVisible] = React.useState(false);

  return (
    <SliderCaptcha<LoginCaptchaChallenge>
      visible={visible}
      onClose={() => setVisible(false)}
      loadChallenge={async () => {
        const res = await fetchCaptcha();
        return {
          nonceStr: res.nonceStr,
          backgroundImage: res.canvasSrc,
          blockImage: res.blockSrc,
          blockY: res.blockY,
          originalWidth: 320,
          originalHeight: 220,
          blockWidth: 50,
          blockHeight: 50,
        };
      }}
      verifyChallenge={async ({ challenge, offsetX }) => {
        const res = await verifyCaptcha({
          nonceStr: challenge.nonceStr,
          blockX: offsetX,
        });
        return res.ok;
      }}
      onVerified={() => {
        setVisible(false);
      }}
    />
  );
}
```
