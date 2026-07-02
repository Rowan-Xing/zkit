package nandorojo.modules.galeria;

import android.content.Context;
import android.graphics.RectF;
import android.graphics.drawable.Drawable;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;
import android.view.ViewGroup;
import android.view.VelocityTracker;
import android.view.ViewParent;
import android.widget.FrameLayout;
import android.widget.ImageView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.viewpager2.widget.ViewPager2;

import java.util.ArrayList;
import java.util.List;

public final class GalleryViewerOverlayView extends FrameLayout implements GalleryViewerPageView.Listener {
    public interface Listener {
        void onOverlayDismissed();

        void onOverlayIndexChange(int index);
    }

    private final List<GalleryMediaItem> items;
    @Nullable
    private final String galleryId;
    @Nullable
    private final Listener listener;
    private final boolean lightTheme;
    private final int touchSlop;
    private final int minFlingVelocity;

    private View backgroundView;
    private FrameLayout contentView;
    private ViewPager2 viewPager;
    private GalleryPagerAdapter pagerAdapter;
    private GalleryViewerTransitionController transitionController;
    private int currentIndex;
    private float downX;
    private float downY;
    private boolean dragging;
    private boolean multiTouchLock;
    private boolean needReanchorAfterMultiTouch;
    private float dragStartRawY;
    private float dragStartTranslationY;
    @Nullable
    private VelocityTracker velocityTracker;
    @Nullable
    private View dragTarget;
    @Nullable
    private GalleryViewerPageView dragPageView;
    @Nullable
    private ImageView hiddenActiveSourceView;
    private float hiddenActiveSourcePreviousAlpha = 1f;
    private boolean closing;
    private boolean openingTransitionStarted;
    private boolean contentPresented;
    private boolean finished;

    private final Runnable openTransitionReadyWatcher = new Runnable() {
        @Override
        public void run() {
            if (openingTransitionStarted || closing || finished) {
                return;
            }
            GalleryViewerPageView pageView = resolveCurrentPageView();
            if (pageView == null || getWidth() <= 0 || getHeight() <= 0) {
                postOnAnimation(this);
                return;
            }
            startOpenTransition(pageView, pageView.sharedElementState());
        }
    };

    public GalleryViewerOverlayView(
            @NonNull Context context,
            @NonNull List<GalleryMediaItem> sourceItems,
            int startIndex,
            boolean lightTheme,
            @Nullable String galleryId,
            @Nullable Listener listener
    ) {
        super(context);
        this.items = new ArrayList<>(sourceItems);
        this.currentIndex = Math.max(0, Math.min(startIndex, items.size() - 1));
        this.lightTheme = lightTheme;
        this.galleryId = galleryId;
        this.listener = listener;
        ViewConfiguration viewConfiguration = ViewConfiguration.get(context);
        touchSlop = viewConfiguration.getScaledTouchSlop();
        minFlingVelocity = viewConfiguration.getScaledMinimumFlingVelocity();
        setLayoutParams(new LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        setClickable(true);
        setFocusable(true);
        setFocusableInTouchMode(true);
        setupUi();
        post(openTransitionReadyWatcher);
        requestFocus();
    }

    public void requestClose() {
        closeViewer();
    }

    public void dismissImmediately() {
        finishWithoutAnimation();
    }

    @Override
    protected void onDetachedFromWindow() {
        if (!finished) {
            cleanup();
        }
        super.onDetachedFromWindow();
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getKeyCode() == KeyEvent.KEYCODE_BACK && event.getAction() == KeyEvent.ACTION_UP) {
            requestClose();
            return true;
        }
        return super.dispatchKeyEvent(event);
    }

    @Override
    public boolean dispatchTouchEvent(MotionEvent event) {
        if (closing || !contentPresented) {
            super.dispatchTouchEvent(event);
            return true;
        }

        int action = event.getActionMasked();
        if (action == MotionEvent.ACTION_POINTER_DOWN) {
            enterMultiTouchLock();
            super.dispatchTouchEvent(event);
            return true;
        }
        if (action == MotionEvent.ACTION_POINTER_UP) {
            if (multiTouchLock && event.getPointerCount() - 1 <= 1) {
                exitMultiTouchLockAndWaitReanchor();
            }
            super.dispatchTouchEvent(event);
            return true;
        }
        if (multiTouchLock && (action == MotionEvent.ACTION_UP || action == MotionEvent.ACTION_CANCEL)) {
            clearMultiTouchLock();
            super.dispatchTouchEvent(event);
            return true;
        }
        if (multiTouchLock) {
            super.dispatchTouchEvent(event);
            return true;
        }

        switch (action) {
            case MotionEvent.ACTION_DOWN:
                if (needReanchorAfterMultiTouch) {
                    needReanchorAfterMultiTouch = false;
                }
                syncPagerGesturePolicy();
                downX = event.getRawX();
                downY = event.getRawY();
                dragging = false;
                dragTarget = null;
                dragPageView = null;
                ensureVelocityTracker();
                velocityTracker.clear();
                velocityTracker.addMovement(event);
                break;
            case MotionEvent.ACTION_MOVE:
                if (needReanchorAfterMultiTouch) {
                    super.dispatchTouchEvent(event);
                    return true;
                }
                ensureVelocityTracker();
                velocityTracker.addMovement(event);
                if (!dragging) {
                    float dx = event.getRawX() - downX;
                    float dy = event.getRawY() - downY;
                    GalleryViewerPageView pageView = resolveCurrentPageView();
                    if (pageView != null
                            && Math.abs(dy) > touchSlop
                            && pageView.canBeginVerticalDismiss(dx, dy, event.getRawX(), event.getRawY())) {
                        startDragging(pageView, event.getRawY());
                    }
                }
                if (dragging) {
                    applyDragTransform(event.getRawY());
                    return true;
                }
                syncPagerGesturePolicy();
                break;
            case MotionEvent.ACTION_UP:
            case MotionEvent.ACTION_CANCEL:
                if (needReanchorAfterMultiTouch) {
                    if (action == MotionEvent.ACTION_CANCEL) {
                        needReanchorAfterMultiTouch = false;
                        syncPagerGesturePolicy();
                    }
                    releaseVelocityTracker();
                    super.dispatchTouchEvent(event);
                    return true;
                }
                if (dragging) {
                    ensureVelocityTracker();
                    velocityTracker.addMovement(event);
                    float velocityY = consumeYVelocity();
                    View target = getActiveDragTarget();
                    float height = Math.max(1f, getHeight());
                    float dismissDistance = height * 0.16f;
                    float quickFlingDistance = height * 0.06f;
                    float dismissVelocity = Math.max(1300f, minFlingVelocity * 1.6f);
                    boolean dismissByDistance = Math.abs(target.getTranslationY()) > dismissDistance;
                    boolean dismissByFling = Math.abs(target.getTranslationY()) > quickFlingDistance
                            && Math.abs(velocityY) > dismissVelocity;
                    dragging = false;
                    syncPagerGesturePolicy();
                    releaseVelocityTracker();
                    if (dismissByDistance || dismissByFling) {
                        closeViewer();
                    } else {
                        animateBackToCenter();
                    }
                    return true;
                }
                releaseVelocityTracker();
                break;
            default:
                break;
        }

        super.dispatchTouchEvent(event);
        return true;
    }

    @Override
    public void onDismissRequested(@NonNull GalleryViewerPageView pageView) {
        if (pageView == resolveCurrentPageView()) {
            closeViewer();
        }
    }

    @Override
    public void onVideoCloseRequested(@NonNull GalleryViewerPageView pageView) {
        if (pageView == resolveCurrentPageView()) {
            closeViewer();
        }
    }

    private void setupUi() {
        backgroundView = new View(getContext());
        backgroundView.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        backgroundView.setBackgroundColor(lightTheme ? 0xFFFFFFFF : 0xFF000000);
        backgroundView.setAlpha(0f);
        addView(backgroundView);

        contentView = new FrameLayout(getContext());
        contentView.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        contentView.setAlpha(0f);

        viewPager = new ViewPager2(getContext());
        viewPager.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        viewPager.setOffscreenPageLimit(1);
        viewPager.setUserInputEnabled(false);
        pagerAdapter = new GalleryPagerAdapter(this, this::applySourcePlaceholderIfNeeded);
        viewPager.setAdapter(pagerAdapter);
        pagerAdapter.setItems(items);
        viewPager.setCurrentItem(currentIndex, false);
        viewPager.registerOnPageChangeCallback(new ViewPager2.OnPageChangeCallback() {
            @Override
            public void onPageSelected(int position) {
                currentIndex = position;
                if (contentPresented) {
                    pagerAdapter.setActiveIndex(position);
                    syncPagerGesturePolicy();
                    hideActiveSourceViewForCurrentIndex();
                    if (listener != null) {
                        listener.onOverlayIndexChange(position);
                    }
                }
            }
        });
        contentView.addView(viewPager);
        addView(contentView);

        transitionController = new GalleryViewerTransitionController(this, backgroundView, contentView);
    }

    private void startOpenTransition(
            @NonNull GalleryViewerPageView pageView,
            @Nullable GallerySharedElementState resolvedPageState
    ) {
        if (openingTransitionStarted) {
            return;
        }
        openingTransitionStarted = true;
        GalleryMediaItem item = items.get(currentIndex);
        String anchorKey = GallerySharedElementNames.forItem(galleryId, item);
        ImageView sourceView = GallerySourceViewRegistry.find(anchorKey);
        GallerySharedElementState sourceState = GalleryLayoutSupport.captureImageViewState(sourceView);
        applySourcePlaceholderIfNeeded(pageView, currentIndex);
        pageView.prepareForOpenTransition();
        pageView.setMediaHidden(true);

        Drawable fallbackDrawable = sourceState != null ? sourceState.getDrawable() : null;
        RectF overlayBounds = GalleryLayoutSupport.viewBoundsOnScreen(this);
        GallerySharedElementState effectivePageState = usableSharedElementState(resolvedPageState)
                ? resolvedPageState
                : pageView.sharedElementState();
        GallerySharedElementGeometry targetGeometry = usableSharedElementState(effectivePageState)
                ? effectivePageState.getGeometry()
                : defaultOpenGeometryFromSource(sourceState, overlayBounds, pageView, fallbackDrawable);

        transitionController.performOpenTransition(
                sourceView,
                sourceState,
                targetGeometry,
                () -> finishOpenTransition(pageView)
        );
    }

    private void finishOpenTransition(@NonNull GalleryViewerPageView pageView) {
        if (contentPresented) {
            return;
        }
        pageView.setMediaHidden(false);
        transitionController.completeOpenTransition(() -> {
            contentPresented = true;
            pagerAdapter.setActiveIndex(currentIndex);
            syncPagerGesturePolicy();
            hideActiveSourceViewForCurrentIndex();
            if (listener != null) {
                listener.onOverlayIndexChange(currentIndex);
            }
        });
    }

    private void closeViewer() {
        if (closing || finished) {
            return;
        }
        syncCurrentIndexFromPager();
        closing = true;
        dragging = false;
        viewPager.setUserInputEnabled(false);
        viewPager.requestDisallowInterceptTouchEvent(false);
        releaseVelocityTracker();

        GalleryViewerPageView pageView = resolveCurrentPageView();
        if (pageView == null) {
            finishWithoutAnimation();
            return;
        }

        pageView.prepareForReturnTransition();
        GallerySharedElementState pageState = pageView.sharedElementState();
        pageView.setMediaHidden(true);

        GalleryMediaItem item = items.get(currentIndex);
        String anchorKey = GallerySharedElementNames.forItem(galleryId, item);
        ImageView targetView = GallerySourceViewRegistry.find(anchorKey);
        GallerySharedElementState targetState = GalleryLayoutSupport.captureImageViewState(targetView);

        transitionController.performCloseTransition(
                pageState,
                targetState != null ? targetState.getGeometry() : null,
                targetView,
                () -> {
                    restoreHiddenActiveSourceView();
                    finishWithoutAnimation();
                }
        );
    }

    @Nullable
    private GalleryViewerPageView resolveCurrentPageView() {
        GalleryViewerPageView pageView = pagerAdapter.findAttachedView(currentIndex);
        if (pageView != null) {
            return pageView;
        }
        return pagerAdapter.findActiveView();
    }

    @NonNull
    private GallerySharedElementGeometry defaultOpenGeometryFromSource(
            @Nullable GallerySharedElementState sourceState,
            @NonNull RectF overlayBounds,
            @NonNull GalleryViewerPageView pageView,
            @Nullable Drawable fallbackDrawable
    ) {
        if (sourceState != null) {
            RectF sourceContent = sourceState.getGeometry().getContentFrameInVisibleBounds();
            if (sourceContent.width() > 1f && sourceContent.height() > 1f) {
                return GalleryLayoutSupport.defaultGeometryForAspectRatio(
                        sourceContent.width(),
                        sourceContent.height(),
                        overlayBounds
                );
            }
        }
        return pageView.defaultTransitionGeometry(overlayBounds, fallbackDrawable);
    }

    private boolean usableSharedElementState(@Nullable GallerySharedElementState state) {
        if (state == null) {
            return false;
        }
        RectF visibleFrame = state.getGeometry().getVisibleFrameInWindow();
        RectF contentFrame = state.getGeometry().getContentFrameInVisibleBounds();
        return visibleFrame.width() > 1f
                && visibleFrame.height() > 1f
                && contentFrame.width() > 1f
                && contentFrame.height() > 1f;
    }

    private void syncCurrentIndexFromPager() {
        if (viewPager == null || items.isEmpty()) {
            return;
        }
        int pagerIndex = viewPager.getCurrentItem();
        currentIndex = Math.max(0, Math.min(pagerIndex, items.size() - 1));
    }

    private void startDragging(@NonNull GalleryViewerPageView pageView, float rawY) {
        dragging = true;
        dragPageView = pageView;
        dragPageView.prepareForDismissDrag();
        dragTarget = pageView.getDragTarget();
        dragTarget.animate().cancel();
        backgroundView.animate().cancel();
        dragStartRawY = rawY;
        dragStartTranslationY = dragTarget.getTranslationY();
        viewPager.setUserInputEnabled(false);
        viewPager.requestDisallowInterceptTouchEvent(true);
    }

    private void enterMultiTouchLock() {
        multiTouchLock = true;
        needReanchorAfterMultiTouch = false;
        if (dragging) {
            dragging = false;
            animateBackToCenter();
        }
        dragTarget = null;
        releaseVelocityTracker();
        viewPager.setUserInputEnabled(false);
        viewPager.requestDisallowInterceptTouchEvent(true);
    }

    private void exitMultiTouchLockAndWaitReanchor() {
        multiTouchLock = false;
        needReanchorAfterMultiTouch = true;
        dragging = false;
        dragTarget = null;
        releaseVelocityTracker();
        viewPager.setUserInputEnabled(false);
        viewPager.requestDisallowInterceptTouchEvent(true);
    }

    private void clearMultiTouchLock() {
        multiTouchLock = false;
        needReanchorAfterMultiTouch = false;
        dragging = false;
        dragTarget = null;
        dragPageView = null;
        releaseVelocityTracker();
        syncPagerGesturePolicy();
    }

    private void syncPagerGesturePolicy() {
        GalleryViewerPageView pageView = resolveCurrentPageView();
        boolean canPage = items.size() > 1 && pageView != null && pageView.canPageHorizontally();
        viewPager.setUserInputEnabled(canPage);
        viewPager.requestDisallowInterceptTouchEvent(!canPage);
        if (pageView != null) {
            pageView.setAllowParentInterceptOnImageEdge(canPage);
        }
    }

    @NonNull
    private View getActiveDragTarget() {
        if (dragTarget != null) {
            return dragTarget;
        }
        return viewPager;
    }

    private void applyDragTransform(float rawY) {
        View target = getActiveDragTarget();
        float dy = dragStartTranslationY + rawY - dragStartRawY;
        float abs = Math.abs(dy);
        float height = Math.max(1, getHeight());
        float progress = Math.min(1f, abs / height);
        float scale = Math.max(0.84f, 1f - progress * 0.16f);
        target.setTranslationY(dy);
        target.setScaleX(scale);
        target.setScaleY(scale);
        backgroundView.setAlpha(1f - Math.min(0.9f, progress * 1.25f));
    }

    private void animateBackToCenter() {
        View target = getActiveDragTarget();
        GalleryViewerPageView restorePageView = dragPageView;
        dragPageView = null;
        target.animate()
                .translationY(0f)
                .scaleX(1f)
                .scaleY(1f)
                .setDuration(200L)
                .withEndAction(() -> {
                    backgroundView.setAlpha(1f);
                    if (restorePageView != null) {
                        restorePageView.restoreAfterDismissCancelled();
                    }
                })
                .start();
        backgroundView.animate()
                .alpha(1f)
                .setDuration(200L)
                .start();
    }

    @Nullable
    private ImageView sourceViewForIndex(int index) {
        if (index < 0 || index >= items.size()) {
            return null;
        }
        GalleryMediaItem item = items.get(index);
        String anchorKey = GallerySharedElementNames.forItem(galleryId, item);
        return GallerySourceViewRegistry.find(anchorKey);
    }

    private void applySourcePlaceholderIfNeeded(@NonNull GalleryViewerPageView pageView, int index) {
        ImageView sourceView = sourceViewForIndex(index);
        if (sourceView == null) {
            return;
        }
        Drawable sourceDrawable = GalleryLayoutSupport.transitionDrawableForImageView(sourceView);
        pageView.setImagePlaceholderIfEmpty(sourceDrawable);
    }

    private void hideActiveSourceViewForCurrentIndex() {
        if (!contentPresented || closing) {
            return;
        }
        ImageView sourceView = sourceViewForIndex(currentIndex);
        if (hiddenActiveSourceView != sourceView) {
            restoreHiddenActiveSourceView();
            hiddenActiveSourcePreviousAlpha = sourceView != null ? sourceView.getAlpha() : 1f;
            hiddenActiveSourceView = sourceView;
        }
        if (sourceView != null) {
            sourceView.setAlpha(0f);
        }
    }

    private void restoreHiddenActiveSourceView() {
        if (hiddenActiveSourceView != null) {
            hiddenActiveSourceView.setAlpha(hiddenActiveSourcePreviousAlpha);
        }
        hiddenActiveSourceView = null;
        hiddenActiveSourcePreviousAlpha = 1f;
    }

    private void ensureVelocityTracker() {
        if (velocityTracker == null) {
            velocityTracker = VelocityTracker.obtain();
        }
    }

    private float consumeYVelocity() {
        if (velocityTracker == null) {
            return 0f;
        }
        velocityTracker.computeCurrentVelocity(1000);
        return velocityTracker.getYVelocity();
    }

    private void releaseVelocityTracker() {
        if (velocityTracker == null) {
            return;
        }
        velocityTracker.recycle();
        velocityTracker = null;
    }

    private void finishWithoutAnimation() {
        if (finished) {
            return;
        }
        finished = true;
        closing = true;
        cleanup();
        ViewParent parent = getParent();
        if (parent instanceof ViewGroup) {
            ((ViewGroup) parent).removeView(this);
        }
        if (listener != null) {
            listener.onOverlayDismissed();
        }
    }

    private void cleanup() {
        restoreHiddenActiveSourceView();
        removeCallbacks(openTransitionReadyWatcher);
        if (pagerAdapter != null) {
            pagerAdapter.releaseAll();
        }
        releaseVelocityTracker();
    }
}
