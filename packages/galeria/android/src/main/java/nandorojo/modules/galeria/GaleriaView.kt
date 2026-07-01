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
    private var overlayView: GalleryViewerOverlayView? = null
    private var overlayBackCallback: OnBackPressedCallback? = null

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
            GallerySourceViewRegistry.unregisterView(previousSourceImageView)
        }

        sourceImageView = imageView
        val transitionName = transitionNameForIndex(initialIndex)
        GallerySourceViewRegistry.register(transitionName, imageView)
        imageView.setOnClickListener {
            openViewer(imageView)
        }
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
        GallerySourceViewRegistry.register(transitionNameForItem(mediaItems[safeIndex]), sourceView)
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
        if (view is ImageView) {
            return view
        }
        if (view !is ViewGroup) {
            return null
        }
        for (i in 0 until view.childCount) {
            val child = view.getChildAt(i)
            val found = findImageView(child)
            if (found != null) {
                return found
            }
        }
        return null
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
        sourceImageView?.let { imageView ->
            GallerySourceViewRegistry.unregisterView(imageView)
        }
        sourceImageView = null
    }
}
