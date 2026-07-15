package cn.fontree.zkit.ui.preview;

import android.graphics.drawable.Drawable;

import androidx.annotation.NonNull;

public final class NativeImagePreviewSharedElementState {
    private final Drawable drawable;
    private final NativeImagePreviewSharedElementGeometry geometry;

    public NativeImagePreviewSharedElementState(@NonNull Drawable drawable, @NonNull NativeImagePreviewSharedElementGeometry geometry) {
        this.drawable = drawable;
        this.geometry = geometry;
    }

    @NonNull
    public Drawable getDrawable() {
        return drawable;
    }

    @NonNull
    public NativeImagePreviewSharedElementGeometry getGeometry() {
        return geometry;
    }
}
