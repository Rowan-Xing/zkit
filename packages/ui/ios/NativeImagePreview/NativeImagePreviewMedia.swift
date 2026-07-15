import UIKit

public enum NativeImagePreviewMediaItem {
    case image(UIImage?)
    case imageURL(URL, placeholder: UIImage?)
    case video(url: URL, poster: URL?)
}

public protocol NativeImagePreviewDataSource: AnyObject {
    func numberOfItems() -> Int
    func item(at index: Int) -> NativeImagePreviewMediaItem
}

public final class NativeImagePreviewArrayDataSource: NativeImagePreviewDataSource {
    private let items: [NativeImagePreviewMediaItem]

    public init(items: [NativeImagePreviewMediaItem]) {
        self.items = items
    }

    public func numberOfItems() -> Int {
        items.count
    }

    public func item(at index: Int) -> NativeImagePreviewMediaItem {
        items[index]
    }
}
