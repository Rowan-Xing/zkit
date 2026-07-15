import Foundation
import UIKit
#if canImport(SDWebImage)
import SDWebImage
#endif

public protocol NativeImagePreviewImageLoading {
    func loadImage(
        _ url: URL,
        placeholder: UIImage?,
        imageView: UIImageView,
        completion: @escaping (_ image: UIImage?) -> Void
    )
}

public struct NativeImagePreviewURLSessionImageLoader: NativeImagePreviewImageLoading {
    public init() {}

    public func loadImage(
        _ url: URL,
        placeholder: UIImage?,
        imageView: UIImageView,
        completion: @escaping (UIImage?) -> Void
    ) {
        if let placeholder = placeholder {
            imageView.image = placeholder
        }

        DispatchQueue.global(qos: .background).async {
            guard let data = try? Data(contentsOf: url), let image = UIImage(data: data) else {
                completion(nil)
                return
            }

            DispatchQueue.main.async {
                imageView.image = image
                completion(image)
            }
        }
    }
}

#if canImport(SDWebImage)
struct NativeImagePreviewSDWebImageLoader: NativeImagePreviewImageLoading {
    func loadImage(
        _ url: URL,
        placeholder: UIImage?,
        imageView: UIImageView,
        completion: @escaping (UIImage?) -> Void
    ) {
        imageView.sd_setImage(
            with: url,
            placeholderImage: placeholder,
            options: [],
            progress: nil
        ) { image, _, _, _ in
            DispatchQueue.main.async {
                completion(image)
            }
        }
    }
}
#endif

public enum NativeImagePreviewImageLoaderFactory {
    public static func makeDefault() -> NativeImagePreviewImageLoading {
        #if canImport(SDWebImage)
        return NativeImagePreviewSDWebImageLoader()
        #else
        return NativeImagePreviewURLSessionImageLoader()
        #endif
    }
}
