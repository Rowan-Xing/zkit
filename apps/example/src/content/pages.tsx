import { Feather } from '@expo/vector-icons';
import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Accordion,
  AccordionContent,
  AccordionIndicator,
  AccordionItem,
  AccordionTrigger,
  AddressCascader,
  BetweenTime,
  Button,
  Checkbox,
  CheckboxGroup,
  DatePicker,
  LoadingSpinner,
  Picker,
  Radio,
  RadioGroup,
  SliderCaptcha,
  Switch,
  Text,
  TextInput,
  cardToast,
  useTheme,
  type PageDefinition,
  type PickerModelValue,
  type SliderCaptchaChallenge,
} from 'y2kit-ui';
import type { ComponentId } from '../types';

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function icon(name: string, color: string, size = 16) {
  return <Feather name={name as never} color={color} size={size} />;
}

const workflowList = [
  {
    id: 'design',
    title: '设计',
    children: [
      { id: 'token', title: 'Tokens' },
      { id: 'review', title: '评审' },
    ],
  },
  {
    id: 'delivery',
    title: '交付',
    children: [
      { id: 'qa', title: '测试' },
      { id: 'release', title: '发版' },
    ],
  },
];

const customAddressList = [
  {
    value: 'cn',
    text: '中国',
    children: [
      {
        value: 'sh',
        text: '上海',
        children: [{ value: 'pd', text: '浦东新区' }],
      },
    ],
  },
  {
    value: 'jp',
    text: '日本',
    children: [
      {
        value: 'tokyo',
        text: '东京',
        children: [{ value: 'shinjuku', text: '新宿区' }],
      },
    ],
  },
];

const captchaChallenge: SliderCaptchaChallenge = {
  backgroundImage:
    'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=640&q=80',
  blockImage:
    'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=140&q=80',
  blockY: 92,
  originalWidth: 640,
  originalHeight: 360,
  blockWidth: 72,
  blockHeight: 72,
};

function demoBox(active: boolean, border: string, background: string) {
  return {
    backgroundColor: background,
    borderColor: border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    opacity: active ? 1 : 0.88,
  } as const;
}

function ButtonVariantsDemo() {
  const theme = useTheme();

  return (
    <View style={demoStyles.stack}>
      <View style={demoStyles.wrap}>
        <Button>主按钮</Button>
        <Button variant="soft" tone="info">
          信息
        </Button>
        <Button variant="outline" tone="danger">
          危险操作
        </Button>
        <Button variant="ghost" tone="neutral">
          次级操作
        </Button>
      </View>
      <Text style={[demoStyles.caption, { color: theme.colors.muted }]}>
        同一页面里可以直接用 variant + tone 组织视觉层级。
      </Text>
    </View>
  );
}

function ButtonStateDemo() {
  const [busy, setBusy] = React.useState(false);
  const theme = useTheme();

  return (
    <View style={demoStyles.stack}>
      <View style={demoStyles.wrap}>
        <Button icon={icon('plus', '#FFFFFF')} onPress={() => cardToast.showSuccess('创建成功', 1000)}>
          新建
        </Button>
        <Button
          loading={busy}
          variant="soft"
          tone="success"
          onPress={async () => {
            setBusy(true);
            await wait(800);
            setBusy(false);
          }}
        >
          异步提交
        </Button>
        <Button
          iconOnly
          shape="pill"
          accessibilityLabel="刷新"
          icon={icon('refresh-cw', '#FFFFFF', 18)}
          onPress={() => cardToast.showInfo('已刷新', 1000)}
        />
      </View>
      <Text style={[demoStyles.caption, { color: theme.colors.muted }]}>图标、loading 和 iconOnly 都能组合使用。</Text>
    </View>
  );
}

function ButtonSizeDemo() {
  return (
    <View style={demoStyles.stack}>
      <View style={demoStyles.wrap}>
        <Button sizePreset="sm">小号</Button>
        <Button sizePreset="md">中号</Button>
        <Button sizePreset="lg">大号</Button>
      </View>
      <Button block variant="outline" tone="neutral">
        全宽确认动作
      </Button>
    </View>
  );
}

function TextRampDemo() {
  const theme = useTheme();
  const rows = [
    { label: 'Display 30', size: 30, weight: '800' as const },
    { label: 'Heading 24', size: 24, weight: '700' as const },
    { label: 'Body 16', size: 16, weight: '500' as const },
    { label: 'Caption 13', size: 13, weight: '500' as const },
  ];

  return (
    <View style={demoStyles.stack}>
      {rows.map((item) => (
        <Text
          key={item.label}
          style={{
            color: theme.colors.onSurface,
            fontSize: item.size,
            fontWeight: item.weight,
            lineHeight: item.size + 8,
          }}
        >
          {item.label}
        </Text>
      ))}
    </View>
  );
}

function TextParagraphDemo() {
  const theme = useTheme();

  return (
    <View style={demoStyles.stack}>
      <Text style={{ color: theme.colors.onSurface, fontSize: 16, lineHeight: 24, fontWeight: '500' }}>
        Text 在这里主要承担统一字重语义。正文、说明和数字标签都能在同一套排版节奏下稳定呈现。
      </Text>
      <Text style={{ color: theme.colors.muted, fontSize: 13, lineHeight: 20 }}>
        跨平台时不用再手动处理 Android 旧版本字重落差。
      </Text>
    </View>
  );
}

function TextInputBasicDemo() {
  const theme = useTheme();
  const [name, setName] = React.useState('Y2Kit');
  const [email, setEmail] = React.useState('team@y2kit.dev');

  return (
    <View style={demoStyles.stack}>
      <View>
        <Text style={[demoStyles.fieldLabel, { color: theme.colors.muted }]}>项目名称</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="输入项目名"
          placeholderTextColor={theme.colors.muted}
          style={[demoStyles.input, { borderColor: theme.colors.border, color: theme.colors.onSurface }]}
        />
      </View>
      <View>
        <Text style={[demoStyles.fieldLabel, { color: theme.colors.muted }]}>联系邮箱</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="输入邮箱"
          placeholderTextColor={theme.colors.muted}
          keyboardType="email-address"
          style={[demoStyles.input, { borderColor: theme.colors.border, color: theme.colors.onSurface }]}
        />
      </View>
    </View>
  );
}

function TextInputAdvancedDemo() {
  const theme = useTheme();
  const [note, setNote] = React.useState('多行输入可以直接用于说明、备注或审核意见。');

  return (
    <View style={demoStyles.stack}>
      <TextInput
        value={note}
        onChangeText={setNote}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
        placeholder="补充说明"
        placeholderTextColor={theme.colors.muted}
        selectionColor={theme.colors.primary}
        style={[
          demoStyles.input,
          demoStyles.multilineInput,
          { borderColor: theme.colors.border, color: theme.colors.onSurface },
        ]}
      />
      <Text style={[demoStyles.caption, { color: theme.colors.muted }]}>selectionColor 和 cursorColor 会跟随主题主色。</Text>
    </View>
  );
}

function LoadingSpinnerScaleDemo() {
  const theme = useTheme();

  return (
    <View style={demoStyles.wrap}>
      {[16, 24, 34].map((size) => (
        <View key={size} style={demoStyles.centerStack}>
          <LoadingSpinner size={size} color={theme.colors.primary} />
          <Text style={[demoStyles.caption, { color: theme.colors.muted }]}>{size}px</Text>
        </View>
      ))}
    </View>
  );
}

function LoadingSpinnerInlineDemo() {
  const theme = useTheme();

  return (
    <View style={demoStyles.stack}>
      <View style={[demoStyles.inlineRow, demoBox(true, theme.colors.border, '#FFFFFF')]}>
        <LoadingSpinner size={18} color={theme.colors.primary} />
        <Text style={{ color: theme.colors.onSurface, fontSize: 14, fontWeight: '600' }}>正在同步组件目录</Text>
      </View>
      <Button loading variant="soft" tone="info">
        拉取远程配置
      </Button>
    </View>
  );
}

function SwitchScaleDemo() {
  const theme = useTheme();
  const [small, setSmall] = React.useState(true);
  const [normal, setNormal] = React.useState(false);
  const [large, setLarge] = React.useState(true);

  return (
    <View style={demoStyles.stack}>
      <View style={demoStyles.rowBetween}>
        <Text style={{ color: theme.colors.onSurface, fontSize: 15, fontWeight: '700' }}>small</Text>
        <Switch size="small" value={small} onValueChange={setSmall} label={['开', '关']} />
      </View>
      <View style={demoStyles.rowBetween}>
        <Text style={{ color: theme.colors.onSurface, fontSize: 15, fontWeight: '700' }}>normal</Text>
        <Switch value={normal} onValueChange={setNormal} label={['开', '关']} />
      </View>
      <View style={demoStyles.rowBetween}>
        <Text style={{ color: theme.colors.onSurface, fontSize: 15, fontWeight: '700' }}>large</Text>
        <Switch size="large" value={large} onValueChange={setLarge} label={['启用', '停用']} />
      </View>
    </View>
  );
}

function SwitchStateDemo() {
  const [loadingValue, setLoadingValue] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  return (
    <View style={demoStyles.stack}>
      <Switch color="#0E9F6E" bgColor="#D7F7E8" value={loadingValue} onValueChange={setLoadingValue} label={['在线', '离线']} />
      <Switch color="#765FF5" value defaultValue loading={busy} label={['处理中', '待机']} />
      <Button
        variant="outline"
        tone="neutral"
        onPress={async () => {
          setBusy(true);
          await wait(900);
          setBusy(false);
        }}
      >
        触发 loading 状态
      </Button>
    </View>
  );
}

function CheckboxSingleDemo() {
  const theme = useTheme();
  const [checked, setChecked] = React.useState<true | false>(true);

  return (
    <View style={demoStyles.stack}>
      <Checkbox value={checked} onValueChange={(next) => setChecked(next === true)} label="我已阅读并同意组件接入规范" />
      <Checkbox indeterminate label="部分模块已接入，等待补齐" />
      <Checkbox disabled label="禁用状态示例" />
      <Text style={[demoStyles.caption, { color: theme.colors.muted }]}>支持二态、半选态和禁用态。</Text>
    </View>
  );
}

function CheckboxGroupDemo() {
  const [values, setValues] = React.useState<string[]>(['button', 'picker']);

  return (
    <CheckboxGroup value={values} onValueChange={setValues} direction="column" style={demoStyles.stack}>
      <Checkbox itemValue="button" label="Button" />
      <Checkbox itemValue="picker" label="Picker" />
      <Checkbox itemValue="captcha" label="SliderCaptcha" />
    </CheckboxGroup>
  );
}

function CheckboxRenderDemo() {
  const theme = useTheme();
  const [checked, setChecked] = React.useState(false);

  return (
    <Checkbox value={checked} onValueChange={(next) => setChecked(next === true)} hiddenCheckbox>
      {({ checked: active, toggle }) => (
        <Pressable onPress={toggle} style={[demoStyles.rowCard, demoBox(active, active ? theme.colors.primary : theme.colors.border, active ? '#EEF3FF' : '#FFFFFF')]}>
          <View style={demoStyles.rowBetween}>
            <View style={demoStyles.stackTight}>
              <Text style={{ color: theme.colors.onSurface, fontSize: 15, fontWeight: '700' }}>整行点击切换</Text>
              <Text style={{ color: theme.colors.muted, fontSize: 13 }}>适合协议行、设置行等复合布局。</Text>
            </View>
            {icon(active ? 'check-circle' : 'circle', active ? theme.colors.primary : theme.colors.muted, 18)}
          </View>
        </Pressable>
      )}
    </Checkbox>
  );
}

function RadioGroupDemo() {
  const theme = useTheme();
  const [value, setValue] = React.useState<'compact' | 'balanced' | 'dense'>('balanced');

  return (
    <View style={demoStyles.stack}>
      <RadioGroup value={value} onValueChange={(next) => next && setValue(next as 'compact' | 'balanced' | 'dense')} direction="column" gap={12}>
        <Radio itemValue="compact" label="紧凑模式" />
        <Radio itemValue="balanced" label="均衡模式" />
        <Radio itemValue="dense" label="密集模式" />
      </RadioGroup>
      <Text style={[demoStyles.caption, { color: theme.colors.muted }]}>当前模式：{value}</Text>
    </View>
  );
}

function RadioCustomDemo() {
  const theme = useTheme();
  const [channel, setChannel] = React.useState<'ios' | 'android'>('ios');

  return (
    <RadioGroup value={channel} onValueChange={(next) => next && setChannel(next as 'ios' | 'android')} direction="column" gap={10}>
      {[
        { value: 'ios', label: 'iOS / 原生构建' },
        { value: 'android', label: 'Android / 真机调试' },
      ].map((item) => (
        <Radio key={item.value} itemValue={item.value} hiddenIndicator>
          {({ checked, toggle }) => (
            <Pressable
              onPress={toggle}
              style={[
                demoStyles.rowCard,
                demoBox(checked, checked ? theme.colors.primary : theme.colors.border, checked ? '#EEF3FF' : '#FFFFFF'),
              ]}
            >
              <View style={demoStyles.rowBetween}>
                <Text style={{ color: theme.colors.onSurface, fontSize: 15, fontWeight: '700' }}>{item.label}</Text>
                {icon(checked ? 'check-circle' : 'circle', checked ? theme.colors.primary : theme.colors.muted, 18)}
              </View>
            </Pressable>
          )}
        </Radio>
      ))}
    </RadioGroup>
  );
}

function AccordionSingleDemo() {
  const theme = useTheme();

  return (
    <Accordion type="single" collapsible defaultValue="tokens" style={demoStyles.stack}>
      <AccordionItem value="tokens" style={demoStyles.accordionItem}>
        <AccordionTrigger title="设计 Token" right={() => <AccordionIndicator />} />
        <AccordionContent>
          <Text style={{ color: theme.colors.muted, fontSize: 14, lineHeight: 22 }}>
            这里适合放颜色、圆角、间距和主题覆写说明。
          </Text>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="motion" style={demoStyles.accordionItem}>
        <AccordionTrigger title="动效规范" right={() => <AccordionIndicator />} />
        <AccordionContent>
          <Text style={{ color: theme.colors.muted, fontSize: 14, lineHeight: 22 }}>
            交互节奏、弹层惯性、滚轮选择器体验都可以放在折叠说明里。
          </Text>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function AccordionMultipleDemo() {
  const theme = useTheme();

  return (
    <Accordion type="multiple" defaultValue={['api', 'notes']} style={demoStyles.stack}>
      <AccordionItem value="api" style={demoStyles.accordionItem}>
        <AccordionTrigger title="接入 API" right={() => <AccordionIndicator />} />
        <AccordionContent>
          <Text style={{ color: theme.colors.muted, fontSize: 14, lineHeight: 22 }}>
            适合同时展开多个说明区，让开发和设计都能看到对应细节。
          </Text>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="notes" style={demoStyles.accordionItem}>
        <AccordionTrigger title="上线注意项" right={() => <AccordionIndicator />} />
        <AccordionContent>
          <Text style={{ color: theme.colors.muted, fontSize: 14, lineHeight: 22 }}>
            包括权限、原生依赖、主题覆盖和测试用例补齐建议。
          </Text>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function PickerSingleDemo() {
  const [language, setLanguage] = React.useState('zh');
  const [label, setLabel] = React.useState('简体中文');

  return (
    <Picker list={[{ id: 'zh', title: '简体中文' }, { id: 'en', title: 'English' }, { id: 'ja', title: '日本語' }]} value={language} onValueChange={(next) => setLanguage(String(next))} label={label} onLabelChange={setLabel} title="选择语言">
      {({ label }) => <Button variant="outline">{label || '选择语言'}</Button>}
    </Picker>
  );
}

function PickerCascadeDemo() {
  const [workflow, setWorkflow] = React.useState<PickerModelValue>(['design', 'token']);
  const [label, setLabel] = React.useState('设计 / Tokens');

  return (
    <Picker
      list={workflowList}
      value={workflow}
      onValueChange={setWorkflow}
      label={label}
      onLabelChange={(next) => setLabel(next.replace(/-/g, ' / '))}
      modelStrSeparator=" / "
      title="选择流程"
    >
      {({ label }) => <Button>{label || '选择流程'}</Button>}
    </Picker>
  );
}

function DatePickerBoundDemo() {
  const [value, setValue] = React.useState('2026-04-23');
  const [label, setLabel] = React.useState('2026-04-23');

  return (
    <DatePicker value={value} onValueChange={setValue} label={label} onLabelChange={setLabel} start="2024-01-01" end="2030-12-31">
      {({ label }) => <Button variant="outline">{label || value}</Button>}
    </DatePicker>
  );
}

function DatePickerTriggerDemo() {
  const theme = useTheme();
  const [value, setValue] = React.useState('2026-05-16');
  const [label, setLabel] = React.useState('2026-05-16');

  return (
    <DatePicker value={value} onValueChange={setValue} label={label} onLabelChange={setLabel}>
      {({ label }) => (
        <Pressable style={[demoStyles.rowCard, demoBox(true, theme.colors.border, '#FFFFFF')]}>
          <View style={demoStyles.rowBetween}>
            <Text style={{ color: theme.colors.onSurface, fontSize: 15, fontWeight: '700' }}>发版日期</Text>
            <Text style={{ color: theme.colors.muted, fontSize: 14 }}>{label || value}</Text>
          </View>
        </Pressable>
      )}
    </DatePicker>
  );
}

function AddressCascaderDefaultDemo() {
  const [value, setValue] = React.useState<string[]>(['110000', '110100', '110101']);
  const [label, setLabel] = React.useState('北京市-市辖区-东城区');

  return (
    <AddressCascader value={value} onValueChange={setValue} label={label} onLabelChange={setLabel}>
      {({ label }) => <Button>{label || '选择地址'}</Button>}
    </AddressCascader>
  );
}

function AddressCascaderCustomDemo() {
  const [value, setValue] = React.useState<string[]>(['jp', 'tokyo', 'shinjuku']);
  const [label, setLabel] = React.useState('日本-东京-新宿区');

  return (
    <AddressCascader
      list={customAddressList}
      value={value}
      onValueChange={setValue}
      label={label}
      onLabelChange={setLabel}
      title="选择区域"
    >
      {({ label }) => <Button variant="outline">{label || '选择区域'}</Button>}
    </AddressCascader>
  );
}

function BetweenTimeQuickDemo() {
  const theme = useTheme();
  const [value, setValue] = React.useState<string[]>(['2026-04-01', '2026-04-23']);

  return (
    <BetweenTime value={value} onValueChange={setValue} quickDate={['d', 'w', 'm', '7', '30']} start="2024-01-01" end="2030-12-31">
      <Pressable style={[demoStyles.rowCard, demoBox(true, theme.colors.border, '#FFFFFF')]}>
        <Text style={{ color: theme.colors.onSurface, fontSize: 15, fontWeight: '700' }}>
          {value.length === 2 ? `${value[0]} 至 ${value[1]}` : '选择时间区间'}
        </Text>
      </Pressable>
    </BetweenTime>
  );
}

function BetweenTimePrecisionDemo() {
  const [value, setValue] = React.useState<string[]>(['2026-04-23 09:30', '2026-04-23 18:30']);

  return (
    <BetweenTime value={value} onValueChange={setValue} type="minute" format="YYYY-MM-DD HH:mm" start="2024-01-01" end="2030-12-31">
      <Button variant="outline">{value.length === 2 ? `${value[0]} / ${value[1]}` : '分钟精度'}</Button>
    </BetweenTime>
  );
}

function SliderCaptchaBasicDemo() {
  const theme = useTheme();
  const [visible, setVisible] = React.useState(false);
  const [status, setStatus] = React.useState('等待验证');

  return (
    <View style={demoStyles.stack}>
      <Button onPress={() => setVisible(true)}>打开验证码</Button>
      <Text style={[demoStyles.caption, { color: theme.colors.muted }]}>当前状态：{status}</Text>
      <SliderCaptcha
        visible={visible}
        onClose={() => setVisible(false)}
        loadChallenge={() => captchaChallenge}
        verifyChallenge={async (payload) => {
          await wait(220);
          const success = payload.progress > 0.24;
          setStatus(success ? '验证通过' : '拖动距离不足');
          return {
            success,
            message: success ? undefined : '拖动距离不足',
          };
        }}
        onVerified={() => {
          setVisible(false);
          setStatus('验证通过');
          cardToast.showSuccess('验证完成', 1000);
        }}
        texts={{
          title: '滑块验证',
          verifyFailed: '请再试一次',
          verifySuccess: '验证成功',
        }}
      />
    </View>
  );
}

function SliderCaptchaStrictDemo() {
  const theme = useTheme();
  const [visible, setVisible] = React.useState(false);
  const [status, setStatus] = React.useState('严格校验未开始');

  return (
    <View style={demoStyles.stack}>
      <Button variant="outline" onPress={() => setVisible(true)}>
        严格模式
      </Button>
      <Text style={[demoStyles.caption, { color: theme.colors.muted }]}>{status}</Text>
      <SliderCaptcha
        visible={visible}
        onClose={() => setVisible(false)}
        dismissOnBackdropPress={false}
        loadChallenge={() => captchaChallenge}
        verifyChallenge={async (payload) => {
          await wait(260);
          const success = payload.progress > 0.31;
          setStatus(success ? '严格校验通过' : '需要拖到更接近缺口');
          return {
            success,
            message: success ? undefined : '需要拖到更接近缺口',
          };
        }}
        onVerified={() => {
          setVisible(false);
        }}
        texts={{
          title: '发布前验证',
          verifyFailed: '偏差较大',
          verifySuccess: '可以继续',
        }}
      />
    </View>
  );
}

export const COMPONENT_PAGES: Record<ComponentId, PageDefinition> = {
  button: {
    intro: 'Button 页面按语义外观、状态和布局三个层面拆开，方便快速比对不同按钮层级。',
    highlights: ['solid / soft / outline / ghost', 'iconOnly 与 loading', '支持全宽 block 布局'],
    sections: [
      {
        title: '语义外观',
        description: '用 variant 和 tone 快速组织主次按钮，不必每次都手写颜色。',
        code: `import { Button } from 'y2kit-ui';\n\n<Button>主按钮</Button>\n<Button variant="soft" tone="info">信息</Button>\n<Button variant="outline" tone="danger">危险操作</Button>`,
        Demo: ButtonVariantsDemo,
      },
      {
        title: '图标与状态',
        description: '把 icon、loading、iconOnly 放在同一个交互系统里，适合工具栏和提交按钮。',
        code: `const [busy, setBusy] = useState(false);\n\n<Button icon={<Icon />}>新建</Button>\n<Button loading={busy}>异步提交</Button>\n<Button iconOnly accessibilityLabel="刷新" icon={<RefreshIcon />} />`,
        Demo: ButtonStateDemo,
      },
      {
        title: '尺寸与布局',
        description: '小号到大号都可以直接切换，block 适合底部确认区。',
        code: `<Button sizePreset="sm">小号</Button>\n<Button sizePreset="md">中号</Button>\n<Button sizePreset="lg">大号</Button>\n<Button block>全宽确认动作</Button>`,
        Demo: ButtonSizeDemo,
      },
    ],
  },
  text: {
    intro: 'Text 更像一个排版基元：在不同平台上统一字重表达，避免同样的 fontWeight 看起来不一致。',
    highlights: ['统一 fontWeight 语义', '适合标题、正文、说明文案', '跨平台排版更稳定'],
    sections: [
      {
        title: '字号阶梯',
        description: '先定层级，再用统一字体权重表达标题和正文关系。',
        code: `import { Text } from 'y2kit-ui';\n\n<Text style={{ fontSize: 30, fontWeight: '800' }}>Display</Text>\n<Text style={{ fontSize: 24, fontWeight: '700' }}>Heading</Text>\n<Text style={{ fontSize: 16, fontWeight: '500' }}>Body</Text>`,
        Demo: TextRampDemo,
      },
      {
        title: '正文与说明',
        description: '正文、说明和弱提示可以放在同一段落体系里，视觉上更克制。',
        code: `<Text style={{ fontSize: 16, lineHeight: 24 }}>正文内容</Text>\n<Text style={{ fontSize: 13, color: theme.colors.muted }}>弱提示</Text>`,
        Demo: TextParagraphDemo,
      },
    ],
  },
  'text-input': {
    intro: 'TextInput 页面重点放在宿主最常见的两类场景：常规表单和多行备注。',
    highlights: ['selection / cursor 跟随主题', '适合表单录入', '多行场景无需额外封装'],
    sections: [
      {
        title: '基础表单输入',
        description: '项目名、邮箱、手机号这类字段都可以直接套这一层。',
        code: `const [name, setName] = useState('Y2Kit');\n\n<TextInput\n  value={name}\n  onChangeText={setName}\n  placeholder="输入项目名"\n  style={inputStyle}\n/>`,
        Demo: TextInputBasicDemo,
      },
      {
        title: '多行输入',
        description: '多行说明、审核意见和备注区域都建议直接用 multiline 版本。',
        code: `<TextInput\n  multiline\n  numberOfLines={5}\n  textAlignVertical="top"\n  selectionColor={theme.colors.primary}\n  style={[inputStyle, multilineStyle]}\n/>`,
        Demo: TextInputAdvancedDemo,
      },
    ],
  },
  'loading-spinner': {
    intro: 'LoadingSpinner 是一个很轻的视觉零件，适合放在按钮、行内状态和模块占位里。',
    highlights: ['轻量级 loading 零件', '可嵌入按钮', '支持不同尺寸'],
    sections: [
      {
        title: '尺寸变化',
        description: '列表、按钮和模块级状态通常需要不同大小的旋转器。',
        code: `<LoadingSpinner size={16} color={theme.colors.primary} />\n<LoadingSpinner size={24} color={theme.colors.primary} />\n<LoadingSpinner size={34} color={theme.colors.primary} />`,
        Demo: LoadingSpinnerScaleDemo,
      },
      {
        title: '行内状态',
        description: '放在状态行里可以减少对整页 loading 遮罩的依赖。',
        code: `<View style={rowStyle}>\n  <LoadingSpinner size={18} color={theme.colors.primary} />\n  <Text>正在同步组件目录</Text>\n</View>\n<Button loading>拉取远程配置</Button>`,
        Demo: LoadingSpinnerInlineDemo,
      },
    ],
  },
  switch: {
    intro: 'Switch 用来表达启用/停用切换最自然，尤其适合设置中心和状态开关。',
    highlights: ['支持 small / normal / large', 'label 可直接映射开关文案', '支持 loading'],
    sections: [
      {
        title: '尺寸体系',
        description: '根据信息密度选择 small、normal 或 large，不需要另外做样式分支。',
        code: `<Switch size="small" label={['开', '关']} />\n<Switch label={['开', '关']} />\n<Switch size="large" label={['启用', '停用']} />`,
        Demo: SwitchScaleDemo,
      },
      {
        title: '自定义状态色',
        description: '当开关不只是布尔值，还要表达在线、审核中、风险等语义时更有用。',
        code: `<Switch color="#0E9F6E" bgColor="#D7F7E8" label={['在线', '离线']} />\n<Switch loading label={['处理中', '待机']} />`,
        Demo: SwitchStateDemo,
      },
    ],
  },
  checkbox: {
    intro: 'Checkbox 页面把单个、多选组和整行点击三类用法拆开，便于直接抄到业务页面里。',
    highlights: ['单选与多选组共存', '支持半选态', '支持 render-prop 组合'],
    sections: [
      {
        title: '单项与半选',
        description: '半选态适合“全选 / 部分已选”场景，单项则适合协议确认。',
        code: `<Checkbox value={checked} onValueChange={setChecked} label="我已阅读并同意" />\n<Checkbox indeterminate label="部分模块已接入" />\n<Checkbox disabled label="禁用状态" />`,
        Demo: CheckboxSingleDemo,
      },
      {
        title: 'CheckboxGroup',
        description: '多选组适合按模块勾选、按标签筛选和批量操作场景。',
        code: `<CheckboxGroup value={values} onValueChange={setValues} direction="column">\n  <Checkbox itemValue="button" label="Button" />\n  <Checkbox itemValue="picker" label="Picker" />\n</CheckboxGroup>`,
        Demo: CheckboxGroupDemo,
      },
      {
        title: '整行点击',
        description: 'render-prop 允许把勾选逻辑塞进一整行自定义布局里。',
        code: `<Checkbox value={checked} onValueChange={setChecked} hiddenCheckbox>\n  {({ checked, toggle }) => <Pressable onPress={toggle}>...</Pressable>}\n</Checkbox>`,
        Demo: CheckboxRenderDemo,
      },
    ],
  },
  radio: {
    intro: 'Radio 更适合互斥选项，例如模式切换、渠道选择、密度设置和视图风格。',
    highlights: ['互斥选项组', '支持横排纵排', '可自定义选项行'],
    sections: [
      {
        title: '标准单选组',
        description: '最适合直接表现同级互斥选项。',
        code: `<RadioGroup value={value} onValueChange={setValue} direction="column">\n  <Radio itemValue="compact" label="紧凑模式" />\n  <Radio itemValue="balanced" label="均衡模式" />\n</RadioGroup>`,
        Demo: RadioGroupDemo,
      },
      {
        title: '自定义选项行',
        description: '隐藏默认圆点后，可以把单选逻辑包进更宽的点击区域里。',
        code: `<Radio itemValue="ios" hiddenIndicator>\n  {({ checked, toggle }) => <Pressable onPress={toggle}>...</Pressable>}\n</Radio>`,
        Demo: RadioCustomDemo,
      },
    ],
  },
  accordion: {
    intro: 'Accordion 页面聚焦两个高频场景：单开单关的 FAQ，以及允许多段同时展开的说明列表。',
    highlights: ['single / multiple 模式', '适合收纳说明信息', '开合动效更自然'],
    sections: [
      {
        title: '单开单关',
        description: '适合问答、帮助文档和设置项说明。',
        code: `<Accordion type="single" collapsible defaultValue="tokens">\n  <AccordionItem value="tokens">\n    <AccordionTrigger title="设计 Token" right={() => <AccordionIndicator />} />\n    <AccordionContent>...</AccordionContent>\n  </AccordionItem>\n</Accordion>`,
        Demo: AccordionSingleDemo,
      },
      {
        title: '同时展开多项',
        description: '适合开发说明和上线注意项并排展开阅读。',
        code: `<Accordion type="multiple" defaultValue={['api', 'notes']}>\n  <AccordionItem value="api">...</AccordionItem>\n  <AccordionItem value="notes">...</AccordionItem>\n</Accordion>`,
        Demo: AccordionMultipleDemo,
      },
    ],
  },
  picker: {
    intro: 'Picker 是滚轮选择的底层能力，既可以做单列，也可以做级联。',
    highlights: ['单列选择', '级联滚轮', 'value 与 label 可受控'],
    sections: [
      {
        title: '单列模式',
        description: '语言、状态、分类这类简单枚举可以直接用单列 picker。',
        code: `<Picker list={[{ id: 'zh', title: '简体中文' }, { id: 'en', title: 'English' }]}>\n  {({ label }) => <Button>{label || '选择语言'}</Button>}\n</Picker>`,
        Demo: PickerSingleDemo,
      },
      {
        title: '级联模式',
        description: '设计 / 评审 / 发版这类树形流程也可以放进同一套滚轮结构里。',
        code: `<Picker list={workflowList} modelStrSeparator=" / ">\n  {({ label }) => <Button>{label || '选择流程'}</Button>}\n</Picker>`,
        Demo: PickerCascadeDemo,
      },
    ],
  },
  'date-picker': {
    intro: 'DatePicker 是 Pickers 家族里最常用的一页，主要看边界限制和自定义触发器。',
    highlights: ['标准 YYYY-MM-DD 输出', 'start / end 边界', '自定义触发器'],
    sections: [
      {
        title: '受控日期',
        description: '表单里最常见的写法是用 value / onValueChange 直接受控。',
        code: `<DatePicker value={value} onValueChange={setValue} start="2024-01-01" end="2030-12-31">\n  {({ label }) => <Button variant="outline">{label || value}</Button>}\n</DatePicker>`,
        Demo: DatePickerBoundDemo,
      },
      {
        title: '自定义触发器',
        description: '当日期展示要嵌进设置行、表单行或概览卡片里时，这种写法更自然。',
        code: `<DatePicker value={value} onValueChange={setValue}>\n  {({ label }) => <Pressable>...</Pressable>}\n</DatePicker>`,
        Demo: DatePickerTriggerDemo,
      },
    ],
  },
  'address-cascader': {
    intro: 'AddressCascader 在默认中国地址数据之外，也支持业务侧完全替换成自己的三级树。',
    highlights: ['内置省市区数据', '支持自定义树', 'label 与 value 都可受控'],
    sections: [
      {
        title: '默认中国地址',
        description: '开箱即可选省市区，适合收货地址、门店信息和合同主体信息。',
        code: `<AddressCascader value={value} onValueChange={setValue}>\n  {({ label }) => <Button>{label || '选择地址'}</Button>}\n</AddressCascader>`,
        Demo: AddressCascaderDefaultDemo,
      },
      {
        title: '自定义三级树',
        description: '如果不是中国地址，也可以直接传入业务自己的三级数据源。',
        code: `<AddressCascader list={customAddressList} value={value} onValueChange={setValue}>\n  {({ label }) => <Button variant="outline">{label || '选择区域'}</Button>}\n</AddressCascader>`,
        Demo: AddressCascaderCustomDemo,
      },
    ],
  },
  'between-time': {
    intro: 'BetweenTime 主要面向时间区间选择，重点是快捷日期和时间精度切换。',
    highlights: ['快捷范围 quickDate', '支持 minute / second 精度', '适合报表筛选'],
    sections: [
      {
        title: '快捷区间',
        description: '日报、周报、月报筛选很适合 quickDate 这类快捷选择。',
        code: `<BetweenTime value={value} onValueChange={setValue} quickDate={['d', 'w', 'm', '7', '30']}>\n  <Pressable>...</Pressable>\n</BetweenTime>`,
        Demo: BetweenTimeQuickDemo,
      },
      {
        title: '分钟精度',
        description: '预约、排班、会议窗口等场景可以直接切成 minute 精度。',
        code: `<BetweenTime type="minute" format="YYYY-MM-DD HH:mm" value={value} onValueChange={setValue}>\n  <Button variant="outline">分钟精度</Button>\n</BetweenTime>`,
        Demo: BetweenTimePrecisionDemo,
      },
    ],
  },
  'slider-captcha': {
    intro: 'SliderCaptcha 是一类独立弹层组件，真正的接入重点在于 challenge 加载和 verify 校验。',
    highlights: ['loadChallenge / verifyChallenge', '支持异步校验', '适合发布前或风控校验'],
    sections: [
      {
        title: '基础打开方式',
        description: '最基础的接入就是按钮打开弹层、验证通过后回写状态。',
        code: `const [visible, setVisible] = useState(false);\n\n<SliderCaptcha\n  visible={visible}\n  onClose={() => setVisible(false)}\n  loadChallenge={() => captchaChallenge}\n  verifyChallenge={async (payload) => ({ success: payload.progress > 0.24 })}\n/>`,
        Demo: SliderCaptchaBasicDemo,
      },
      {
        title: '严格模式',
        description: '如果你的校验链路更严格，可以关闭背景点击消失，并抬高通过阈值。',
        code: `<SliderCaptcha\n  dismissOnBackdropPress={false}\n  texts={{ title: '发布前验证' }}\n  verifyChallenge={async (payload) => ({ success: payload.progress > 0.31 })}\n/>`,
        Demo: SliderCaptchaStrictDemo,
      },
    ],
  },
};

const demoStyles = StyleSheet.create({
  stack: {
    gap: 14,
  },
  stackTight: {
    gap: 4,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  caption: {
    fontSize: 13,
    lineHeight: 20,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multilineInput: {
    minHeight: 126,
  },
  centerStack: {
    alignItems: 'center',
    gap: 10,
    minWidth: 72,
  },
  inlineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowCard: {
    borderRadius: 8,
  },
  accordionItem: {
    borderRadius: 8,
    overflow: 'hidden',
  },
});
