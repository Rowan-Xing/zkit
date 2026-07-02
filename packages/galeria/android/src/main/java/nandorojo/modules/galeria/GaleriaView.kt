package nandorojo.modules.galeria

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import expo.modules.kotlin.viewevent.EventDispatcher

enum class Theme(val value: String) {
    Dark("dark"),
    Light("light")
}

class GaleriaView(context: Context) : ViewGroup(context) {
    var urls: Array<String>? = null
    var items: List<Map<String, Any?>> = emptyList()
    var theme: Theme = Theme.Dark
    var initialIndex: Int = 0
        set(value) {
            field = value
            bindSourceImageView()
        }
    var galleryId: String? = null
        set(value) {
            field = value
            bindSourceImageView()
        }
    var disableHiddenOriginalImage = false
    var edgeToEdge = false
    var transitionOffsetY: Int? = null
    var transitionOffsetX: Int? = 0
    val onIndexChange by EventDispatcher()

    private var sourceImageView: ImageView? = null
    private var observedSourceImageView: ImageView? = null
    private var sourceImageLayoutListener: View.OnLayoutChangeListener? = null
    private var sourceImageAttachListener: View.OnAttachStateChangeListener? = null
    private var overlayView: GalleryViewerOverlayView? = null
    private var overlayBackCallback: OnBackPressedCallback? = null

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        bindSourceImageView()
    }

    override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
        for (i in 0 until childCount) {
            val child = getChildAt(i)
            child.layout(0, 0, width, height)
        }
        bindSourceImageView()
    }

    override fun onDetachedFromWindow() {
        overlayView?.dismissImmediately()
        overlayView = null
        overlayBackCallback?.remove()
        overlayBackCallback = null
        super.onDetachedFromWindow()
        unregisterSourceImageView()
    }

    private fun scopedGalleryId(): String? = galleryId?.takeIf { it.isNotBlank() }

    private fun transitionNameForIndex(index: Int): String {
        return GallerySharedElementNames.forIndex(scopedGalleryId(), index)
    }

    private fun transitionNameForItem(item: GalleryMediaItem): String {
        return GallerySharedElementNames.forItem(scopedGalleryId(), item)
    }

    private fun bindSourceImageView() {
        val imageView = findImageView(this)
        if (imageView == null) {
            unregisterSourceImageView()
            return
        }

        val previousSourceImageView = sourceImageView
        if (previousSourceImageView != null && previousSourceImageView !== imageView) {
            clearSourceImageObserver()
            if (!isSourceImageViewUsable(previousSourceImageView)) {
                GallerySourceViewRegistry.unregisterView(previousSourceImageView)
            }
        }

        sourceImageView = imageView
        imageView.setOnClickListener {
            openViewer(imageView)
        }
        registerSourceImageViewWhenReady(imageView)
    }

    private fun openViewer(sourceView: ImageView) {
        val mediaItems = buildMediaItems()
        if (mediaItems.isEmpty()) {
            return
        }
        if (overlayView != null) {
            return
        }
        val safeIndex = initialIndex.coerceIn(0, mediaItems.lastIndex)
        val activity = getActivity(context) ?: return
        val overlayHost = activity.window.decorView as? ViewGroup
            ?: activity.findViewById<ViewGroup>(android.R.id.content)
            ?: return
        val sourceKey = transitionNameForItem(mediaItems[safeIndex])
        GallerySourceViewRegistry.register(sourceKey, sourceView)
        val overlay = GalleryViewerOverlayView(
            activity,
            mediaItems,
            safeIndex,
            theme == Theme.Light,
            scopedGalleryId(),
            object : GalleryViewerOverlayView.Listener {
                override fun onOverlayDismissed() {
                    if (overlayView != null) {
                        overlayView = null
                    }
                    overlayBackCallback?.remove()
                    overlayBackCallback = null
                }

                override fun onOverlayIndexChange(index: Int) {
                    onIndexChange(mapOf("currentIndex" to index))
                }
            }
        )
        overlayView = overlay
        overlayHost.addView(overlay)
        if (activity is ComponentActivity) {
            overlayBackCallback?.remove()
            overlayBackCallback = object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    overlayView?.requestClose()
                }
            }.also { callback ->
                activity.onBackPressedDispatcher.addCallback(callback)
            }
        }
    }

    private fun buildMediaItems(): List<GalleryMediaItem> {
        if (items.isNotEmpty()) {
            return items.mapIndexedNotNull { index, data ->
                val type = data["type"] as? String ?: return@mapIndexedNotNull null
                val url = data["url"] as? String ?: return@mapIndexedNotNull null
                if (type.lowercase() == "video") {
                    val poster = data["poster"] as? String ?: url
                    GalleryMediaItem(index.toString(), GalleryMediaItem.MediaType.VIDEO, url, poster)
                } else {
                    GalleryMediaItem(index.toString(), GalleryMediaItem.MediaType.IMAGE, url, url)
                }
            }
        }
        val rawUrls = urls ?: return emptyList()
        return rawUrls.mapIndexed { index, url ->
            GalleryMediaItem(index.toString(), GalleryMediaItem.MediaType.IMAGE, url, url)
        }
    }

    private fun findImageView(view: View): ImageView? {
        var bestImageView: ImageView? = null
        var bestScore = Int.MIN_VALUE

        fun visit(candidate: View) {
            if (candidate is ImageView) {
                val score = sourceImageViewScore(candidate)
                if (score > bestScore) {
                    bestImageView = candidate
                    bestScore = score
                }
            }
            if (candidate is ViewGroup) {
                for (i in 0 until candidate.childCount) {
                    visit(candidate.getChildAt(i))
                }
            }
        }

        visit(view)
        return bestImageView
    }

    private fun registerSourceImageViewWhenReady(imageView: ImageView) {
        val transitionName = transitionNameForIndex(initialIndex)
        if (isSourceImageViewUsable(imageView)) {
            clearSourceImageObserver(imageView)
            GallerySourceViewRegistry.register(transitionName, imageView)
            return
        }

        observeSourceImageView(imageView)
    }

    private fun observeSourceImageView(imageView: ImageView) {
        if (observedSourceImageView === imageView && sourceImageLayoutListener != null) {
            return
        }

        clearSourceImageObserver()
        observedSourceImageView = imageView
        val layoutListener = View.OnLayoutChangeListener { view, _, _, _, _, _, _, _, _ ->
            val observed = view as? ImageView ?: return@OnLayoutChangeListener
            if (sourceImageView !== observed) {
                clearSourceImageObserver(observed)
                return@OnLayoutChangeListener
            }
            if (isSourceImageViewUsable(observed)) {
                registerSourceImageViewWhenReady(observed)
            }
        }
        val attachListener = object : View.OnAttachStateChangeListener {
            override fun onViewAttachedToWindow(view: View) {
                val observed = view as? ImageView ?: return
                if (sourceImageView !== observed) {
                    clearSourceImageObserver(observed)
                    return
                }
                registerSourceImageViewWhenReady(observed)
            }

            override fun onViewDetachedFromWindow(view: View) = Unit
        }
        sourceImageLayoutListener = layoutListener
        sourceImageAttachListener = attachListener
        imageView.addOnLayoutChangeListener(layoutListener)
        imageView.addOnAttachStateChangeListener(attachListener)
        imageView.post {
            if (sourceImageView !== imageView) {
                return@post
            }
            if (isSourceImageViewUsable(imageView)) {
                registerSourceImageViewWhenReady(imageView)
            }
        }
    }

    private fun isSourceImageViewUsable(imageView: ImageView): Boolean {
        return imageView.isAttachedToWindow && imageView.width > 0 && imageView.height > 0
    }

    private fun sourceImageViewScore(imageView: ImageView): Int {
        var score = 0
        if (imageView.isAttachedToWindow) {
            score += 16
        }
        if (imageView.width > 0 && imageView.height > 0) {
            score += 16
        }
        if (imageView.visibility == View.VISIBLE) {
            score += 16
        }
        if (imageView.isShown) {
            score += 16
        }
        if (imageView.drawable != null) {
            score += 8
        }
        if (imageView === sourceImageView) {
            score += 1
        }
        return score
    }

    private fun clearSourceImageObserver(imageView: ImageView? = null) {
        val observed = observedSourceImageView ?: return
        if (imageView != null && observed !== imageView) {
            return
        }
        sourceImageLayoutListener?.let { listener ->
            observed.removeOnLayoutChangeListener(listener)
        }
        sourceImageAttachListener?.let { listener ->
            observed.removeOnAttachStateChangeListener(listener)
        }
        sourceImageLayoutListener = null
        sourceImageAttachListener = null
        observedSourceImageView = null
    }

    private fun getActivity(context: Context): Activity? {
        var current = context
        while (current is ContextWrapper) {
            if (current is Activity) {
                return current
            }
            current = current.baseContext
        }
        return null
    }

    private fun unregisterSourceImageView() {
        clearSourceImageObserver()
        sourceImageView?.let { imageView ->
            GallerySourceViewRegistry.unregisterView(imageView)
        }
        sourceImageView = null
    }
}
