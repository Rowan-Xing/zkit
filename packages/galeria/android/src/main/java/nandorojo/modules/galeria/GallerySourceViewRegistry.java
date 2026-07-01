package nandorojo.modules.galeria;

import android.widget.ImageView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.view.ViewCompat;

import java.lang.ref.WeakReference;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

public final class GallerySourceViewRegistry {
    private static final Map<String, WeakReference<ImageView>> SOURCE_VIEWS = new HashMap<>();

    private GallerySourceViewRegistry() {
    }

    public static synchronized void register(@NonNull String key, @NonNull ImageView imageView) {
        cleanupLocked();
        clearMappingsForViewLocked(imageView);
        SOURCE_VIEWS.put(key, new WeakReference<>(imageView));
        ViewCompat.setTransitionName(imageView, key);
    }

    public static synchronized void unregisterView(@NonNull ImageView imageView) {
        clearMappingsForViewLocked(imageView);
    }

    @Nullable
    public static synchronized ImageView find(@NonNull String key) {
        cleanupLocked();
        WeakReference<ImageView> reference = SOURCE_VIEWS.get(key);
        if (reference == null) {
            return null;
        }
        ImageView imageView = reference.get();
        if (imageView == null || !imageView.isAttachedToWindow()) {
            SOURCE_VIEWS.remove(key);
            return null;
        }
        return imageView;
    }

    private static void clearMappingsForViewLocked(@NonNull ImageView imageView) {
        Iterator<Map.Entry<String, WeakReference<ImageView>>> iterator = SOURCE_VIEWS.entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry<String, WeakReference<ImageView>> entry = iterator.next();
            ImageView mappedView = entry.getValue().get();
            if (mappedView == null || mappedView == imageView) {
                iterator.remove();
            }
        }
    }

    private static void cleanupLocked() {
        Iterator<Map.Entry<String, WeakReference<ImageView>>> iterator = SOURCE_VIEWS.entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry<String, WeakReference<ImageView>> entry = iterator.next();
            ImageView mappedView = entry.getValue().get();
            if (mappedView == null) {
                iterator.remove();
            }
        }
    }
}
