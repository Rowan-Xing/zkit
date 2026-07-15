package cn.fontree.zkit.ui.preview;

import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.recyclerview.widget.RecyclerView;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public final class NativeImagePreviewPagerAdapter extends RecyclerView.Adapter<NativeImagePreviewPagerAdapter.PageViewHolder> {
    public interface PageBindCallback {
        void onPageBound(@NonNull NativeImagePreviewViewerPageView pageView, int position);
    }

    private final List<NativeImagePreviewMediaItem> items = new ArrayList<>();
    private final Map<Integer, NativeImagePreviewViewerPageView> attachedViews = new HashMap<>();
    @Nullable
    private final NativeImagePreviewViewerPageView.Listener pageListener;
    @Nullable
    private final PageBindCallback pageBindCallback;
    private int activeIndex = -1;

    public NativeImagePreviewPagerAdapter(
            @Nullable NativeImagePreviewViewerPageView.Listener pageListener,
            @Nullable PageBindCallback pageBindCallback
    ) {
        this.pageListener = pageListener;
        this.pageBindCallback = pageBindCallback;
    }

    public void setItems(@NonNull List<NativeImagePreviewMediaItem> list) {
        attachedViews.clear();
        items.clear();
        items.addAll(list);
        notifyDataSetChanged();
    }

    public void setActiveIndex(int index) {
        activeIndex = index;
        for (Map.Entry<Integer, NativeImagePreviewViewerPageView> entry : attachedViews.entrySet()) {
            entry.getValue().setActive(entry.getKey() == index);
        }
    }

    public void releaseAll() {
        for (NativeImagePreviewViewerPageView view : attachedViews.values()) {
            view.release();
        }
        attachedViews.clear();
    }

    @Nullable
    public NativeImagePreviewViewerPageView findAttachedView(int position) {
        NativeImagePreviewViewerPageView pageView = attachedViews.get(position);
        if (pageView == null) {
            return null;
        }
        if (!pageView.isAttachedToWindow()) {
            attachedViews.remove(position);
            return null;
        }
        return pageView;
    }

    @Nullable
    public NativeImagePreviewViewerPageView findActiveView() {
        return attachedViews.get(activeIndex);
    }

    @NonNull
    @Override
    public PageViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        NativeImagePreviewViewerPageView pageView = new NativeImagePreviewViewerPageView(parent.getContext());
        pageView.setListener(pageListener);
        return new PageViewHolder(pageView);
    }

    @Override
    public void onBindViewHolder(@NonNull PageViewHolder holder, int position) {
        holder.pageView.bind(items.get(position));
        if (pageBindCallback != null) {
            pageBindCallback.onPageBound(holder.pageView, position);
        }
        holder.pageView.setActive(position == activeIndex);
    }

    @Override
    public void onViewAttachedToWindow(@NonNull PageViewHolder holder) {
        super.onViewAttachedToWindow(holder);
        removeAttachedViewKeys(holder.pageView);
        int position = holder.getBindingAdapterPosition();
        if (position == RecyclerView.NO_POSITION) {
            return;
        }
        attachedViews.put(position, holder.pageView);
    }

    @Override
    public void onViewDetachedFromWindow(@NonNull PageViewHolder holder) {
        super.onViewDetachedFromWindow(holder);
        removeAttachedViewKeys(holder.pageView);
    }

    @Override
    public void onViewRecycled(@NonNull PageViewHolder holder) {
        super.onViewRecycled(holder);
        removeAttachedViewKeys(holder.pageView);
        holder.pageView.release();
    }

    private void removeAttachedViewKeys(@NonNull NativeImagePreviewViewerPageView pageView) {
        List<Integer> keys = new ArrayList<>();
        for (Map.Entry<Integer, NativeImagePreviewViewerPageView> entry : attachedViews.entrySet()) {
            if (entry.getValue() == pageView) {
                keys.add(entry.getKey());
            }
        }
        for (Integer key : keys) {
            attachedViews.remove(key);
        }
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    static final class PageViewHolder extends RecyclerView.ViewHolder {
        final NativeImagePreviewViewerPageView pageView;

        PageViewHolder(@NonNull NativeImagePreviewViewerPageView itemView) {
            super(itemView);
            this.pageView = itemView;
        }
    }
}
