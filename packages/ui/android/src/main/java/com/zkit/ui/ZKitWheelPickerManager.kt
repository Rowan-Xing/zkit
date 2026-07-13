package com.zkit.ui

import android.graphics.Color
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

@ReactModule(name = ZKitWheelPickerManager.REACT_CLASS)
class ZKitWheelPickerManager : SimpleViewManager<ZKitWheelPickerView>() {
  override fun getName(): String = REACT_CLASS

  override fun createViewInstance(reactContext: ThemedReactContext): ZKitWheelPickerView =
    ZKitWheelPickerView(reactContext)

  @ReactProp(name = "items")
  fun setItems(view: ZKitWheelPickerView, items: ReadableArray?) {
    view.pendingItems = ZKitWheelPickerItem.fromReadableArray(items)
  }

  @ReactProp(name = "selectedIndex", defaultInt = 0)
  fun setSelectedIndex(view: ZKitWheelPickerView, selectedIndex: Int) {
    view.pendingSelectedIndex = selectedIndex
  }

  @ReactProp(name = "color", customType = "Color", defaultInt = Color.BLACK)
  fun setSelectedColor(view: ZKitWheelPickerView, color: Int) {
    view.pendingSelectedColor = color
  }

  @ReactProp(name = "itemColor", customType = "Color", defaultInt = Color.GRAY)
  fun setItemColor(view: ZKitWheelPickerView, color: Int) {
    view.pendingItemColor = color
  }

  @ReactProp(name = "disabledColor", customType = "Color", defaultInt = Color.LTGRAY)
  fun setDisabledColor(view: ZKitWheelPickerView, color: Int) {
    view.pendingDisabledColor = color
  }

  @ReactProp(name = "fontFamily")
  fun setFontFamily(view: ZKitWheelPickerView, fontFamily: String?) {
    view.pendingFontFamily = fontFamily
  }

  @ReactProp(name = "fontSize", defaultFloat = 18f)
  fun setFontSize(view: ZKitWheelPickerView, fontSize: Float) {
    view.pendingFontSize = fontSize
  }

  @ReactProp(name = "fontStyle")
  fun setFontStyle(view: ZKitWheelPickerView, fontStyle: String?) {
    view.pendingFontStyle = fontStyle
  }

  @ReactProp(name = "fontWeight")
  fun setFontWeight(view: ZKitWheelPickerView, fontWeight: String?) {
    view.pendingFontWeight = fontWeight
  }

  @ReactProp(name = "maxFontSizeMultiplier", defaultFloat = 1.4f)
  fun setMaxFontSizeMultiplier(view: ZKitWheelPickerView, multiplier: Float) {
    view.pendingMaxFontSizeMultiplier = multiplier
  }

  @ReactProp(name = "numberOfLines", defaultInt = 1)
  fun setNumberOfLines(view: ZKitWheelPickerView, numberOfLines: Int) {
    view.pendingNumberOfLines = numberOfLines
  }

  @ReactProp(name = "rowHeight", defaultFloat = 44f)
  fun setRowHeight(view: ZKitWheelPickerView, rowHeight: Float) {
    view.pendingRowHeight = rowHeight
  }

  @ReactProp(name = "disabled", defaultBoolean = false)
  fun setDisabled(view: ZKitWheelPickerView, disabled: Boolean) {
    view.pendingDisabled = disabled
  }

  override fun onAfterUpdateTransaction(view: ZKitWheelPickerView) {
    super.onAfterUpdateTransaction(view)
    view.commitPendingProps()
  }

  override fun getExportedCustomBubblingEventTypeConstants(): MutableMap<String, Any> =
    mutableMapOf(
      "topChange" to mapOf(
        "phasedRegistrationNames" to mapOf(
          "bubbled" to "onChange",
          "captured" to "onChangeCapture"
        )
      )
    )

  override fun getCommandsMap(): MutableMap<String, Int> =
    mutableMapOf(
      COMMAND_SYNC_CURRENT_SELECTION_NAME to COMMAND_SYNC_CURRENT_SELECTION,
      COMMAND_SCROLL_TO_INDEX_NAME to COMMAND_SCROLL_TO_INDEX
    )

  override fun receiveCommand(root: ZKitWheelPickerView, commandId: Int, args: ReadableArray?) {
    when (commandId) {
      COMMAND_SYNC_CURRENT_SELECTION -> root.syncCurrentSelection(readSyncRequestId(args))
      COMMAND_SCROLL_TO_INDEX -> {
        val index = if (args != null && args.size() > 0) args.getInt(0) else 0
        val animated = args != null && args.size() > 1 && args.getBoolean(1)
        root.scrollToIndex(index, animated)
      }
    }
  }

  override fun receiveCommand(root: ZKitWheelPickerView, commandId: String, args: ReadableArray?) {
    when (commandId) {
      COMMAND_SYNC_CURRENT_SELECTION_NAME -> root.syncCurrentSelection(readSyncRequestId(args))
      COMMAND_SCROLL_TO_INDEX_NAME -> {
        val index = if (args != null && args.size() > 0) args.getInt(0) else 0
        val animated = args != null && args.size() > 1 && args.getBoolean(1)
        root.scrollToIndex(index, animated)
      }
    }
  }

  companion object {
    const val REACT_CLASS = "ZKitWheelPicker"
    private const val COMMAND_SYNC_CURRENT_SELECTION = 1
    private const val COMMAND_SCROLL_TO_INDEX = 2
    private const val COMMAND_SYNC_CURRENT_SELECTION_NAME = "syncCurrentSelection"
    private const val COMMAND_SCROLL_TO_INDEX_NAME = "scrollToIndex"

    private fun readSyncRequestId(args: ReadableArray?): Double? =
      if (args != null && args.size() > 0 && !args.isNull(0)) {
        runCatching { args.getDouble(0) }.getOrNull()
      } else {
        null
      }
  }
}
