import ObjectiveC
import UIKit

extension UIImageView {
    private struct GaleriaAnchorRegistration {
        let galleryId: String
        let index: Int
    }

    private final class GaleriaTapGestureRecognizer: UITapGestureRecognizer {
        weak var fromViewController: UIViewController?
        var dataSource: GaleriaDataSource?
        var imageLoader: GaleriaImageLoading?
        var initialIndex = 0
        var galleryId: String?
        var configuration = GaleriaViewerConfiguration()
    }

    private static var anchorRegistrationKey: UInt8 = 0
    private static var gestureRecognizerKey: UInt8 = 0

    private var topMostHostViewController: UIViewController? {
        let keyWindow: UIWindow? = {
            if #available(iOS 13.0, *) {
                let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
                let activeScene = scenes.first(where: { $0.activationState == .foregroundActive }) ?? scenes.first
                return activeScene?.windows.first(where: { $0.isKeyWindow }) ?? activeScene?.windows.first
            } else {
                return UIApplication.shared.windows.first(where: { $0.isKeyWindow }) ?? UIApplication.shared.windows.first
            }
        }()
        guard let rootViewController = keyWindow?.rootViewController else { return nil }
        return rootViewController.presentedViewController ?? rootViewController
    }

    public func setupGaleriaViewer(
        configuration: GaleriaViewerConfiguration = GaleriaViewerConfiguration(),
        from viewController: UIViewController? = nil,
        imageLoader: GaleriaImageLoading? = nil,
        galleryId: String? = nil
    ) {
        configureGaleriaViewer(
            dataSource: GaleriaArrayDataSource(items: [.image(image)]),
            initialIndex: 0,
            configuration: configuration,
            from: viewController,
            imageLoader: imageLoader,
            galleryId: galleryId
        )
    }

    public func setupGaleriaViewer(
        url: URL,
        initialIndex: Int = 0,
        placeholder: UIImage? = nil,
        configuration: GaleriaViewerConfiguration = GaleriaViewerConfiguration(),
        from viewController: UIViewController? = nil,
        imageLoader: GaleriaImageLoading? = nil,
        galleryId: String? = nil
    ) {
        configureGaleriaViewer(
            dataSource: GaleriaArrayDataSource(items: [.imageURL(url, placeholder: placeholder)]),
            initialIndex: initialIndex,
            configuration: configuration,
            from: viewController,
            imageLoader: imageLoader,
            galleryId: galleryId
        )
    }

    public func setupGaleriaViewer(
        images: [UIImage],
        initialIndex: Int = 0,
        configuration: GaleriaViewerConfiguration = GaleriaViewerConfiguration(),
        from viewController: UIViewController? = nil,
        imageLoader: GaleriaImageLoading? = nil,
        galleryId: String? = nil
    ) {
        let items = images.map { GaleriaMediaItem.image($0) }
        configureGaleriaViewer(
            dataSource: GaleriaArrayDataSource(items: items),
            initialIndex: initialIndex,
            configuration: configuration,
            from: viewController,
            imageLoader: imageLoader,
            galleryId: galleryId
        )
    }

    public func setupGaleriaViewer(
        urls: [URL],
        initialIndex: Int = 0,
        placeholder: UIImage? = nil,
        configuration: GaleriaViewerConfiguration = GaleriaViewerConfiguration(),
        from viewController: UIViewController? = nil,
        imageLoader: GaleriaImageLoading? = nil,
        galleryId: String? = nil
    ) {
        let items = urls.map { GaleriaMediaItem.imageURL($0, placeholder: placeholder) }
        configureGaleriaViewer(
            dataSource: GaleriaArrayDataSource(items: items),
            initialIndex: initialIndex,
            configuration: configuration,
            from: viewController,
            imageLoader: imageLoader,
            galleryId: galleryId
        )
    }

    public func setupGaleriaViewer(
        dataSource: GaleriaDataSource,
        initialIndex: Int = 0,
        configuration: GaleriaViewerConfiguration = GaleriaViewerConfiguration(),
        from viewController: UIViewController? = nil,
        imageLoader: GaleriaImageLoading? = nil,
        galleryId: String? = nil
    ) {
        configureGaleriaViewer(
            dataSource: dataSource,
            initialIndex: initialIndex,
            configuration: configuration,
            from: viewController,
            imageLoader: imageLoader,
            galleryId: galleryId
        )
    }

    func removeGaleriaViewerInteraction() {
        if let recognizer = galeriaTapGestureRecognizer {
            removeGestureRecognizer(recognizer)
        }
        galeriaTapGestureRecognizer = nil

        if let registration = galeriaAnchorRegistration {
            GaleriaSourceViewRegistry.shared.unregister(
                self,
                galleryId: registration.galleryId,
                index: registration.index
            )
        }
        galeriaAnchorRegistration = nil
    }

    private func configureGaleriaViewer(
        dataSource: GaleriaDataSource?,
        initialIndex: Int,
        configuration: GaleriaViewerConfiguration,
        from viewController: UIViewController?,
        imageLoader: GaleriaImageLoading?,
        galleryId: String?
    ) {
        let recognizer = galeriaTapGestureRecognizer ?? {
            let recognizer = GaleriaTapGestureRecognizer(target: self, action: #selector(showGaleriaViewer(_:)))
            recognizer.numberOfTouchesRequired = 1
            recognizer.numberOfTapsRequired = 1
            galeriaTapGestureRecognizer = recognizer
            return recognizer
        }()

        isUserInteractionEnabled = true
        clipsToBounds = true

        recognizer.dataSource = dataSource
        recognizer.imageLoader = imageLoader
        recognizer.initialIndex = initialIndex
        recognizer.galleryId = galleryId
        recognizer.configuration = configuration
        recognizer.fromViewController = viewController

        if recognizer.view !== self {
            addGestureRecognizer(recognizer)
        }

        updateGaleriaAnchorRegistration(galleryId: galleryId, index: initialIndex)
    }

    private var galeriaTapGestureRecognizer: GaleriaTapGestureRecognizer? {
        get {
            objc_getAssociatedObject(self, &Self.gestureRecognizerKey) as? GaleriaTapGestureRecognizer
        }
        set {
            objc_setAssociatedObject(
                self,
                &Self.gestureRecognizerKey,
                newValue,
                .OBJC_ASSOCIATION_RETAIN_NONATOMIC
            )
        }
    }

    private var galeriaAnchorRegistration: GaleriaAnchorRegistration? {
        get {
            objc_getAssociatedObject(self, &Self.anchorRegistrationKey) as? GaleriaAnchorRegistration
        }
        set {
            objc_setAssociatedObject(
                self,
                &Self.anchorRegistrationKey,
                newValue,
                .OBJC_ASSOCIATION_RETAIN_NONATOMIC
            )
        }
    }

    @objc
    private func showGaleriaViewer(_ recognizer: GaleriaTapGestureRecognizer) {
        guard let sourceView = recognizer.view as? UIImageView else { return }
        let resolvedImageLoader = recognizer.imageLoader ?? GaleriaImageLoaderFactory.makeDefault()
        let viewerController = GaleriaViewerController(
            sourceView: sourceView,
            dataSource: recognizer.dataSource,
            imageLoader: resolvedImageLoader,
            configuration: recognizer.configuration,
            initialIndex: recognizer.initialIndex,
            galleryId: recognizer.galleryId
        )

        let rootViewController = recognizer.fromViewController ?? topMostHostViewController
        let presenter = rootViewController.flatMap(topMostPresentedController(from:))
        presenter?.present(viewerController, animated: false)
    }

    private func topMostPresentedController(from rootViewController: UIViewController) -> UIViewController {
        var controller = rootViewController
        while let presented = controller.presentedViewController {
            controller = presented
        }
        return controller
    }

    private func updateGaleriaAnchorRegistration(galleryId: String?, index: Int) {
        if let existing = galeriaAnchorRegistration {
            GaleriaSourceViewRegistry.shared.unregister(
                self,
                galleryId: existing.galleryId,
                index: existing.index
            )
            galeriaAnchorRegistration = nil
        }

        guard let galleryId = galleryId, galleryId.isEmpty == false else { return }
        GaleriaSourceViewRegistry.shared.register(self, galleryId: galleryId, index: index)
        galeriaAnchorRegistration = GaleriaAnchorRegistration(galleryId: galleryId, index: index)
    }
}
