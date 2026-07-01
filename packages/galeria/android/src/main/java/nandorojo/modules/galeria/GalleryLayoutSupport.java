package nandorojo.modules.galeria;

import android.graphics.Matrix;
import android.graphics.RectF;
import android.graphics.drawable.Drawable;
import android.view.View;
import android.widget.ImageView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.github.chrisbanes.photoview.PhotoView;

public final class GalleryLayoutSupport {
    private GalleryLayoutSupport() {
    }

    @Nullable
    public static GallerySharedElementState captureImageViewState(@Nullable ImageView imageView) {
        return captureImageViewState(imageView, null);
    }

    @Nullable
    public static GallerySharedElementState captureImageViewState(@Nullable ImageView imageView, @Nullable RectF clippingFrameInWindow) {
        if (imageView == null) {
            return null;
        }
        Drawable drawable = imageView.getDrawable();
        if (drawable == null || imageView.getWidth() <= 0 || imageView.getHeight() <= 0) {
            return null;
        }
        Drawable transitionDrawable = cloneDrawable(drawable, imageView);
        if (transitionDrawable == null) {
            return null;
        }

        RectF imageBoundsInWindow = viewBoundsOnScreen(imageView);
        RectF clippingFrame = clippingFrameInWindow != null
                ? new RectF(clippingFrameInWindow)
                : new RectF(imageBoundsInWindow);

        RectF contentFrameInView = resolveDisplayedContentFrame(imageView, drawable);
        if (contentFrameInView == null || contentFrameInView.isEmpty()) {
            return null;
        }

        RectF contentFrameInWindow = new RectF(contentFrameInView);
        int[] location = new int[2];
        imageView.getLocationOnScreen(location);
        contentFrameInWindow.offset(location[0], location[1]);

        RectF visibleFrameInWindow = new RectF();
        boolean intersects = visibleFrameInWindow.setIntersect(clippingFrame, contentFrameInWindow);
        if (!intersects || visibleFrameInWindow.isEmpty()) {
            visibleFrameInWindow = new RectF(clippingFrame);
        }

        RectF contentFrameInVisibleBounds = new RectF(
                contentFrameInWindow.left - visibleFrameInWindow.left,
                contentFrameInWindow.top - visibleFrameInWindow.top,
                contentFrameInWindow.right - visibleFrameInWindow.left,
                contentFrameInWindow.bottom - visibleFrameInWindow.top
        );

        return new GallerySharedElementState(
                transitionDrawable,
                new GallerySharedElementGeometry(visibleFrameInWindow, contentFrameInVisibleBounds)
        );
    }

    @NonNull
    public static RectF viewBoundsOnScreen(@NonNull View view) {
        int[] location = new int[2];
        view.getLocationOnScreen(location);
        return new RectF(
                location[0],
                location[1],
                location[0] + view.getWidth(),
                location[1] + view.getHeight()
        );
    }

    @Nullable
    public static Drawable cloneDrawable(@Nullable Drawable drawable, @NonNull View view) {
        if (drawable == null) {
            return null;
        }
        Drawable.ConstantState constantState = drawable.getConstantState();
        if (constantState == null) {
            return drawable.mutate();
        }
        return constantState.newDrawable(view.getResources()).mutate();
    }

    @NonNull
    public static GallerySharedElementGeometry defaultGeometryFor(@NonNull Drawable drawable, @NonNull RectF containerBounds) {
        RectF visibleFrame = aspectFitRect(drawable, containerBounds);
        return new GallerySharedElementGeometry(
                visibleFrame,
                new RectF(0f, 0f, visibleFrame.width(), visibleFrame.height())
        );
    }

    @NonNull
    public static RectF aspectFitRect(@NonNull Drawable drawable, @NonNull RectF containerBounds) {
        int intrinsicWidth = Math.max(1, drawable.getIntrinsicWidth());
        int intrinsicHeight = Math.max(1, drawable.getIntrinsicHeight());
        float widthScale = containerBounds.width() / intrinsicWidth;
        float heightScale = containerBounds.height() / intrinsicHeight;
        float scale = Math.min(widthScale, heightScale);
        float width = intrinsicWidth * scale;
        float height = intrinsicHeight * scale;
        float left = containerBounds.left + (containerBounds.width() - width) * 0.5f;
        float top = containerBounds.top + (containerBounds.height() - height) * 0.5f;
        return new RectF(left, top, left + width, top + height);
    }

    @Nullable
    private static RectF resolveDisplayedContentFrame(@NonNull ImageView imageView, @NonNull Drawable drawable) {
        RectF viewBounds = new RectF(0f, 0f, imageView.getWidth(), imageView.getHeight());
        if (viewBounds.isEmpty()) {
            return null;
        }

        if (imageView instanceof PhotoView) {
            RectF displayRect = ((PhotoView) imageView).getDisplayRect();
            if (displayRect != null && !displayRect.isEmpty()) {
                return new RectF(displayRect);
            }
        }

        int intrinsicWidth = drawable.getIntrinsicWidth();
        int intrinsicHeight = drawable.getIntrinsicHeight();
        if (intrinsicWidth <= 0 || intrinsicHeight <= 0) {
            return new RectF(viewBounds);
        }

        ImageView.ScaleType scaleType = imageView.getScaleType();
        if (scaleType == ImageView.ScaleType.MATRIX) {
            RectF contentFrameInView = new RectF(0f, 0f, intrinsicWidth, intrinsicHeight);
            Matrix imageMatrix = new Matrix(imageView.getImageMatrix());
            imageMatrix.mapRect(contentFrameInView);
            return contentFrameInView;
        }

        if (scaleType == ImageView.ScaleType.FIT_XY) {
            return new RectF(viewBounds);
        }

        float widthScale = viewBounds.width() / intrinsicWidth;
        float heightScale = viewBounds.height() / intrinsicHeight;
        float scale;
        float dx = 0f;
        float dy = 0f;

        switch (scaleType) {
            case CENTER:
                scale = 1f;
                dx = (viewBounds.width() - intrinsicWidth) * 0.5f;
                dy = (viewBounds.height() - intrinsicHeight) * 0.5f;
                break;
            case CENTER_CROP:
                scale = Math.max(widthScale, heightScale);
                dx = (viewBounds.width() - intrinsicWidth * scale) * 0.5f;
                dy = (viewBounds.height() - intrinsicHeight * scale) * 0.5f;
                break;
            case CENTER_INSIDE:
                scale = Math.min(1f, Math.min(widthScale, heightScale));
                dx = (viewBounds.width() - intrinsicWidth * scale) * 0.5f;
                dy = (viewBounds.height() - intrinsicHeight * scale) * 0.5f;
                break;
            case FIT_START:
                scale = Math.min(widthScale, heightScale);
                break;
            case FIT_END:
                scale = Math.min(widthScale, heightScale);
                dx = viewBounds.width() - intrinsicWidth * scale;
                dy = viewBounds.height() - intrinsicHeight * scale;
                break;
            case FIT_CENTER:
            default:
                scale = Math.min(widthScale, heightScale);
                dx = (viewBounds.width() - intrinsicWidth * scale) * 0.5f;
                dy = (viewBounds.height() - intrinsicHeight * scale) * 0.5f;
                break;
        }

        float width = intrinsicWidth * scale;
        float height = intrinsicHeight * scale;
        return new RectF(dx, dy, dx + width, dy + height);
    }
}
