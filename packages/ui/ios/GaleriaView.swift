import ExpoModulesCore
import UIKit

class GaleriaView: ExpoView {
  private var childImageView: UIImageView?
  private weak var registeredAnchorImageView: UIImageView?
  private var registeredGalleryId: String?
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
    // https://github.com/nandorojo/galeria/issues/19
    // Cleanup gesture recognizers from the image view to work with fabric view recycling
    override func unmountChildComponentView(_ childComponentView: UIView, index: Int) {
      unregisterCurrentAnchor()
      childImageView?.removeGaleriaViewerInteraction()
      childImageView = nil
      super.unmountChildComponentView(childComponentView, index: index)
    }
  #endif

  var theme: Theme = .dark
  var urls: [String]?
  var items: [[String: Any]]?
  var initialIndex: Int?
  var galleryId: String?
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

    let imageItems: [GaleriaMediaItem] = items.compactMap { item in
        guard let type = item["type"] as? String else { return nil }

        if type == "video", let urlStr = item["url"] as? String, let url = URL(string: urlStr) {
            var posterUrl: URL? = nil
            if let posterStr = item["poster"] as? String {
                posterUrl = URL(string: posterStr)
            }
            return GaleriaMediaItem.video(url: url, poster: posterUrl)
        } else if type == "image", let urlStr = item["url"] as? String {
             if urlStr.hasPrefix("http://") || urlStr.hasPrefix("https://") || urlStr.hasPrefix("file://") {
                if let url = URL(string: urlStr) {
                    return GaleriaMediaItem.imageURL(url, placeholder: nil)
                }
             } else {
                return GaleriaMediaItem.imageURL(URL(fileURLWithPath: urlStr), placeholder: nil)
             }
        }
        return nil
    }

    let datasource = GaleriaArrayDataSource(items: imageItems)
    childImage.setupGaleriaViewer(
      dataSource: datasource,
      initialIndex: initialIndex,
      configuration: configuration,
      galleryId: galleryId)
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

    childImage.setupGaleriaViewer(
      urls: urlObjects,
      initialIndex: initialIndex,
      configuration: configuration,
      galleryId: galleryId)
  }

  private func setupViewerWithSingleImage(_ childImage: UIImageView) {
    guard let img = childImage.image else {
      print("Missing image in childImage: \(childImage)")
      return
    }
    let configuration = buildViewerConfiguration()

    childImage.setupGaleriaViewer(images: [img], configuration: configuration, galleryId: galleryId)
  }

  private func buildViewerConfiguration() -> GaleriaViewerConfiguration {
    var configuration = GaleriaViewerConfiguration(theme: theme.toViewerTheme())
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
      let galleryId,
      let initialIndex,
      let childImage = getChildImageView()
    else {
      unregisterCurrentAnchor()
      return
    }

    if
      let registeredAnchorImageView,
      (registeredAnchorImageView !== childImage
        || registeredGalleryId != galleryId
        || registeredIndex != initialIndex)
    {
      unregisterCurrentAnchor()
    }

    GaleriaSourceViewRegistry.shared.register(
      childImage,
      galleryId: galleryId,
      index: initialIndex)
    registeredAnchorImageView = childImage
    registeredGalleryId = galleryId
    registeredIndex = initialIndex
  }

  private func unregisterCurrentAnchor() {
    if let registeredAnchorImageView = registeredAnchorImageView {
      GaleriaSourceViewRegistry.shared.unregister(
        registeredAnchorImageView,
        galleryId: registeredGalleryId,
        index: registeredIndex)
    }
    registeredAnchorImageView = nil
    registeredGalleryId = nil
    registeredIndex = nil
  }
}

enum Theme: String, Enumerable {
  case dark
  case light

  func toViewerTheme() -> GaleriaViewerTheme {
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
