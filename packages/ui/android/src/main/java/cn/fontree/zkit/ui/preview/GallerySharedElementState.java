package cn.fontree.zkit.ui.preview;

import android.graphics.drawable.Drawable;

import androidx.annotation.NonNull;

public final class GallerySharedElementState {
    private final Drawable drawable;
    private final GallerySharedElementGeometry geometry;

    public GallerySharedElementState(@NonNull Drawable drawable, @NonNull GallerySharedElementGeometry geometry) {
        this.drawable = drawable;
        this.geometry = geometry;
    }

    @NonNull
    public Drawable getDrawable() {
        return drawable;
    }

    @NonNull
    public GallerySharedElementGeometry getGeometry() {
        return geometry;
    }
}
