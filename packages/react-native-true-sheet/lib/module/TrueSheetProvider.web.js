"use strict";

import { createContext, useContext, useRef } from 'react';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { jsx as _jsx } from "react/jsx-runtime";
export const BottomSheetContext = /*#__PURE__*/createContext(null);
/**
 * Provider for TrueSheet on web.
 * Required to wrap your app for sheet management via useTrueSheet hook.
 */
export function TrueSheetProvider({
  children
}) {
  const sheetsRef = useRef(new Map());
  const presentedStackRef = useRef([]);
  const register = (name, methods) => {
    sheetsRef.current.set(name, methods);
  };
  const unregister = name => {
    sheetsRef.current.delete(name);
  };
  const pushToStack = name => {
    const index = presentedStackRef.current.indexOf(name);
    if (index >= 0) {
      presentedStackRef.current.splice(index, 1);
    }
    presentedStackRef.current.push(name);
  };
  const removeFromStack = name => {
    const index = presentedStackRef.current.indexOf(name);
    if (index >= 0) {
      presentedStackRef.current.splice(index, 1);
    }
  };

  /**
   * Returns all sheets presented on top of the given sheet.
   * Returns them in reverse order (top-most first) for proper dismissal.
   */
  const getSheetsAbove = name => {
    const index = presentedStackRef.current.indexOf(name);
    if (index < 0 || index >= presentedStackRef.current.length - 1) return [];
    return presentedStackRef.current.slice(index + 1).reverse();
  };
  const present = async (name, index = 0) => {
    const sheet = sheetsRef.current.get(name);
    if (!sheet?.current) {
      console.warn(`TrueSheet: Could not find sheet with name "${name}"`);
      return;
    }
    return sheet.current.present(index);
  };
  const dismiss = async name => {
    const sheet = sheetsRef.current.get(name);
    if (!sheet?.current) {
      console.warn(`TrueSheet: Could not find sheet with name "${name}"`);
      return;
    }
    return sheet.current.dismiss();
  };
  const dismissStack = async name => {
    const sheet = sheetsRef.current.get(name);
    if (!sheet?.current) {
      console.warn(`TrueSheet: Could not find sheet with name "${name}"`);
      return;
    }
    return sheet.current.dismissStack();
  };
  const resize = async (name, index) => {
    const sheet = sheetsRef.current.get(name);
    if (!sheet?.current) {
      console.warn(`TrueSheet: Could not find sheet with name "${name}"`);
      return;
    }
    return sheet.current.resize(index);
  };
  const dismissAll = async () => {
    const rootSheet = presentedStackRef.current[0];
    if (!rootSheet) return;
    return dismiss(rootSheet);
  };
  return /*#__PURE__*/_jsx(BottomSheetContext.Provider, {
    value: {
      register,
      unregister,
      pushToStack,
      removeFromStack,
      getSheetsAbove,
      present,
      dismiss,
      dismissStack,
      resize,
      dismissAll
    },
    children: /*#__PURE__*/_jsx(BottomSheetModalProvider, {
      children: children
    })
  });
}
export function useTrueSheet() {
  const context = useContext(BottomSheetContext);
  if (!context) {
    throw new Error('useTrueSheet must be used within a TrueSheetProvider');
  }
  return {
    present: context.present,
    dismiss: context.dismiss,
    dismissStack: context.dismissStack,
    resize: context.resize,
    dismissAll: context.dismissAll
  };
}
//# sourceMappingURL=TrueSheetProvider.web.js.map