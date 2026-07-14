package cn.fontree.zkit.ui.preview;

public class GalleryMediaItem {
    public enum MediaType {
        IMAGE,
        VIDEO
    }

    private final String id;
    private final MediaType mediaType;
    private final String sourceUrl;
    private final String thumbnailUrl;

    public GalleryMediaItem(String id, MediaType mediaType, String sourceUrl, String thumbnailUrl) {
        this.id = id;
        this.mediaType = mediaType;
        this.sourceUrl = sourceUrl;
        this.thumbnailUrl = thumbnailUrl;
    }

    public String getId() {
        return id;
    }

    public MediaType getMediaType() {
        return mediaType;
    }

    public String getSourceUrl() {
        return sourceUrl;
    }

    public String getThumbnailUrl() {
        return thumbnailUrl;
    }
}
