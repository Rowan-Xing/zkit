/**
 * @file PickerService - 命令式选择器服务
 * @description 提供 pick、pickDate、pickAddress、pickBetweenTime 等方法
 * @example
 * ```tsx
 * import { pickerService } from 'y2kit-ui';
 *
 * const result = await pickerService.pick({ list: [...], value: 'id' });
 * const date = await pickerService.pickDate({ value: '2024-01-01' });
 * ```
 */

import * as React from 'react';
import { Picker, type PickerProps, type PickerTreeNode, type PickerModelValue } from '../../ui/Picker';
import { DatePicker, type DatePickerProps, type DatePickerValue } from '../../ui/DatePicker';
import { AddressCascader, type AddressCascaderProps, type AddressCascaderValue } from '../../ui/AddressCascader';
import { BetweenTime, type BetweenTimeProps } from '../../ui/BetweenTime';

// ============ Types ============

/** 通用选择器返回结果 */
type PickerResult = {
  /** 选中值 */
  value: PickerModelValue;
  /** 选中值数组（多列时） */
  values: (string | number)[];
  /** 选中项文本 */
  label: string;
  /** 选中项文本数组（多列时） */
  labels: string[];
  /** 选中项数据 */
  items: PickerTreeNode[];
} | null;

/** 日期选择器返回结果 */
type DatePickerResult = {
  /** 选中日期值 */
  value: DatePickerValue;
  /** 格式化后的日期文本 */
  label: string;
} | null;

/** 地址选择器返回结果 */
type AddressResult = {
  /** 选中地址码数组 */
  value: AddressCascaderValue;
  /** 选中地址码数组 */
  values: string[];
  /** 完整地址文本 */
  label: string;
  /** 各级地址文本数组 */
  labels: string[];
  /** 选中项数据 */
  items: PickerTreeNode[];
} | null;

/** 时间区间选择器返回结果 */
type BetweenTimeResult = {
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

type PickerRequest = {
  id: string;
  type: PickerType;
  options: any;
  resolve: ((result: any) => void) | null;
};

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
  setStateUpdater(updater: React.Dispatch<React.SetStateAction<PickerState>>) {
    this.setState = updater;
  }

  /** @internal 显示选择器 */
  private show<T>(type: PickerType, options: any): Promise<T> {
    return new Promise((resolve) => {
      if (!this.setState) {
        console.warn('[PickerService] Provider not mounted');
        resolve(null as T);
        return;
      }
      const request: PickerRequest = {
        id: `picker-request-${Date.now()}-${++this.sequence}`,
        type,
        options,
        resolve,
      };
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
    return this.show<PickerResult>('picker', options);
  }

  /** 打开日期选择器 */
  pickDate(options: PickDateOptions = {}): Promise<DatePickerResult> {
    return this.show<DatePickerResult>('date', options);
  }

  /** 打开地址选择器 */
  pickAddress(options: PickAddressOptions = {}): Promise<AddressResult> {
    return this.show<AddressResult>('address', options);
  }

  /** 打开时间区间选择器 */
  pickBetweenTime(options: PickBetweenTimeOptions = {}): Promise<BetweenTimeResult> {
    return this.show<BetweenTimeResult>('betweenTime', options);
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
 * @description 需要在应用根组件中包裹，已内置于 ComponentLibProvider
 */
export function PickerServiceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<PickerState>(initialState);
  const activeRequestRef = React.useRef<PickerRequest | null>(null);
  const settledRequestIdsRef = React.useRef(new Set<string>());
  activeRequestRef.current = state.activeRequest;

  React.useEffect(() => {
    pickerService.setStateUpdater(setState);
  }, []);

  /** 同一个请求只允许 settle 一次，关闭动画结束前仍保留 activeRequest 做串行调度。 */
  const settleRequest = React.useCallback((request: PickerRequest | null, result: any) => {
    if (!request) return;
    if (settledRequestIdsRef.current.has(request.id)) return;
    settledRequestIdsRef.current.add(request.id);
    request.resolve?.(result);
  }, []);

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
    (payload: any) => {
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
    (payload: any) => {
      settleRequest(activeRequestRef.current, {
        value: payload.value,
        label: payload.label,
      });
    },
    [settleRequest]
  );

  const handleAddressConfirm = React.useCallback(
    (payload: any) => {
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
    (payload: any) => {
      settleRequest(activeRequestRef.current, {
        value: payload.value,
      });
    },
    [settleRequest]
  );

  const activeRequest = state.activeRequest;
  const activeRequestId = activeRequest?.id;

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
      {activeRequest?.type === 'date' && (
        <DatePicker
          key={activeRequest.id}
          {...activeRequest.options}
          open={state.open}
          onOpenChange={handleOpenChange}
          onConfirm={handleDateConfirm}
          onCancel={handleCancel}
          onDismissComplete={() => {
            if (activeRequestId) handleDismissComplete(activeRequestId);
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
