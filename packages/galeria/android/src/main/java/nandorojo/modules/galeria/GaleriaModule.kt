package nandorojo.modules.galeria

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class GaleriaModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("Galeria")

        View(GaleriaView::class) {
            Events(
                "onIndexChange"
            )
            Prop("theme") { view: GaleriaView, theme: Theme ->
                view.theme = theme
            }
            Prop("items") { view: GaleriaView, items: Array<Map<String, Any?>> ->
                view.items = items.toList()
            }
            Prop("urls") { view: GaleriaView, urls: Array<String> ->
                view.urls = urls
            }
            Prop("index") { view: GaleriaView, index: Int ->
                view.initialIndex = index
            }
            Prop("galleryId") { view: GaleriaView, galleryId: String? ->
                view.galleryId = galleryId
            }
            Prop("disableHiddenOriginalImage") { view: GaleriaView, disableHiddenOriginalImage: Boolean ->
                view.disableHiddenOriginalImage = disableHiddenOriginalImage
            }
            Prop("edgeToEdge") { view: GaleriaView, edgeToEdge: Boolean ->
                view.edgeToEdge = edgeToEdge
            }
            Prop("transitionOffsetY") { view: GaleriaView, transitionOffsetY: Int? ->
                view.transitionOffsetY = transitionOffsetY
            }
            Prop("transitionOffsetX") { view: GaleriaView, transitionOffsetX: Int? ->
                view.transitionOffsetX = transitionOffsetX
            }
        }
    }
}
