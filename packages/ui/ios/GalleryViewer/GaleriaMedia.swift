import UIKit

public enum GaleriaMediaItem {
    case image(UIImage?)
    case imageURL(URL, placeholder: UIImage?)
    case video(url: URL, poster: URL?)
}

public protocol GaleriaDataSource: AnyObject {
    func numberOfItems() -> Int
    func item(at index: Int) -> GaleriaMediaItem
}

public final class GaleriaArrayDataSource: GaleriaDataSource {
    private let items: [GaleriaMediaItem]

    public init(items: [GaleriaMediaItem]) {
        self.items = items
    }

    public func numberOfItems() -> Int {
        items.count
    }

    public func item(at index: Int) -> GaleriaMediaItem {
        items[index]
    }
}
