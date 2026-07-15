package cn.fontree.zkit.ui.preview;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

public final class NativeImagePreviewSharedElementNames {
    private static final String PREFIX = "zkit-native-image-preview:media:";

    private NativeImagePreviewSharedElementNames() {
    }

    @NonNull
    public static String forItem(@NonNull NativeImagePreviewMediaItem item) {
        return forItem(null, item);
    }

    @NonNull
    public static String forItem(@Nullable String previewGroupId, @NonNull NativeImagePreviewMediaItem item) {
        return forId(previewGroupId, item.getId());
    }

    @NonNull
    public static String forIndex(int index) {
        return forIndex(null, index);
    }

    @NonNull
    public static String forIndex(@Nullable String previewGroupId, int index) {
        return forId(previewGroupId, String.valueOf(index));
    }

    @NonNull
    private static String forId(@Nullable String previewGroupId, @NonNull String id) {
        if (previewGroupId == null || previewGroupId.isEmpty()) {
            return PREFIX + id;
        }
        return PREFIX + previewGroupId + ":" + id;
    }
}
