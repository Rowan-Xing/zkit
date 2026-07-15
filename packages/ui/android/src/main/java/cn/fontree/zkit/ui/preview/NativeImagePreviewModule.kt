package cn.fontree.zkit.ui.preview

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NativeImagePreviewModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ZKitNativeImagePreview")

        View(NativeImagePreviewView::class) {
            Events(
                "onIndexChange"
            )
            Prop("theme") { view: NativeImagePreviewView, theme: Theme ->
                view.theme = theme
            }
            Prop("items") { view: NativeImagePreviewView, items: Array<Map<String, Any?>> ->
                view.items = items.toList()
            }
            Prop("urls") { view: NativeImagePreviewView, urls: Array<String> ->
                view.urls = urls
            }
            Prop("index") { view: NativeImagePreviewView, index: Int ->
                view.initialIndex = index
            }
            Prop("previewGroupId") { view: NativeImagePreviewView, previewGroupId: String? ->
                view.previewGroupId = previewGroupId
            }
            Prop("disableHiddenOriginalImage") { view: NativeImagePreviewView, disableHiddenOriginalImage: Boolean ->
                view.disableHiddenOriginalImage = disableHiddenOriginalImage
            }
            Prop("edgeToEdge") { view: NativeImagePreviewView, edgeToEdge: Boolean ->
                view.edgeToEdge = edgeToEdge
            }
            Prop("transitionOffsetY") { view: NativeImagePreviewView, transitionOffsetY: Int? ->
                view.transitionOffsetY = transitionOffsetY
            }
            Prop("transitionOffsetX") { view: NativeImagePreviewView, transitionOffsetX: Int? ->
                view.transitionOffsetX = transitionOffsetX
            }
        }
    }
}
