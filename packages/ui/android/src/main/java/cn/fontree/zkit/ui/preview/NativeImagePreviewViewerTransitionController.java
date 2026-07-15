package cn.fontree.zkit.ui.preview;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.animation.ValueAnimator;
import android.graphics.RectF;
import android.view.View;
import android.view.animation.DecelerateInterpolator;
import android.widget.FrameLayout;
import android.widget.ImageView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

public final class NativeImagePreviewViewerTransitionController {
    private final FrameLayout containerView;
    private final View backgroundView;
    private final View contentView;
    @Nullable
    private NativeImagePreviewTransitionSnapshotView snapshotView;
    @Nullable
    private ImageView hiddenSourceView;

    public NativeImagePreviewViewerTransitionController(
            @NonNull FrameLayout containerView,
            @NonNull View backgroundView,
            @NonNull View contentView
    ) {
        this.containerView = containerView;
        this.backgroundView = backgroundView;
        this.contentView = contentView;
    }

    public void performOpenTransition(
            @Nullable ImageView sourceView,
            @Nullable NativeImagePreviewSharedElementState sourceState,
            @NonNull NativeImagePreviewSharedElementGeometry targetGeometry,
            @NonNull Runnable completion
    ) {
        clearSnapshot();
        backgroundView.setAlpha(0f);
        contentView.setAlpha(0f);
        hiddenSourceView = sourceView;
        if (hiddenSourceView != null) {
            hiddenSourceView.setAlpha(0f);
        }
        if (sourceState == null) {
            backgroundView.animate()
                    .alpha(1f)
                    .setDuration(220L)
                    .setInterpolator(new DecelerateInterpolator())
                    .withEndAction(completion)
                    .start();
            return;
        }

        NativeImagePreviewSharedElementGeometry sourceGeometry = frameInContainer(sourceState.getGeometry());
        NativeImagePreviewSharedElementGeometry endGeometry = frameInContainer(targetGeometry);
        snapshotView = new NativeImagePreviewTransitionSnapshotView(containerView.getContext(), sourceState.getDrawable());
        containerView.addView(snapshotView);
        snapshotView.applyGeometry(sourceGeometry);
        animateSnapshot(
                sourceGeometry,
                endGeometry,
                0f,
                1f,
                300L,
                completion
        );
    }

    public void completeOpenTransition(@NonNull Runnable completion) {
        contentView.animate()
                .alpha(1f)
                .setDuration(140L)
                .setInterpolator(new DecelerateInterpolator())
                .setListener(new AnimatorListenerAdapter() {
                    @Override
                    public void onAnimationEnd(Animator animation) {
                        restoreHiddenSourceView();
                        clearSnapshot();
                        completion.run();
                    }
                })
                .start();
    }

    public void performCloseTransition(
            @Nullable NativeImagePreviewSharedElementState pageState,
            @Nullable NativeImagePreviewSharedElementGeometry targetGeometry,
            @Nullable ImageView targetView,
            @NonNull Runnable completion
    ) {
        clearSnapshot();
        float backgroundStartAlpha = backgroundView.getAlpha();
        if (pageState == null || targetGeometry == null) {
            contentView.animate()
                    .alpha(0f)
                    .setDuration(180L)
                    .setInterpolator(new DecelerateInterpolator())
                    .start();
            backgroundView.animate()
                    .alpha(0f)
                    .setDuration(180L)
                    .setInterpolator(new DecelerateInterpolator())
                    .withEndAction(completion)
                    .start();
            return;
        }

        if (targetView != null) {
            targetView.setAlpha(0f);
        }
        NativeImagePreviewSharedElementGeometry startGeometry = frameInContainer(pageState.getGeometry());
        NativeImagePreviewSharedElementGeometry endGeometry = frameInContainer(targetGeometry);
        snapshotView = new NativeImagePreviewTransitionSnapshotView(containerView.getContext(), pageState.getDrawable());
        containerView.addView(snapshotView);
        snapshotView.applyGeometry(startGeometry);
        animateSnapshot(
                startGeometry,
                endGeometry,
                backgroundStartAlpha,
                0f,
                280L,
                () -> {
                    if (targetView != null) {
                        targetView.setAlpha(1f);
                    }
                    clearSnapshot();
                    completion.run();
                }
        );
        contentView.animate()
                .alpha(0f)
                .setDuration(280L)
                .setInterpolator(new DecelerateInterpolator())
                .start();
    }

    private void animateSnapshot(
            @NonNull NativeImagePreviewSharedElementGeometry startGeometry,
            @NonNull NativeImagePreviewSharedElementGeometry endGeometry,
            float backgroundStartAlpha,
            float backgroundEndAlpha,
            long durationMs,
            @NonNull Runnable completion
    ) {
        NativeImagePreviewTransitionSnapshotView localSnapshotView = snapshotView;
        if (localSnapshotView == null) {
            completion.run();
            return;
        }
        ValueAnimator animator = ValueAnimator.ofFloat(0f, 1f);
        animator.setDuration(durationMs);
        animator.setInterpolator(new DecelerateInterpolator());
        animator.addUpdateListener(valueAnimator -> {
            float progress = (float) valueAnimator.getAnimatedValue();
            localSnapshotView.applyGeometry(interpolateGeometry(startGeometry, endGeometry, progress));
            backgroundView.setAlpha(lerp(backgroundStartAlpha, backgroundEndAlpha, progress));
        });
        animator.addListener(new AnimatorListenerAdapter() {
            @Override
            public void onAnimationEnd(Animator animation) {
                backgroundView.setAlpha(backgroundEndAlpha);
                completion.run();
            }
        });
        animator.start();
    }

    @NonNull
    private NativeImagePreviewSharedElementGeometry interpolateGeometry(
            @NonNull NativeImagePreviewSharedElementGeometry start,
            @NonNull NativeImagePreviewSharedElementGeometry end,
            float progress
    ) {
        RectF visibleFrame = interpolateRect(start.getVisibleFrameInWindow(), end.getVisibleFrameInWindow(), progress);
        RectF contentFrame = interpolateRect(start.getContentFrameInVisibleBounds(), end.getContentFrameInVisibleBounds(), progress);
        return new NativeImagePreviewSharedElementGeometry(visibleFrame, contentFrame);
    }

    @NonNull
    private RectF interpolateRect(@NonNull RectF start, @NonNull RectF end, float progress) {
        return new RectF(
                lerp(start.left, end.left, progress),
                lerp(start.top, end.top, progress),
                lerp(start.right, end.right, progress),
                lerp(start.bottom, end.bottom, progress)
        );
    }

    @NonNull
    private NativeImagePreviewSharedElementGeometry frameInContainer(@NonNull NativeImagePreviewSharedElementGeometry geometry) {
        int[] location = new int[2];
        containerView.getLocationOnScreen(location);
        RectF visibleFrame = geometry.getVisibleFrameInWindow();
        visibleFrame.offset(-location[0], -location[1]);
        return new NativeImagePreviewSharedElementGeometry(
                visibleFrame,
                geometry.getContentFrameInVisibleBounds()
        );
    }

    private float lerp(float start, float end, float progress) {
        return start + (end - start) * progress;
    }

    private void restoreHiddenSourceView() {
        if (hiddenSourceView == null) {
            return;
        }
        hiddenSourceView.setAlpha(1f);
        hiddenSourceView = null;
    }

    private void clearSnapshot() {
        if (snapshotView == null) {
            return;
        }
        containerView.removeView(snapshotView);
        snapshotView = null;
    }
}
