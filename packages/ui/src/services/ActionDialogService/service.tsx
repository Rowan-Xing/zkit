import * as React from 'react';
import { ActionDialog } from './ActionDialog';
import { createSemanticAction, mergeOpenOptions } from './shared';
import type {
  ActionDialogAlertOptions,
  ActionDialogConfirmOptions,
  ActionDialogDismissReason,
  ActionDialogHandle,
  ActionDialogOpenOptions,
  ActionDialogResult,
  ActionDialogService,
  ActionDialogSnapshot,
} from './types';

type ActionDialogRequest = ActionDialogOpenOptions & {
  id: string;
  resolve: (result: ActionDialogResult) => void;
  settled: boolean;
};

type ActionDialogServiceState = {
  activeRequest: ActionDialogRequest | null;
  queuedRequests: ActionDialogRequest[];
  open: boolean;
};

type ActionDialogServiceController = {
  open: (request: ActionDialogRequest) => void;
  close: (id: string | undefined, reason: ActionDialogDismissReason) => void;
  closeByScope: (scopeKey: string, reason: ActionDialogDismissReason) => void;
  closeAll: (reason: ActionDialogDismissReason) => void;
  update: (id: string, patch: Partial<ActionDialogOpenOptions>) => void;
  getSnapshot: () => ActionDialogSnapshot;
};

const initialState: ActionDialogServiceState = {
  activeRequest: null,
  queuedRequests: [],
  open: false,
};

class ActionDialogServiceClass implements ActionDialogService {
  private controller: ActionDialogServiceController | null = null;
  private sequence = 0;

  _bind(controller: ActionDialogServiceController | null) {
    this.controller = controller;
  }

  open(options: ActionDialogOpenOptions = {}): ActionDialogHandle {
    const id = `action_dialog_${Date.now()}_${++this.sequence}`;
    let resolveResult: (result: ActionDialogResult) => void = () => {};
    const result = new Promise<ActionDialogResult>((resolve) => {
      resolveResult = resolve;
    });
    const request: ActionDialogRequest = {
      ...options,
      id,
      resolve: resolveResult,
      settled: false,
    };

    const handle: ActionDialogHandle = {
      id,
      result,
      close: () => this.controller?.close(id, 'api'),
      update: (patch) => this.controller?.update(id, patch),
    };

    if (!this.controller) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[actionDialog] ActionDialogProvider is not mounted.');
      }
      this.settle(request, { type: 'dismiss', reason: 'unmount' });
      return handle;
    }

    this.controller.open(request);
    return handle;
  }

  async confirm({
    cancelAction,
    cancelLabel,
    confirmAction,
    confirmLabel,
    footer,
    tone = 'default',
    ...restOptions
  }: ActionDialogConfirmOptions = {}) {
    const handle = this.open({
      ...restOptions,
      footer: { layout: footer?.layout },
      actions: [
        createSemanticAction(cancelAction, cancelLabel, 'cancel', 'cancel', 'neutral'),
        createSemanticAction(
          confirmAction,
          confirmLabel,
          'confirm',
          'confirm',
          tone === 'danger' ? 'danger' : 'primary'
        ),
      ],
    });
    const result = await handle.result;
    return result.type === 'action' && result.action.role === 'confirm';
  }

  async alert({
    confirmAction,
    confirmLabel,
    footer,
    tone = 'default',
    ...restOptions
  }: ActionDialogAlertOptions = {}) {
    const handle = this.open({
      ...restOptions,
      footer: { layout: footer?.layout },
      actions: [
        createSemanticAction(
          confirmAction,
          confirmLabel,
          'confirm',
          'confirm',
          tone === 'danger' ? 'danger' : 'primary'
        ),
      ],
    });
    await handle.result;
  }

  close() {
    this.controller?.close(undefined, 'api');
  }

  closeByScope(scopeKey: string) {
    if (!scopeKey) return;
    this.controller?.closeByScope(scopeKey, 'api');
  }

  closeAll() {
    this.controller?.closeAll('api');
  }

  getSnapshot(): ActionDialogSnapshot {
    return (
      this.controller?.getSnapshot() ?? {
        activeId: null,
        open: false,
        queuedCount: 0,
      }
    );
  }

  _settle(request: ActionDialogRequest, result: ActionDialogResult) {
    this.settle(request, result);
  }

  private settle(request: ActionDialogRequest, result: ActionDialogResult) {
    if (request.settled) return;
    request.settled = true;
    request.onClose?.(result);
    request.resolve(result);
  }
}

const actionDialogService = new ActionDialogServiceClass();

export const actionDialog: ActionDialogService = actionDialogService;

function settleRequest(request: ActionDialogRequest | null | undefined, result: ActionDialogResult) {
  if (!request) return;
  actionDialogService._settle(request, result);
}

export function ActionDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ActionDialogServiceState>(initialState);
  const stateRef = React.useRef(state);
  stateRef.current = state;

  const showNextRequest = React.useCallback(() => {
    setState((prev) => {
      const [nextRequest, ...restQueue] = prev.queuedRequests;
      if (!nextRequest) {
        return {
          activeRequest: null,
          queuedRequests: [],
          open: false,
        };
      }

      return {
        activeRequest: nextRequest,
        queuedRequests: restQueue,
        open: true,
      };
    });
  }, []);

  const controller = React.useMemo<ActionDialogServiceController>(
    () => ({
      open: (request) => {
        setState((prev) => {
          if (request.collisionStrategy === 'queue' && prev.activeRequest) {
            return {
              ...prev,
              queuedRequests: [...prev.queuedRequests, request],
            };
          }

          settleRequest(prev.activeRequest, { type: 'dismiss', reason: 'replace' });
          for (const queuedRequest of prev.queuedRequests) {
            settleRequest(queuedRequest, { type: 'dismiss', reason: 'replace' });
          }

          return {
            activeRequest: request,
            queuedRequests: [],
            open: true,
          };
        });
      },
      close: (id, reason) => {
        setState((prev) => {
          if (id && prev.activeRequest?.id !== id) {
            let changed = false;
            const nextQueue = prev.queuedRequests.filter((request) => {
              if (request.id !== id) return true;
              changed = true;
              settleRequest(request, { type: 'dismiss', reason });
              return false;
            });
            return changed ? { ...prev, queuedRequests: nextQueue } : prev;
          }

          if (!prev.activeRequest) return prev;
          settleRequest(prev.activeRequest, { type: 'dismiss', reason });
          return { ...prev, open: false };
        });
      },
      closeByScope: (scopeKey, reason) => {
        setState((prev) => {
          let changed = false;
          const nextQueue = prev.queuedRequests.filter((request) => {
            if (request.scopeKey !== scopeKey) return true;
            changed = true;
            settleRequest(request, { type: 'dismiss', reason });
            return false;
          });

          if (prev.activeRequest?.scopeKey === scopeKey) {
            settleRequest(prev.activeRequest, { type: 'dismiss', reason });
            return { ...prev, queuedRequests: nextQueue, open: false };
          }

          return changed ? { ...prev, queuedRequests: nextQueue } : prev;
        });
      },
      closeAll: (reason) => {
        setState((prev) => {
          settleRequest(prev.activeRequest, { type: 'dismiss', reason });
          for (const queuedRequest of prev.queuedRequests) {
            settleRequest(queuedRequest, { type: 'dismiss', reason });
          }
          return {
            activeRequest: prev.activeRequest,
            queuedRequests: [],
            open: prev.activeRequest ? false : prev.open,
          };
        });
      },
      update: (id, patch) => {
        setState((prev) => {
          if (prev.activeRequest?.id === id) {
            return {
              ...prev,
              activeRequest: {
                ...mergeOpenOptions(prev.activeRequest, patch),
                id,
                resolve: prev.activeRequest.resolve,
                settled: prev.activeRequest.settled,
              },
            };
          }

          let changed = false;
          const queuedRequests = prev.queuedRequests.map((request) => {
            if (request.id !== id) return request;
            changed = true;
            return {
              ...mergeOpenOptions(request, patch),
              id,
              resolve: request.resolve,
              settled: request.settled,
            };
          });

          return changed ? { ...prev, queuedRequests } : prev;
        });
      },
      getSnapshot: () => ({
        activeId: stateRef.current.activeRequest?.id ?? null,
        open: stateRef.current.open,
        queuedCount: stateRef.current.queuedRequests.length,
      }),
    }),
    []
  );

  React.useEffect(() => {
    actionDialogService._bind(controller);

    return () => {
      const currentState = stateRef.current;
      settleRequest(currentState.activeRequest, { type: 'dismiss', reason: 'unmount' });
      for (const queuedRequest of currentState.queuedRequests) {
        settleRequest(queuedRequest, { type: 'dismiss', reason: 'unmount' });
      }
      actionDialogService._bind(null);
    };
  }, [controller]);

  const handleClose = React.useCallback((result: ActionDialogResult) => {
    setState((prev) => {
      if (!prev.activeRequest) return prev;
      settleRequest(prev.activeRequest, result);
      return { ...prev, open: false };
    });
  }, []);

  const activeRequest = state.activeRequest;
  const activeDialogProps = React.useMemo(() => {
    if (!activeRequest) return {};
    const { collisionStrategy, id, resolve, scopeKey, settled, ...props } = activeRequest;
    void collisionStrategy;
    void id;
    void resolve;
    void scopeKey;
    void settled;
    return props;
  }, [activeRequest]);

  return (
    <>
      {children}
      <ActionDialog
        {...activeDialogProps}
        hostMode={activeRequest?.hostMode ?? 'inline'}
        open={Boolean(activeRequest && state.open)}
        onClose={handleClose}
        onDismissComplete={showNextRequest}
      />
    </>
  );
}
