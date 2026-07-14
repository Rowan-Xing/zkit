import UIKit

struct GaleriaSharedElementGeometry {
    let visibleFrameInWindow: CGRect
    let contentFrameInVisibleBounds: CGRect
    let cornerRadius: CGFloat
}

struct GaleriaSharedElementState {
    let image: UIImage
    let geometry: GaleriaSharedElementGeometry
}

extension CGRect {
    func galeriaPixelAligned(scale: CGFloat) -> CGRect {
        guard scale > 0 else { return self }
        return CGRect(
            x: (origin.x * scale).rounded() / scale,
            y: (origin.y * scale).rounded() / scale,
            width: (size.width * scale).rounded() / scale,
            height: (size.height * scale).rounded() / scale
        )
    }

    func galeriaApproximatelyEquals(_ other: CGRect, tolerance: CGFloat = 0.5) -> Bool {
        abs(minX - other.minX) <= tolerance
            && abs(minY - other.minY) <= tolerance
            && abs(width - other.width) <= tolerance
            && abs(height - other.height) <= tolerance
    }
}

extension GaleriaSharedElementGeometry {
    func galeriaPixelAligned(scale: CGFloat) -> GaleriaSharedElementGeometry {
        GaleriaSharedElementGeometry(
            visibleFrameInWindow: visibleFrameInWindow.galeriaPixelAligned(scale: scale),
            contentFrameInVisibleBounds: contentFrameInVisibleBounds.galeriaPixelAligned(scale: scale),
            cornerRadius: (cornerRadius * scale).rounded() / scale
        )
    }

    func approximatelyEquals(_ other: GaleriaSharedElementGeometry, tolerance: CGFloat = 0.5) -> Bool {
        visibleFrameInWindow.galeriaApproximatelyEquals(other.visibleFrameInWindow, tolerance: tolerance)
            && contentFrameInVisibleBounds.galeriaApproximatelyEquals(
                other.contentFrameInVisibleBounds,
                tolerance: tolerance
            )
            && abs(cornerRadius - other.cornerRadius) <= tolerance
    }
}

extension GaleriaSharedElementState {
    func approximatelyEquals(_ other: GaleriaSharedElementState, tolerance: CGFloat = 0.5) -> Bool {
        geometry.approximatelyEquals(other.geometry, tolerance: tolerance)
            && abs(image.size.width - other.image.size.width) <= tolerance
            && abs(image.size.height - other.image.size.height) <= tolerance
    }
}

extension UIView {
    func pinToSuperviewEdges(
        top: CGFloat = 0,
        leading: CGFloat = 0,
        trailing: CGFloat = 0,
        bottom: CGFloat = 0
    ) {
        guard let superview = superview else { return }
        translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            topAnchor.constraint(equalTo: superview.topAnchor, constant: top),
            leadingAnchor.constraint(equalTo: superview.leadingAnchor, constant: leading),
            trailingAnchor.constraint(equalTo: superview.trailingAnchor, constant: -trailing),
            bottomAnchor.constraint(equalTo: superview.bottomAnchor, constant: -bottom),
        ])
    }

    func pinToSuperviewEdges(inset: CGFloat) {
        pinToSuperviewEdges(top: inset, leading: inset, trailing: inset, bottom: inset)
    }

    func frameInWindow() -> CGRect {
        convert(bounds, to: nil)
    }
}

extension UIImageView {
    func imageContentFrameInWindow() -> CGRect {
        guard let image = image else { return frameInWindow() }
        guard image.size.width > 0, image.size.height > 0 else { return frameInWindow() }
        guard bounds.width > 0, bounds.height > 0 else { return frameInWindow() }

        let widthRatio = bounds.width / image.size.width
        let heightRatio = bounds.height / image.size.height

        let scale: CGFloat
        switch contentMode {
        case .scaleAspectFill:
            scale = max(widthRatio, heightRatio)
        default:
            scale = min(widthRatio, heightRatio)
        }

        let contentSize = CGSize(
            width: image.size.width * scale,
            height: image.size.height * scale
        )
        let contentFrame = CGRect(
            x: (bounds.width - contentSize.width) * 0.5,
            y: (bounds.height - contentSize.height) * 0.5,
            width: contentSize.width,
            height: contentSize.height
        )
        return convert(contentFrame, to: nil)
    }

    func galeriaSharedElementState(clippingFrameInWindow: CGRect? = nil) -> GaleriaSharedElementState? {
        guard let image = image else { return nil }
        guard image.size.width > 0, image.size.height > 0 else { return nil }

        let clippingFrame = clippingFrameInWindow ?? frameInWindow()
        guard clippingFrame.width > 0, clippingFrame.height > 0 else { return nil }

        let contentFrame = imageContentFrameInWindow()
        var visibleFrame = clippingFrame.intersection(contentFrame)
        if visibleFrame.isNull || visibleFrame.isEmpty {
            visibleFrame = clippingFrame
        }

        let geometry = GaleriaSharedElementGeometry(
            visibleFrameInWindow: visibleFrame,
            contentFrameInVisibleBounds: contentFrame.offsetBy(
                dx: -visibleFrame.minX,
                dy: -visibleFrame.minY
            ),
            cornerRadius: (clipsToBounds || layer.masksToBounds) ? layer.cornerRadius : 0
        )
        let scale = window?.screen.scale ?? UIScreen.main.scale
        return GaleriaSharedElementState(
            image: image,
            geometry: geometry.galeriaPixelAligned(scale: scale)
        )
    }
}
