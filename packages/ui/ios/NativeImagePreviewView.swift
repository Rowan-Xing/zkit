import ExpoModulesCore
import UIKit

class NativeImagePreviewView: ExpoView {
  private var childImageView: UIImageView?
  private weak var registeredAnchorImageView: UIImageView?
  private var registeredPreviewGroupId: String?
  private var registeredIndex: Int?

  deinit {
    unregisterCurrentAnchor()
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil {
      unregisterCurrentAnchor()
    } else {
      registerCurrentAnchorIfNeeded()
    }
  }

  func getChildImageView() -> UIImageView? {
    var reactSubviews: [UIView]? = nil
    if RCTIsNewArchEnabled() {
      reactSubviews = self.subviews
    } else {
      reactSubviews = self.reactSubviews()
    }

    guard let reactSubviews = reactSubviews else { return nil }

    for reactSubview in reactSubviews {
      if let iv = findImageView(in: reactSubview) {
        childImageView = iv
        return iv
      }
    }

    return nil
  }

  private func findImageView(in view: UIView) -> UIImageView? {
    if let imageView = view as? UIImageView { return imageView }
    for subview in view.subviews {
      if let imageView = subview as? UIImageView { return imageView }
      if let nested = findImageView(in: subview) { return nested }
    }
    return nil
  }

  #if !RCT_NEW_ARCH_ENABLED
    override func insertReactSubview(_ subview: UIView!, at atIndex: Int) {
      super.insertReactSubview(subview, at: atIndex)
      setupImageView()
    }
  #endif

  #if RCT_NEW_ARCH_ENABLED
    // Cleanup gesture recognizers from the image view to work with Fabric view recycling.
    override func unmountChildComponentView(_ childComponentView: UIView, index: Int) {
      unregisterCurrentAnchor()
      childImageView?.removeNativeImagePreviewViewerInteraction()
      childImageView = nil
      super.unmountChildComponentView(childComponentView, index: index)
    }
  #endif

  var theme: Theme = .dark
  var urls: [String]?
  var items: [[String: Any]]?
  var initialIndex: Int?
  var previewGroupId: String?
  var closeIconName: String?
  var rightNavItemIconName: String?
  let onPressRightNavItemIcon = EventDispatcher()
  let onIndexChange = EventDispatcher()

  public func setupImageView() {
    registerCurrentAnchorIfNeeded()
    guard let childImage = getChildImageView() else {
      return
    }

    if let items = self.items, let initialIndex = self.initialIndex {
      setupViewerWithItems(childImage, items: items, initialIndex: initialIndex)
    } else if let urls = self.urls, let initialIndex = self.initialIndex {
      setupViewerWithUrls(childImage, urls: urls, initialIndex: initialIndex)
    } else {
      setupViewerWithSingleImage(childImage)
    }
  }

  private func setupViewerWithItems(
    _ childImage: UIImageView,
    items: [[String: Any]],
    initialIndex: Int
  ) {
    let configuration = buildViewerConfiguration()

    let imageItems: [NativeImagePreviewMediaItem] = items.compactMap { item in
        guard let type = item["type"] as? String else { return nil }

        if type == "video", let urlStr = item["url"] as? String, let url = URL(string: urlStr) {
            var posterUrl: URL? = nil
            if let posterStr = item["poster"] as? String {
                posterUrl = URL(string: posterStr)
            }
            return NativeImagePreviewMediaItem.video(url: url, poster: posterUrl)
        } else if type == "image", let urlStr = item["url"] as? String {
             if urlStr.hasPrefix("http://") || urlStr.hasPrefix("https://") || urlStr.hasPrefix("file://") {
                if let url = URL(string: urlStr) {
                    return NativeImagePreviewMediaItem.imageURL(url, placeholder: nil)
                }
             } else {
                return NativeImagePreviewMediaItem.imageURL(URL(fileURLWithPath: urlStr), placeholder: nil)
             }
        }
        return nil
    }

    let datasource = NativeImagePreviewArrayDataSource(items: imageItems)
    childImage.setupNativeImagePreviewViewer(
      dataSource: datasource,
      initialIndex: initialIndex,
      configuration: configuration,
      previewGroupId: previewGroupId)
  }


  private func setupViewerWithUrls(
    _ childImage: UIImageView,
    urls: [String],
    initialIndex: Int
  ) {
    let configuration = buildViewerConfiguration()

    let urlObjects: [URL] = urls.compactMap { string in
      if string.hasPrefix("http://") || string.hasPrefix("https://") || string.hasPrefix("file://") {
        return URL(string: string)
      }
      return URL(fileURLWithPath: string)
    }

    childImage.setupNativeImagePreviewViewer(
      urls: urlObjects,
      initialIndex: initialIndex,
      configuration: configuration,
      previewGroupId: previewGroupId)
  }

  private func setupViewerWithSingleImage(_ childImage: UIImageView) {
    guard let img = childImage.image else {
      print("Missing image in childImage: \(childImage)")
      return
    }
    let configuration = buildViewerConfiguration()

    childImage.setupNativeImagePreviewViewer(images: [img], configuration: configuration, previewGroupId: previewGroupId)
  }

  private func buildViewerConfiguration() -> NativeImagePreviewViewerConfiguration {
    var configuration = NativeImagePreviewViewerConfiguration(theme: theme.toViewerTheme())
    let iconColor = theme.iconColor()

    if let closeIconName = closeIconName,
      let closeIconImage = UIImage(systemName: closeIconName)?.withTintColor(
        iconColor, renderingMode: .alwaysOriginal)
    {
      configuration.closeIcon = closeIconImage
    }

    if let rightIconName = rightNavItemIconName,
      let rightIconImage = UIImage(systemName: rightIconName)?.withTintColor(
        iconColor, renderingMode: .alwaysOriginal)
    {
      configuration.rightBarButton = .icon(
        rightIconImage,
        onTap: { index in
          self.onPressRightNavItemIcon(["index": index])
        })
    }

    configuration.onIndexChange = { [weak self] index in
      self?.onIndexChange(["currentIndex": index])
    }
    return configuration
  }

  private func registerCurrentAnchorIfNeeded() {
    guard
      window != nil,
      let previewGroupId,
      let initialIndex,
      let childImage = getChildImageView()
    else {
      unregisterCurrentAnchor()
      return
    }

    if
      let registeredAnchorImageView,
      (registeredAnchorImageView !== childImage
        || registeredPreviewGroupId != previewGroupId
        || registeredIndex != initialIndex)
    {
      unregisterCurrentAnchor()
    }

    NativeImagePreviewSourceViewRegistry.shared.register(
      childImage,
      previewGroupId: previewGroupId,
      index: initialIndex)
    registeredAnchorImageView = childImage
    registeredPreviewGroupId = previewGroupId
    registeredIndex = initialIndex
  }

  private func unregisterCurrentAnchor() {
    if let registeredAnchorImageView = registeredAnchorImageView {
      NativeImagePreviewSourceViewRegistry.shared.unregister(
        registeredAnchorImageView,
        previewGroupId: registeredPreviewGroupId,
        index: registeredIndex)
    }
    registeredAnchorImageView = nil
    registeredPreviewGroupId = nil
    registeredIndex = nil
  }
}

enum Theme: String, Enumerable {
  case dark
  case light

  func toViewerTheme() -> NativeImagePreviewViewerTheme {
    switch self {
    case .dark:
      return .dark
    case .light:
      return .light
    }
  }
  func iconColor() -> UIColor {
    switch self {
    case .dark:
      return .white
    case .light:
      return .black
    }
  }
}
