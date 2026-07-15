import ObjectiveC
import UIKit

extension UIImageView {
    private struct NativeImagePreviewAnchorRegistration {
        let previewGroupId: String
        let index: Int
    }

    private final class NativeImagePreviewTapGestureRecognizer: UITapGestureRecognizer {
        weak var fromViewController: UIViewController?
        var dataSource: NativeImagePreviewDataSource?
        var imageLoader: NativeImagePreviewImageLoading?
        var initialIndex = 0
        var previewGroupId: String?
        var configuration = NativeImagePreviewViewerConfiguration()
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

    public func setupNativeImagePreviewViewer(
        configuration: NativeImagePreviewViewerConfiguration = NativeImagePreviewViewerConfiguration(),
        from viewController: UIViewController? = nil,
        imageLoader: NativeImagePreviewImageLoading? = nil,
        previewGroupId: String? = nil
    ) {
        configureNativeImagePreviewViewer(
            dataSource: NativeImagePreviewArrayDataSource(items: [.image(image)]),
            initialIndex: 0,
            configuration: configuration,
            from: viewController,
            imageLoader: imageLoader,
            previewGroupId: previewGroupId
        )
    }

    public func setupNativeImagePreviewViewer(
        url: URL,
        initialIndex: Int = 0,
        placeholder: UIImage? = nil,
        configuration: NativeImagePreviewViewerConfiguration = NativeImagePreviewViewerConfiguration(),
        from viewController: UIViewController? = nil,
        imageLoader: NativeImagePreviewImageLoading? = nil,
        previewGroupId: String? = nil
    ) {
        configureNativeImagePreviewViewer(
            dataSource: NativeImagePreviewArrayDataSource(items: [.imageURL(url, placeholder: placeholder)]),
            initialIndex: initialIndex,
            configuration: configuration,
            from: viewController,
            imageLoader: imageLoader,
            previewGroupId: previewGroupId
        )
    }

    public func setupNativeImagePreviewViewer(
        images: [UIImage],
        initialIndex: Int = 0,
        configuration: NativeImagePreviewViewerConfiguration = NativeImagePreviewViewerConfiguration(),
        from viewController: UIViewController? = nil,
        imageLoader: NativeImagePreviewImageLoading? = nil,
        previewGroupId: String? = nil
    ) {
        let items = images.map { NativeImagePreviewMediaItem.image($0) }
        configureNativeImagePreviewViewer(
            dataSource: NativeImagePreviewArrayDataSource(items: items),
            initialIndex: initialIndex,
            configuration: configuration,
            from: viewController,
            imageLoader: imageLoader,
            previewGroupId: previewGroupId
        )
    }

    public func setupNativeImagePreviewViewer(
        urls: [URL],
        initialIndex: Int = 0,
        placeholder: UIImage? = nil,
        configuration: NativeImagePreviewViewerConfiguration = NativeImagePreviewViewerConfiguration(),
        from viewController: UIViewController? = nil,
        imageLoader: NativeImagePreviewImageLoading? = nil,
        previewGroupId: String? = nil
    ) {
        let items = urls.map { NativeImagePreviewMediaItem.imageURL($0, placeholder: placeholder) }
        configureNativeImagePreviewViewer(
            dataSource: NativeImagePreviewArrayDataSource(items: items),
            initialIndex: initialIndex,
            configuration: configuration,
            from: viewController,
            imageLoader: imageLoader,
            previewGroupId: previewGroupId
        )
    }

    public func setupNativeImagePreviewViewer(
        dataSource: NativeImagePreviewDataSource,
        initialIndex: Int = 0,
        configuration: NativeImagePreviewViewerConfiguration = NativeImagePreviewViewerConfiguration(),
        from viewController: UIViewController? = nil,
        imageLoader: NativeImagePreviewImageLoading? = nil,
        previewGroupId: String? = nil
    ) {
        configureNativeImagePreviewViewer(
            dataSource: dataSource,
            initialIndex: initialIndex,
            configuration: configuration,
            from: viewController,
            imageLoader: imageLoader,
            previewGroupId: previewGroupId
        )
    }

    func removeNativeImagePreviewViewerInteraction() {
        if let recognizer = nativeImagePreviewTapGestureRecognizer {
            removeGestureRecognizer(recognizer)
        }
        nativeImagePreviewTapGestureRecognizer = nil

        if let registration = nativeImagePreviewAnchorRegistration {
            NativeImagePreviewSourceViewRegistry.shared.unregister(
                self,
                previewGroupId: registration.previewGroupId,
                index: registration.index
            )
        }
        nativeImagePreviewAnchorRegistration = nil
    }

    private func configureNativeImagePreviewViewer(
        dataSource: NativeImagePreviewDataSource?,
        initialIndex: Int,
        configuration: NativeImagePreviewViewerConfiguration,
        from viewController: UIViewController?,
        imageLoader: NativeImagePreviewImageLoading?,
        previewGroupId: String?
    ) {
        let recognizer = nativeImagePreviewTapGestureRecognizer ?? {
            let recognizer = NativeImagePreviewTapGestureRecognizer(target: self, action: #selector(showNativeImagePreviewViewer(_:)))
            recognizer.numberOfTouchesRequired = 1
            recognizer.numberOfTapsRequired = 1
            nativeImagePreviewTapGestureRecognizer = recognizer
            return recognizer
        }()

        isUserInteractionEnabled = true
        clipsToBounds = true

        recognizer.dataSource = dataSource
        recognizer.imageLoader = imageLoader
        recognizer.initialIndex = initialIndex
        recognizer.previewGroupId = previewGroupId
        recognizer.configuration = configuration
        recognizer.fromViewController = viewController

        if recognizer.view !== self {
            addGestureRecognizer(recognizer)
        }

        updateNativeImagePreviewAnchorRegistration(previewGroupId: previewGroupId, index: initialIndex)
    }

    private var nativeImagePreviewTapGestureRecognizer: NativeImagePreviewTapGestureRecognizer? {
        get {
            objc_getAssociatedObject(self, &Self.gestureRecognizerKey) as? NativeImagePreviewTapGestureRecognizer
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

    private var nativeImagePreviewAnchorRegistration: NativeImagePreviewAnchorRegistration? {
        get {
            objc_getAssociatedObject(self, &Self.anchorRegistrationKey) as? NativeImagePreviewAnchorRegistration
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
    private func showNativeImagePreviewViewer(_ recognizer: NativeImagePreviewTapGestureRecognizer) {
        guard let sourceView = recognizer.view as? UIImageView else { return }
        let resolvedImageLoader = recognizer.imageLoader ?? NativeImagePreviewImageLoaderFactory.makeDefault()
        let viewerController = NativeImagePreviewViewerController(
            sourceView: sourceView,
            dataSource: recognizer.dataSource,
            imageLoader: resolvedImageLoader,
            configuration: recognizer.configuration,
            initialIndex: recognizer.initialIndex,
            previewGroupId: recognizer.previewGroupId
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

    private func updateNativeImagePreviewAnchorRegistration(previewGroupId: String?, index: Int) {
        if let existing = nativeImagePreviewAnchorRegistration {
            NativeImagePreviewSourceViewRegistry.shared.unregister(
                self,
                previewGroupId: existing.previewGroupId,
                index: existing.index
            )
            nativeImagePreviewAnchorRegistration = nil
        }

        guard let previewGroupId = previewGroupId, previewGroupId.isEmpty == false else { return }
        NativeImagePreviewSourceViewRegistry.shared.register(self, previewGroupId: previewGroupId, index: index)
        nativeImagePreviewAnchorRegistration = NativeImagePreviewAnchorRegistration(previewGroupId: previewGroupId, index: index)
    }
}
