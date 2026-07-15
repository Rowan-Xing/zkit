import UIKit

final class NativeImagePreviewSourceViewRegistry {
    static let shared = NativeImagePreviewSourceViewRegistry()

    private final class WeakImageView {
        weak var value: UIImageView?

        init(_ value: UIImageView) {
            self.value = value
        }
    }

    private var anchors: [String: [Int: WeakImageView]] = [:]

    private init() {}

    func register(_ imageView: UIImageView, previewGroupId: String, index: Int) {
        cleanup()
        var previewGroupAnchors = anchors[previewGroupId] ?? [:]
        previewGroupAnchors[index] = WeakImageView(imageView)
        anchors[previewGroupId] = previewGroupAnchors
    }

    func unregister(_ imageView: UIImageView, previewGroupId: String?, index: Int?) {
        cleanup()
        if let previewGroupId = previewGroupId {
            remove(imageView, from: previewGroupId, index: index)
        } else {
            for previewGroupId in Array(anchors.keys) {
                remove(imageView, from: previewGroupId, index: nil)
            }
        }
        cleanup()
    }

    func sourceView(for previewGroupId: String, index: Int) -> UIImageView? {
        cleanup()
        guard
            let imageView = anchors[previewGroupId]?[index]?.value,
            let window = imageView.window,
            !imageView.isHidden
        else {
            return nil
        }

        let frameInWindow = imageView.frameInWindow()
        guard !frameInWindow.isEmpty, frameInWindow.intersects(window.bounds) else {
            return nil
        }

        return imageView
    }

    private func remove(_ imageView: UIImageView, from previewGroupId: String, index: Int?) {
        guard var previewGroupAnchors = anchors[previewGroupId] else { return }

        if let index = index {
            if let registeredView = previewGroupAnchors[index]?.value, registeredView === imageView {
                previewGroupAnchors.removeValue(forKey: index)
            }
        } else {
            previewGroupAnchors = previewGroupAnchors.filter { _, weakImageView in
                guard let registeredView = weakImageView.value else { return false }
                return registeredView !== imageView
            }
        }

        anchors[previewGroupId] = previewGroupAnchors.isEmpty ? nil : previewGroupAnchors
    }

    private func cleanup() {
        anchors = anchors.compactMapValues { previewGroupAnchors in
            let activeAnchors = previewGroupAnchors.filter { _, weakImageView in
                weakImageView.value != nil
            }
            return activeAnchors.isEmpty ? nil : activeAnchors
        }
    }
}
