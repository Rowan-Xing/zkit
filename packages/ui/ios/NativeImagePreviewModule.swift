import ExpoModulesCore

public class NativeImagePreviewModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ZKitNativeImagePreview")

    View(NativeImagePreviewView.self) {
      Events("onIndexChange")

      OnViewDidUpdateProps { (view) in
        view.setupImageView()
      }

      Prop("urls") { (view, urls: [String]?) in
        view.urls = urls
      }

      Prop("items") { (view, items: [[String: Any]]?) in
        view.items = items
      }

      Prop("index") { (view, index: Int?) in
        view.initialIndex = index
      }

      Prop("previewGroupId") { (view, previewGroupId: String?) in
        view.previewGroupId = previewGroupId
      }

      Prop("theme") { (view, theme: Theme?) in
        view.theme = theme ?? .dark
      }
      Prop("closeIconName") { (view, closeIconName: String?) in
        view.closeIconName = closeIconName
      }
      Prop("rightNavItemIconName") { (view, rightNavItemIconName: String) in
        view.rightNavItemIconName = rightNavItemIconName
      }

    }
  }

  func onIndexChange(index: Int) {
    sendEvent("onIndexChange", ["currentIndex": index])
  }
}
