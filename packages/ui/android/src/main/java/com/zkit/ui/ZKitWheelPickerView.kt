package com.zkit.ui

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.Typeface
import android.os.Bundle
import android.os.SystemClock
import android.text.TextUtils
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.widget.FrameLayout
import android.widget.TextView
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.LinearSnapHelper
import androidx.recyclerview.widget.RecyclerView
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event
import kotlin.math.max
import kotlin.math.min

internal data class ZKitWheelPickerItem(
  val label: String,
  val value: Any?,
  val disabled: Boolean,
  val textColor: Int?,
  val testID: String?
) {
  companion object {
    fun fromReadableArray(source: ReadableArray?): List<ZKitWheelPickerItem> {
      if (source == null) return emptyList()

      return buildList(source.size()) {
        for (index in 0 until source.size()) {
          val item = source.getMap(index) ?: continue
          add(
            ZKitWheelPickerItem(
              label = item.getStringOrEmpty("label"),
              value = item.getPickerValue("value"),
              disabled = item.getBooleanOrFalse("disabled"),
              textColor = item.getColorOrNull("textColor"),
              testID = item.getStringOrNull("testID")
            )
          )
        }
      }
    }
  }
}

private fun ReadableMap.getStringOrNull(key: String): String? =
  if (hasKey(key) && !isNull(key) && getType(key) == ReadableType.String) getString(key) else null

private fun ReadableMap.getStringOrEmpty(key: String): String = getStringOrNull(key).orEmpty()

private fun ReadableMap.getBooleanOrFalse(key: String): Boolean =
  hasKey(key) && !isNull(key) && getType(key) == ReadableType.Boolean && getBoolean(key)

private fun ReadableMap.getPickerValue(key: String): Any? {
  if (!hasKey(key) || isNull(key)) return null
  return when (getType(key)) {
    ReadableType.Number -> getDouble(key)
    ReadableType.String -> getString(key)
    else -> null
  }
}

private fun ReadableMap.getColorOrNull(key: String): Int? {
  if (!hasKey(key) || isNull(key)) return null
  return when (getType(key)) {
    ReadableType.Number -> getDouble(key).toInt()
    ReadableType.String -> runCatching { Color.parseColor(getString(key)) }.getOrNull()
    else -> null
  }
}

private data class WheelTextAppearance(
  val itemColor: Int = Color.GRAY,
  val selectedColor: Int = Color.BLACK,
  val disabledColor: Int = Color.LTGRAY,
  val fontFamily: String? = null,
  val fontSize: Float = 18f,
  val fontStyle: String? = null,
  val fontWeight: String? = null,
  val maxFontSizeMultiplier: Float = 1.4f,
  val numberOfLines: Int = 1,
  val rowHeight: Float = 44f
)

private class WheelAdapter(
  private val context: Context
) : RecyclerView.Adapter<WheelAdapter.Holder>() {
  var items: List<ZKitWheelPickerItem> = emptyList()
    private set
  var appearance = WheelTextAppearance()
    private set

  class Holder(val textView: TextView) : RecyclerView.ViewHolder(textView)

  override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Holder {
    val textView = TextView(context).apply {
      gravity = Gravity.CENTER
      includeFontPadding = false
      ellipsize = TextUtils.TruncateAt.END
      textAlignment = View.TEXT_ALIGNMENT_CENTER
      isClickable = false
      isFocusable = false
      importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
      layoutParams = RecyclerView.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        appearance.rowHeight.dpToPx(context)
      )
    }
    return Holder(textView)
  }

  override fun onBindViewHolder(holder: Holder, position: Int) {
    val item = items[position]
    holder.textView.apply {
      text = item.label
      setTextColor(resolveTextColor(position))
      alpha = if (item.disabled) 0.62f else 1f
      maxLines = max(1, appearance.numberOfLines)
      tag = item.testID
      setTextSize(TypedValue.COMPLEX_UNIT_PX, appearance.resolveTextSizePx(context))
      typeface = appearance.resolveTypeface()
      val params = layoutParams as RecyclerView.LayoutParams
      val nextHeight = appearance.rowHeight.dpToPx(context)
      if (params.height != nextHeight) {
        params.height = nextHeight
        layoutParams = params
      }
    }
  }

  private fun resolveTextColor(position: Int): Int {
    val item = items.getOrNull(position) ?: return appearance.itemColor
    return when {
      item.disabled -> item.textColor ?: appearance.disabledColor
      else -> appearance.itemColor
    }
  }

  override fun getItemCount(): Int = items.size

  fun apply(nextItems: List<ZKitWheelPickerItem>, nextAppearance: WheelTextAppearance) {
    val itemsChanged = items != nextItems
    val appearanceChanged = appearance != nextAppearance
    if (!itemsChanged && !appearanceChanged) return

    items = nextItems
    appearance = nextAppearance
    notifyDataSetChanged()
  }

  fun isDisabled(position: Int): Boolean = items.getOrNull(position)?.disabled != false
}

/**
 * Draw every row once with its stable base/disabled colour, then draw only the
 * pixels intersecting the fixed centre band into a tiny offscreen layer and
 * tint that copy with the selected colour. No holder state or adapter notify is
 * changed while scrolling, so the colour remains tied to the visual viewport
 * rather than to a logical row.
 */
private class WheelRecyclerView(
  context: Context,
  private val wheelAdapter: WheelAdapter
) : RecyclerView(context) {
  private var interactionEnabled: Boolean = true

  private val selectedTintPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    xfermode = PorterDuffXfermode(PorterDuff.Mode.SRC_IN)
  }

  override fun dispatchTouchEvent(event: MotionEvent): Boolean {
    if (!interactionEnabled) return true
    return super.dispatchTouchEvent(event)
  }

  fun setWheelInteractionEnabled(enabled: Boolean) {
    if (interactionEnabled == enabled) return

    if (!enabled) {
      // Deliver a real cancellation while the RecyclerView still accepts touch
      // so a disabled transition cannot leave its gesture tracker half-open.
      val now = SystemClock.uptimeMillis()
      val cancelEvent = MotionEvent.obtain(now, now, MotionEvent.ACTION_CANCEL, 0f, 0f, 0)
      super.dispatchTouchEvent(cancelEvent)
      cancelEvent.recycle()
    }

    interactionEnabled = enabled
    isEnabled = enabled
  }

  override fun dispatchDraw(canvas: Canvas) {
    super.dispatchDraw(canvas)

    if (width <= 0 || height <= 0 || childCount == 0) return
    val appearance = wheelAdapter.appearance
    if (appearance.selectedColor == appearance.itemColor) return

    val bandHeight = appearance.rowHeight.dpToPx(context)
    val bandTop = (height - bandHeight) / 2f
    val bandBottom = bandTop + bandHeight
    if (bandBottom <= 0f || bandTop >= height.toFloat()) return

    val layer = canvas.saveLayer(0f, bandTop, width.toFloat(), bandBottom, null)
    canvas.clipRect(0f, bandTop, width.toFloat(), bandBottom)

    val frameDrawingTime = drawingTime
    for (childIndex in 0 until childCount) {
      val child = getChildAt(childIndex)
      if (child.bottom <= bandTop || child.top >= bandBottom) continue

      val adapterPosition = getChildAdapterPosition(child)
      if (adapterPosition == NO_POSITION || wheelAdapter.isDisabled(adapterPosition)) continue
      drawChild(canvas, child, frameDrawingTime)
    }

    selectedTintPaint.color = appearance.selectedColor
    canvas.drawRect(0f, bandTop, width.toFloat(), bandBottom, selectedTintPaint)
    canvas.restoreToCount(layer)
  }
}

private fun Float.dpToPx(context: Context): Int =
  max(1, (this * context.resources.displayMetrics.density).toInt())

private fun WheelTextAppearance.resolveTextSizePx(context: Context): Float {
  val metrics = context.resources.displayMetrics
  val boundedScale = min(metrics.scaledDensity / metrics.density, max(0f, maxFontSizeMultiplier))
  return fontSize * metrics.density * boundedScale
}

private fun WheelTextAppearance.resolveTypeface(): Typeface {
  val base = if (fontFamily.isNullOrBlank()) Typeface.DEFAULT else Typeface.create(fontFamily, Typeface.NORMAL)
  val numericWeight = fontWeight?.toIntOrNull()
  val bold = numericWeight?.let { it >= 600 } ?: fontWeight.equals("bold", ignoreCase = true)
  val italic = fontStyle.equals("italic", ignoreCase = true)
  val style = when {
    bold && italic -> Typeface.BOLD_ITALIC
    bold -> Typeface.BOLD
    italic -> Typeface.ITALIC
    else -> Typeface.NORMAL
  }
  return Typeface.create(base, style)
}

class ZKitWheelPickerView(
  context: ReactContext
) : FrameLayout(context) {
  internal var pendingItems: List<ZKitWheelPickerItem> = emptyList()
  internal var pendingSelectedIndex: Int = 0
  internal var pendingSelectedColor: Int = Color.BLACK
  internal var pendingItemColor: Int = Color.GRAY
  internal var pendingDisabledColor: Int = Color.LTGRAY
  internal var pendingFontFamily: String? = null
  internal var pendingFontSize: Float = 18f
  internal var pendingFontStyle: String? = null
  internal var pendingFontWeight: String? = null
  internal var pendingMaxFontSizeMultiplier: Float = 1.4f
  internal var pendingNumberOfLines: Int = 1
  internal var pendingRowHeight: Float = 44f
  internal var pendingDisabled: Boolean = false

  private val layoutManager = LinearLayoutManager(context, RecyclerView.VERTICAL, false)
  private val adapter = WheelAdapter(context)
  private val recyclerView = WheelRecyclerView(context, adapter)
  private val snapHelper = LinearSnapHelper()
  private var currentItems: List<ZKitWheelPickerItem> = emptyList()
  private var currentAppearance = WheelTextAppearance()
  private var currentSelectedIndex = 0
  private var currentDisabled = false
  private var pendingProgrammaticTarget: Int? = null
  private var userInteractionActive = false
  private var lastScrollDirection = 0
  private var positionRequestVersion = 0
  private var hasAppliedSelectedIndexProp = false
  private var appliedSelectedIndexProp = 0

  init {
    clipChildren = true
    isFocusable = true
    importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_YES

    recyclerView.apply {
      this.adapter = this@ZKitWheelPickerView.adapter
      layoutManager = this@ZKitWheelPickerView.layoutManager
      clipToPadding = false
      overScrollMode = View.OVER_SCROLL_NEVER
      isVerticalScrollBarEnabled = false
      itemAnimator = null
      setHasFixedSize(true)
      importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
      descendantFocusability = ViewGroup.FOCUS_BLOCK_DESCENDANTS
      addOnScrollListener(object : RecyclerView.OnScrollListener() {
        override fun onScrolled(recyclerView: RecyclerView, dx: Int, dy: Int) {
          if (dy != 0) lastScrollDirection = if (dy > 0) 1 else -1
        }

        override fun onScrollStateChanged(recyclerView: RecyclerView, newState: Int) {
          when (newState) {
            RecyclerView.SCROLL_STATE_DRAGGING -> {
              if (currentDisabled) return
              positionRequestVersion += 1
              pendingProgrammaticTarget = null
              userInteractionActive = true
            }

            RecyclerView.SCROLL_STATE_IDLE -> settleAfterScroll()
          }
        }
      })
    }

    snapHelper.attachToRecyclerView(recyclerView)
    addView(
      recyclerView,
      LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    )
  }

  override fun onSizeChanged(width: Int, height: Int, oldWidth: Int, oldHeight: Int) {
    super.onSizeChanged(width, height, oldWidth, oldHeight)
    updateCenterPadding()
    scheduleSelectedPositionRestore(updatePadding = false)
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    // TrueSheet keeps prewarmed content alive and reparents it into the visible
    // coordinator when presented. Its size may not change during that move, so
    // onSizeChanged alone cannot restore the selected row to the visual center.
    scheduleSelectedPositionRestore(updatePadding = true)
  }

  override fun onDetachedFromWindow() {
    settleSynchronouslyForDetach()
    super.onDetachedFromWindow()
  }

  override fun getAccessibilityClassName(): CharSequence = "android.widget.NumberPicker"

  override fun onInitializeAccessibilityNodeInfo(info: AccessibilityNodeInfo) {
    super.onInitializeAccessibilityNodeInfo(info)
    info.className = accessibilityClassName
    info.isEnabled = !currentDisabled
    info.isScrollable = !currentDisabled && currentItems.size > 1
    info.contentDescription = currentItems.getOrNull(currentSelectedIndex)?.label.orEmpty()
    if (currentItems.isNotEmpty()) {
      info.rangeInfo = AccessibilityNodeInfo.RangeInfo.obtain(
        AccessibilityNodeInfo.RangeInfo.RANGE_TYPE_INT,
        0f,
        currentItems.lastIndex.toFloat(),
        currentSelectedIndex.toFloat()
      )
      if (!currentDisabled) {
        info.addAction(AccessibilityNodeInfo.AccessibilityAction.ACTION_SCROLL_BACKWARD)
        info.addAction(AccessibilityNodeInfo.AccessibilityAction.ACTION_SCROLL_FORWARD)
      }
    }
  }

  override fun performAccessibilityAction(action: Int, arguments: Bundle?): Boolean {
    if (currentDisabled) return super.performAccessibilityAction(action, arguments)
    val direction = when (action) {
      AccessibilityNodeInfo.ACTION_SCROLL_FORWARD -> 1
      AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD -> -1
      else -> 0
    }
    if (direction == 0) return super.performAccessibilityAction(action, arguments)

    val nextIndex = findSelectableIndex(currentSelectedIndex + direction, direction)
    if (nextIndex < 0 || nextIndex == currentSelectedIndex) return false
    scrollToIndexInternal(nextIndex, animated = true, suppressEvent = true)
    dispatchSelection(nextIndex)
    return true
  }

  fun commitPendingProps() {
    val nextAppearance = WheelTextAppearance(
      itemColor = pendingItemColor,
      selectedColor = pendingSelectedColor,
      disabledColor = pendingDisabledColor,
      fontFamily = pendingFontFamily,
      fontSize = pendingFontSize,
      fontStyle = pendingFontStyle,
      fontWeight = pendingFontWeight,
      maxFontSizeMultiplier = pendingMaxFontSizeMultiplier,
      numberOfLines = max(1, pendingNumberOfLines),
      rowHeight = max(1f, pendingRowHeight)
    )
    val dataChanged = currentItems != pendingItems
    val rowHeightChanged = currentAppearance.rowHeight != nextAppearance.rowHeight
    val disabledChanged = currentDisabled != pendingDisabled
    val nextSelectedIndex = pendingSelectedIndex.coerceIn(0, max(0, pendingItems.lastIndex))
    // Compare against the last React prop, not the native selection. While the
    // user drags or the RecyclerView decelerates, the physical center naturally
    // differs from the controlled prop. Treating that difference as a prop
    // update snaps the wheel back whenever Fabric commits unrelated props.
    val selectedIndexPropChanged =
      !hasAppliedSelectedIndexProp || appliedSelectedIndexProp != nextSelectedIndex
    hasAppliedSelectedIndexProp = true
    appliedSelectedIndexProp = nextSelectedIndex

    currentItems = pendingItems
    currentAppearance = nextAppearance
    if (dataChanged || selectedIndexPropChanged) {
      currentSelectedIndex = nextSelectedIndex
    } else {
      currentSelectedIndex = currentSelectedIndex.coerceIn(0, max(0, currentItems.lastIndex))
    }
    adapter.apply(currentItems, currentAppearance)
    contentDescription = currentItems.getOrNull(currentSelectedIndex)?.label.orEmpty()

    if (rowHeightChanged) updateCenterPadding()
    if (disabledChanged) applyDisabledState(pendingDisabled)
    if (dataChanged || rowHeightChanged || selectedIndexPropChanged || (disabledChanged && currentDisabled)) {
      scrollToIndexInternal(currentSelectedIndex, animated = false, suppressEvent = true)
    } else if (disabledChanged) {
      scheduleSelectedPositionRestore(updatePadding = false)
    } else {
      recyclerView.invalidate()
    }
  }

  fun scrollToIndex(index: Int, animated: Boolean) {
    scrollToIndexInternal(index, animated, suppressEvent = true)
  }

  fun syncCurrentSelection(syncRequestId: Double? = null) {
    // stopScroll() synchronously emits IDLE. Clear gesture state first so that
    // the IDLE callback cannot publish an untagged event ahead of this ack.
    positionRequestVersion += 1
    userInteractionActive = false
    pendingProgrammaticTarget = null
    recyclerView.stopScroll()
    val centeredIndex = findCenteredIndex().takeIf { it >= 0 } ?: currentSelectedIndex
    val nextIndex = findSelectableIndex(centeredIndex, lastScrollDirection)
      .takeIf { it >= 0 } ?: centeredIndex.coerceIn(0, max(0, currentItems.lastIndex))
    scrollToIndexInternal(nextIndex, animated = false, suppressEvent = true)
    dispatchSelection(nextIndex, syncRequestId, allowWhenDisabled = true)
  }

  private fun updateCenterPadding() {
    val rowHeightPx = currentAppearance.rowHeight.dpToPx(context)
    val verticalPadding = max(0, (height - rowHeightPx) / 2)
    recyclerView.setPadding(0, verticalPadding, 0, verticalPadding)
  }

  private fun scheduleSelectedPositionRestore(updatePadding: Boolean) {
    if (currentItems.isEmpty()) return

    val target = currentSelectedIndex
    val requestVersion = ++positionRequestVersion
    post {
      if (
        requestVersion != positionRequestVersion ||
        !isAttachedToWindow ||
        userInteractionActive ||
        currentItems.isEmpty() ||
        currentSelectedIndex != target
      ) {
        return@post
      }

      if (updatePadding) updateCenterPadding()
      positionImmediately(target)
    }
  }

  private fun positionImmediately(index: Int) {
    if (currentItems.isEmpty()) return
    val target = index.coerceIn(0, currentItems.lastIndex)
    val requestVersion = ++positionRequestVersion
    applyImmediatePosition(target)
    recyclerView.invalidate()
    // A Fabric prop transaction or RecyclerView data/layout pass can overwrite
    // the first positioning request in the same frame. Re-apply it once after
    // layout, unless the user has already started another gesture or a newer
    // programmatic request superseded this one.
    recyclerView.postOnAnimation {
      if (
        requestVersion == positionRequestVersion &&
        isAttachedToWindow &&
        !userInteractionActive &&
        currentSelectedIndex == target
      ) {
        applyImmediatePosition(target)
        recyclerView.invalidate()
      }
    }
  }

  private fun applyImmediatePosition(target: Int) {
    val snapView = snapHelper.findSnapView(layoutManager)
    val centeredIndex = snapView?.let(layoutManager::getPosition) ?: RecyclerView.NO_POSITION
    if (snapView != null && centeredIndex != RecyclerView.NO_POSITION) {
      val viewportCenter =
        (recyclerView.paddingTop + recyclerView.height - recyclerView.paddingBottom) / 2
      val centeredChildCenter =
        (layoutManager.getDecoratedTop(snapView) + layoutManager.getDecoratedBottom(snapView)) / 2
      val residualDistance = centeredChildCenter - viewportCenter
      val itemDistance = (target - centeredIndex).toLong()
      val rowHeightPx = currentAppearance.rowHeight.dpToPx(context)
      val totalDistance = itemDistance * rowHeightPx + residualDistance
      if (totalDistance != 0L) {
        // Retained TrueSheet content does not always perform a new RecyclerView
        // layout after scrollToPositionWithOffset. Include the residual pixel
        // offset as well as whole rows so a half-scrolled row is truly centred.
        recyclerView.scrollBy(
          0,
          totalDistance.coerceIn(Int.MIN_VALUE.toLong(), Int.MAX_VALUE.toLong()).toInt()
        )
      }
      return
    }

    // Before the first layout, offsets are relative to startAfterPadding; the
    // center inset is already RecyclerView's top padding.
    layoutManager.scrollToPositionWithOffset(target, 0)
  }

  private fun scrollToIndexInternal(index: Int, animated: Boolean, suppressEvent: Boolean) {
    if (currentItems.isEmpty()) return
    val target = index.coerceIn(0, currentItems.lastIndex)
    currentSelectedIndex = target
    contentDescription = currentItems[target].label
    pendingProgrammaticTarget = if (suppressEvent) target else null
    userInteractionActive = !suppressEvent

    if (!animated || !isLaidOut) {
      positionImmediately(target)
      if (!animated) pendingProgrammaticTarget = null
      return
    }
    recyclerView.smoothScrollToPosition(target)
  }

  private fun settleAfterScroll() {
    if (currentItems.isEmpty()) return
    if (currentDisabled) {
      userInteractionActive = false
      pendingProgrammaticTarget = null
      positionImmediately(currentSelectedIndex)
      return
    }
    val snapView = snapHelper.findSnapView(layoutManager) ?: return
    val snapDistance = snapHelper.calculateDistanceToFinalSnap(layoutManager, snapView)
    if (snapDistance != null && (snapDistance[0] != 0 || snapDistance[1] != 0)) {
      // LinearSnapHelper will issue the final short correction after this idle
      // callback. Keep the interaction active and publish only the next, truly
      // centered idle state.
      return
    }
    val centeredIndex = layoutManager.getPosition(snapView).takeIf { it >= 0 } ?: currentSelectedIndex
    val programmaticTarget = pendingProgrammaticTarget
    if (programmaticTarget != null) {
      currentSelectedIndex = programmaticTarget.coerceIn(0, currentItems.lastIndex)
      pendingProgrammaticTarget = null
      userInteractionActive = false
      return
    }

    if (!userInteractionActive) return
    val selectableIndex = findSelectableIndex(centeredIndex, lastScrollDirection)
    if (selectableIndex < 0) {
      userInteractionActive = false
      positionImmediately(currentSelectedIndex)
      return
    }
    if (selectableIndex != centeredIndex) {
      currentSelectedIndex = selectableIndex
      recyclerView.smoothScrollToPosition(selectableIndex)
      return
    }

    userInteractionActive = false
    dispatchSelection(selectableIndex)
  }

  private fun findCenteredIndex(): Int {
    val snapView = snapHelper.findSnapView(layoutManager) ?: return RecyclerView.NO_POSITION
    return layoutManager.getPosition(snapView)
  }

  private fun applyDisabledState(disabled: Boolean) {
    currentDisabled = disabled
    isEnabled = !disabled
    recyclerView.setWheelInteractionEnabled(!disabled)

    if (disabled) {
      // Invalidate pending post/layout requests before stopScroll synchronously
      // delivers IDLE. No user event may escape after the disabled transition.
      positionRequestVersion += 1
      userInteractionActive = false
      pendingProgrammaticTarget = null
      recyclerView.stopScroll()
    }

    recyclerView.invalidate()
    sendAccessibilityEvent(AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED)
  }

  private fun settleSynchronouslyForDetach() {
    positionRequestVersion += 1
    val shouldCommitGesture = userInteractionActive && !currentDisabled
    val visualIndex = findCenteredIndex().takeIf { it >= 0 } ?: currentSelectedIndex
    val targetIndex = if (shouldCommitGesture) {
      findSelectableIndex(visualIndex, lastScrollDirection).takeIf { it >= 0 } ?: currentSelectedIndex
    } else {
      currentSelectedIndex
    }.coerceIn(0, max(0, currentItems.lastIndex))

    // RecyclerView.onDetachedFromWindow also calls stopScroll(), but by then a
    // LinearSnapHelper correction can be cancelled without a second IDLE. Do it
    // while still attached, after clearing state, and align the residual pixels
    // synchronously so attach always has a stable row to restore.
    userInteractionActive = false
    pendingProgrammaticTarget = null
    recyclerView.stopScroll()

    if (currentItems.isNotEmpty()) {
      currentSelectedIndex = targetIndex
      contentDescription = currentItems[targetIndex].label
      applyImmediatePosition(targetIndex)
      recyclerView.invalidate()
      if (shouldCommitGesture) dispatchSelection(targetIndex)
    }
  }

  private fun findSelectableIndex(index: Int, direction: Int): Int {
    if (currentItems.isEmpty()) return -1
    val start = index.coerceIn(0, currentItems.lastIndex)
    if (!currentItems[start].disabled) return start

    fun forward(): Int {
      for (candidate in start + 1..currentItems.lastIndex) {
        if (!currentItems[candidate].disabled) return candidate
      }
      return -1
    }

    fun backward(): Int {
      for (candidate in start - 1 downTo 0) {
        if (!currentItems[candidate].disabled) return candidate
      }
      return -1
    }

    if (direction > 0) return forward().takeIf { it >= 0 } ?: backward()
    if (direction < 0) return backward().takeIf { it >= 0 } ?: forward()

    for (distance in 1 until currentItems.size) {
      val previous = start - distance
      if (previous >= 0 && !currentItems[previous].disabled) return previous
      val next = start + distance
      if (next < currentItems.size && !currentItems[next].disabled) return next
    }
    return -1
  }

  private fun dispatchSelection(
    index: Int,
    syncRequestId: Double? = null,
    allowWhenDisabled: Boolean = false
  ) {
    if (currentDisabled && !allowWhenDisabled) return
    if (index !in currentItems.indices) return
    val item = currentItems[index]
    currentSelectedIndex = index
    contentDescription = item.label

    val event = Arguments.createMap().apply {
      putInt("newIndex", index)
      when (val value = item.value) {
        is Number -> putDouble("newValue", value.toDouble())
        is String -> putString("newValue", value)
        else -> putNull("newValue")
      }
      if (syncRequestId != null) putDouble("syncRequestId", syncRequestId)
    }
    val reactContext = context as ReactContext
    UIManagerHelper.getEventDispatcherForReactTag(reactContext, id)
      ?.dispatchEvent(ZKitWheelPickerChangeEvent(UIManagerHelper.getSurfaceId(this), id, event))
    if (!currentDisabled) sendAccessibilityEvent(AccessibilityEvent.TYPE_VIEW_SELECTED)
  }
}

private class ZKitWheelPickerChangeEvent(
  surfaceId: Int,
  viewTag: Int,
  private val eventData: WritableMap
) : Event<ZKitWheelPickerChangeEvent>(surfaceId, viewTag) {
  override fun getEventName(): String = "topChange"

  // Selection is emitted only after settling, and sync acknowledgements must
  // never be coalesced away by an adjacent ordinary selection event.
  override fun canCoalesce(): Boolean = false

  override fun getEventData(): WritableMap = eventData
}
