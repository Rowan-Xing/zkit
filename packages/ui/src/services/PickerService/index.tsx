/**
 * @file PickerService - 命令式选择器服务
 * @description 提供 pick、pickDate、pickAddress、pickBetweenTime 等方法
 * @example
 * ```tsx
 * import { pickerService } from 'zkit-ui/picker-service';
 *
 * const result = await pickerService.pick({ options: [...], value: 'id' });
 * const date = await pickerService.pickDate({ value: '2024-01-01' });
 * ```
 */

import * as React from 'react';
import {
  Picker,
  type PickerConfirmPayload,
  type PickerValue,
  type PickerProps,
} from '../../ui/Picker';
import { DatePicker, type DatePickerProps, type DatePickerValue } from '../../ui/DatePicker';
import {
  AddressCascader,
  type AddressCascaderOption,
  type AddressCascaderProps,
  type AddressCascaderValue,
} from '../../ui/AddressCascader';
import { BetweenTime, type BetweenTimeProps } from '../../ui/BetweenTime';

// ============ Types ============

/** 通用选择器返回结果 */
export type PickerResult = {
  /** 选中值 */
  value: PickerValue;
  /** 选中值数组（多列时） */
  values: PickerConfirmPayload['values'];
  /** 选中项文本 */
  label: string;
  /** 选中项文本数组（多列时） */
  labels: string[];
  /** 选中项数据 */
  items: PickerConfirmPayload['items'];
} | null;

/** 日期选择器返回结果 */
export type DatePickerResult = {
  /** 选中日期值 */
  value: DatePickerValue;
  /** 格式化后的日期文本 */
  label: string;
} | null;

/** 地址选择器返回结果 */
export type AddressPickerResult = {
  /** 选中地址码数组 */
  value: AddressCascaderValue;
  /** 选中地址码数组 */
  values: string[];
  /** 完整地址文本 */
  label: string;
  /** 各级地址文本数组 */
  labels: string[];
  /** 选中项数据 */
  items: AddressCascaderOption[];
} | null;

/** 时间区间选择器返回结果 */
export type BetweenTimePickerResult = {
  /** 时间区间 [开始, 结束] */
  value: string[];
} | null;

/** 通用选择器配置 */
export type PickOptions = Omit<
  PickerProps,
  'open' | 'onOpenChange' | 'onConfirm' | 'onCancel' | 'children' | 'onDismissComplete'
>;
/** 日期选择器配置 */
export type PickDateOptions = Omit<
  DatePickerProps,
  'open' | 'onOpenChange' | 'onConfirm' | 'onCancel' | 'children' | 'onDismissComplete'
>;
/** 地址选择器配置 */
export type PickAddressOptions = Omit<
  AddressCascaderProps,
  'open' | 'onOpenChange' | 'onConfirm' | 'onCancel' | 'children' | 'onDismissComplete'
>;
/** 时间区间选择器配置 */
export type PickBetweenTimeOptions = Omit<
  BetweenTimeProps,
  'open' | 'onOpenChange' | 'onConfirm' | 'onCancel' | 'children' | 'onDismissComplete'
>;

type PickerType = 'picker' | 'date' | 'address' | 'betweenTime';

type PickerRequestMap = {
  picker: {
    options: PickOptions;
    result: PickerResult;
  };
  date: {
    options: PickDateOptions;
    result: DatePickerResult;
  };
  address: {
    options: PickAddressOptions;
    result: AddressPickerResult;
  };
  betweenTime: {
    options: PickBetweenTimeOptions;
    result: BetweenTimePickerResult;
  };
};

type PickerRequestResult = PickerRequestMap[PickerType]['result'];

type PickerRequest<T extends PickerType = PickerType> = {
  [K in T]: {
    id: string;
    type: K;
    options: PickerRequestMap[K]['options'];
    resolve: ((result: PickerRequestResult) => void) | null;
  };
}[T];

type DatePickerConfirmPayload = Parameters<NonNullable<DatePickerProps['onConfirm']>>[0];
type AddressCascaderConfirmPayload = Parameters<NonNullable<AddressCascaderProps['onConfirm']>>[0];
type BetweenTimeConfirmPayload = Parameters<NonNullable<BetweenTimeProps['onConfirm']>>[0];

type PickerState = {
  activeRequest: PickerRequest | null;
  queuedRequests: PickerRequest[];
  open: boolean;
};

// ============ Service Class ============

/**
 * 选择器服务类
 * @internal
 */
class PickerServiceClass {
  private setState: React.Dispatch<React.SetStateAction<PickerState>> | null = null;
  private sequence = 0;

  /** @internal 设置状态更新器 */
  setStateUpdater(updater: React.Dispatch<React.SetStateAction<PickerState>> | null) {
    this.setState = updater;
  }

  /** @internal 显示选择器 */
  private show<T extends PickerType>(
    type: T,
    options: PickerRequestMap[T]['options']
  ): Promise<PickerRequestMap[T]['result']> {
    return new Promise((resolve) => {
      if (!this.setState) {
        console.warn('[PickerService] Provider not mounted');
        resolve(null as PickerRequestMap[T]['result']);
        return;
      }
      const request = {
        id: `picker-request-${Date.now()}-${++this.sequence}`,
        type,
        options,
        resolve: (result: PickerRequestResult) => {
          resolve(result as PickerRequestMap[T]['result']);
        },
      } as PickerRequest;
      this.setState((prev) => {
        if (!prev.activeRequest) {
          return { ...prev, activeRequest: request, open: true };
        }
        return {
          ...prev,
          queuedRequests: [...prev.queuedRequests, request],
        };
      });
    });
  }

  /** 打开通用选择器 */
  pick(options: PickOptions): Promise<PickerResult> {
    return this.show('picker', options);
  }

  /** 打开日期选择器 */
  pickDate(options: PickDateOptions = {}): Promise<DatePickerResult> {
    return this.show('date', options);
  }

  /** 打开地址选择器 */
  pickAddress(options: PickAddressOptions = {}): Promise<AddressPickerResult> {
    return this.show('address', options);
  }

  /** 打开时间区间选择器 */
  pickBetweenTime(options: PickBetweenTimeOptions = {}): Promise<BetweenTimePickerResult> {
    return this.show('betweenTime', options);
  }

  /** 关闭当前选择器 */
  close() {
    this.setState?.((prev) => {
      if (!prev.activeRequest || !prev.open) return prev;
      return { ...prev, open: false };
    });
  }
}

/** 选择器服务实例 */
export const pickerService = new PickerServiceClass();

// ============ Provider Component ============

const initialState: PickerState = {
  activeRequest: null,
  queuedRequests: [],
  open: false,
};

/**
 * 选择器服务 Provider
 * @description 需要在应用根组件中包裹，已内置于 ZKitProvider
 */
export function PickerServiceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<PickerState>(initialState);
  const activeRequestRef = React.useRef<PickerRequest | null>(null);
  const queuedRequestsRef = React.useRef<PickerRequest[]>([]);
  const settledRequestIdsRef = React.useRef(new Set<string>());
  // The service date host is created only after the first real date request.
  // Keeping the last options lets that already-used host stay warm for later
  // calls without imposing startup work or resident views on apps that never
  // use the date picker.
  const lastDateOptionsRef = React.useRef<PickDateOptions | null>(null);
  activeRequestRef.current = state.activeRequest;
  queuedRequestsRef.current = state.queuedRequests;

  /** 同一个请求只允许 settle 一次，关闭动画结束前仍保留 activeRequest 做串行调度。 */
  const settleRequest = React.useCallback((request: PickerRequest | null, result: PickerRequestResult) => {
    if (!request) return;
    if (settledRequestIdsRef.current.has(request.id)) return;
    settledRequestIdsRef.current.add(request.id);
    request.resolve?.(result);
  }, []);

  React.useEffect(() => {
    pickerService.setStateUpdater(setState);

    return () => {
      settleRequest(activeRequestRef.current, null);
      for (const request of queuedRequestsRef.current) {
        settleRequest(request, null);
      }
      pickerService.setStateUpdater(null);
    };
  }, [settleRequest]);

  /** 业务层要求关闭时，先 settle 当前 promise，但不立刻销毁实例。 */
  const handleOpenChange = React.useCallback((open: boolean) => {
    if (open) {
      setState((prev) => {
        if (!prev.activeRequest || prev.open) return prev;
        return { ...prev, open: true };
      });
      return;
    }

    settleRequest(activeRequestRef.current, null);
    setState((prev) => {
      if (!prev.activeRequest || !prev.open) return prev;
      return { ...prev, open: false };
    });
  }, [settleRequest]);

  /** 取消时 resolve null */
  const handleCancel = React.useCallback(() => {
    settleRequest(activeRequestRef.current, null);
  }, [settleRequest]);

  /** 原生 dismiss 真正结束后，再安全切到下一个排队请求。 */
  const handleDismissComplete = React.useCallback(
    (requestId: string) => {
      setState((prev) => {
        if (prev.activeRequest?.id !== requestId) return prev;

        settleRequest(prev.activeRequest, null);
        settledRequestIdsRef.current.delete(requestId);

        const [nextRequest, ...restQueue] = prev.queuedRequests;
        if (!nextRequest) {
          return {
            activeRequest: null,
            queuedRequests: restQueue,
            open: false,
          };
        }

        return {
          activeRequest: nextRequest,
          queuedRequests: restQueue,
          open: true,
        };
      });
    },
    [settleRequest]
  );

  /** 确认时 resolve 结果 */
  const handlePickerConfirm = React.useCallback(
    (payload: PickerConfirmPayload) => {
      settleRequest(activeRequestRef.current, {
        value: payload.value,
        values: payload.values,
        label: payload.label,
        labels: payload.labels,
        items: payload.items,
      });
    },
    [settleRequest]
  );

  const handleDateConfirm = React.useCallback(
    (payload: DatePickerConfirmPayload) => {
      settleRequest(activeRequestRef.current, {
        value: payload.value,
        label: payload.label,
      });
    },
    [settleRequest]
  );

  const handleAddressConfirm = React.useCallback(
    (payload: AddressCascaderConfirmPayload) => {
      settleRequest(activeRequestRef.current, {
        value: payload.value,
        values: payload.values,
        label: payload.label,
        labels: payload.labels,
        items: payload.items,
      });
    },
    [settleRequest]
  );

  const handleBetweenTimeConfirm = React.useCallback(
    (payload: BetweenTimeConfirmPayload) => {
      settleRequest(activeRequestRef.current, {
        value: payload.value,
      });
    },
    [settleRequest]
  );

  const activeRequest = state.activeRequest;
  const activeRequestId = activeRequest?.id;
  const activeDateRequest = activeRequest?.type === 'date' ? activeRequest : null;
  const activeDateOptions = activeDateRequest?.options;
  React.useEffect(() => {
    if (activeDateOptions) lastDateOptionsRef.current = activeDateOptions;
  }, [activeDateOptions]);
  const hostedDateOptions = activeDateOptions ?? lastDateOptionsRef.current;
  const activeDateValue =
    hostedDateOptions?.value !== undefined
      ? hostedDateOptions.value
      : (hostedDateOptions?.defaultValue ?? null);

  return (
    <>
      {children}
      {activeRequest?.type === 'picker' && (
        <Picker
          key={activeRequest.id}
          {...activeRequest.options}
          open={state.open}
          onOpenChange={handleOpenChange}
          onConfirm={handlePickerConfirm}
          onCancel={handleCancel}
          onDismissComplete={() => {
            if (activeRequestId) handleDismissComplete(activeRequestId);
          }}
        />
      )}
      {hostedDateOptions && (
        <DatePicker
          {...hostedDateOptions}
          value={activeDateValue}
          defaultValue={undefined}
          open={activeDateRequest != null && state.open}
          keepMounted
          lazyContent={false}
          onOpenChange={handleOpenChange}
          onConfirm={handleDateConfirm}
          onCancel={handleCancel}
          onDismissComplete={() => {
            if (activeDateRequest) handleDismissComplete(activeDateRequest.id);
          }}
        />
      )}
      {activeRequest?.type === 'address' && (
        <AddressCascader
          key={activeRequest.id}
          {...activeRequest.options}
          open={state.open}
          onOpenChange={handleOpenChange}
          onConfirm={handleAddressConfirm}
          onCancel={handleCancel}
          onDismissComplete={() => {
            if (activeRequestId) handleDismissComplete(activeRequestId);
          }}
        />
      )}
      {activeRequest?.type === 'betweenTime' && (
        <BetweenTime
          key={activeRequest.id}
          {...activeRequest.options}
          open={state.open}
          onOpenChange={handleOpenChange}
          onConfirm={handleBetweenTimeConfirm}
          onCancel={handleCancel}
          onDismissComplete={() => {
            if (activeRequestId) handleDismissComplete(activeRequestId);
          }}
        />
      )}
    </>
  );
}
