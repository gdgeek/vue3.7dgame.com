<template>
  <div
    class="standard-card"
    :class="{ 'is-selected': isSelected, 'selection-mode': selectionMode }"
    role="button"
    tabindex="0"
    :aria-label="title"
    @click="$emit('view')"
    @keydown.enter.self.prevent="$emit('view')"
    @keydown.space.self.prevent="$emit('view')"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- Selection Checkbox -->
    <div
      v-if="showCheckbox"
      class="card-checkbox"
      :class="{ visible: selectionMode || isHovered || isSelected }"
      @click.stop="toggleSelect"
    >
      <div class="checkbox-inner" :class="{ checked: isSelected }">
        <font-awesome-icon
          v-if="isSelected"
          :icon="['fas', 'check']"
        ></font-awesome-icon>
      </div>
    </div>

    <!-- Type Icon -->
    <div
      v-if="typeIcon"
      class="card-type-icon"
      :class="{ 'with-checkbox': selectionMode || isHovered || isSelected }"
    >
      <font-awesome-icon :icon="typeIcon"></font-awesome-icon>
    </div>

    <!-- Thumbnail Area -->
    <div class="card-thumbnail" :style="thumbnailStyle">
      <div class="thumbnail-inner">
        <div v-if="thumbnailVariant === 'audio'" class="audio-thumbnail">
          <div class="audio-thumbnail-badge">
            <font-awesome-icon
              :icon="typeIcon || placeholderIcon || ['fas', 'headphones']"
            ></font-awesome-icon>
          </div>
        </div>
        <img
          v-else-if="image"
          :src="image"
          :alt="title"
          :style="thumbnailImageStyle"
          @load="handleImageLoad"
        />
        <div v-else class="thumbnail-placeholder">
          <font-awesome-icon :icon="placeholderIcon"></font-awesome-icon>
        </div>
      </div>

      <!-- Tags on thumbnail -->
      <div v-if="tags && tags.length > 0" class="thumbnail-tags">
        <span v-for="tag in displayTags" :key="tag" class="tag-badge">
          {{ tag }}
        </span>
        <span v-if="tags.length > 2" class="tag-more"
          >+{{ tags.length - 2 }}</span
        >
      </div>
    </div>

    <!-- Content Area -->
    <div class="card-content">
      <h3 class="card-title" :title="title">
        <slot name="title">{{ title }}</slot>
      </h3>
      <p v-if="description" class="card-description">{{ description }}</p>
      <div v-if="meta" class="card-meta">
        <span v-if="meta.author" class="meta-item" :title="meta.author">
          <font-awesome-icon
            :icon="['fas', 'user']"
            class="meta-icon"
          ></font-awesome-icon>
          <span class="meta-text">{{ meta.author }}</span>
        </span>
        <span v-if="meta.date" class="meta-item" :title="meta.date">
          <font-awesome-icon
            :icon="['fas', 'clock']"
            class="meta-icon"
          ></font-awesome-icon>
          <span class="meta-text">{{ meta.date }}</span>
        </span>
      </div>
    </div>

    <!-- Action Footer -->
    <div
      v-if="$slots.actions || actionText"
      class="card-action-group"
      @click.stop
    >
      <slot name="actions">
        <div class="card-action" @click.stop="$emit('action')">
          <font-awesome-icon
            :icon="actionIcon"
            class="action-icon"
          ></font-awesome-icon>
          <span class="action-text">{{ actionText }}</span>
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";

interface CardMeta {
  author?: string;
  date?: string;
}

const props = withDefaults(
  defineProps<{
    image?: string;
    title: string;
    description?: string;
    tags?: string[];
    meta?: CardMeta;
    actionText?: string;
    actionIcon?: string | string[];
    placeholderIcon?: string | string[];
    selected?: boolean;
    selectionMode?: boolean;
    typeIcon?: string | string[];
    showCheckbox?: boolean;
    aspectRatio?: string;
    imageFit?: "cover" | "contain";
    thumbnailVariant?: "default" | "audio";
    containPadding?: boolean;
    containScale?: number;
  }>(),
  {
    actionIcon: () => ["fas", "pen-to-square"],
    placeholderIcon: () => ["fas", "image"],
    selected: false,
    selectionMode: false,
    typeIcon: "",
    showCheckbox: true,
    imageFit: "cover",
    thumbnailVariant: "default",
    containPadding: true,
    containScale: 1,
  }
);

const emit = defineEmits<{
  (e: "view"): void;
  (e: "action"): void;
  (e: "select", selected: boolean): void;
}>();

const isHovered = ref(false);
const isSelected = computed(() => props.selected);
const fallbackAspectRatio = "1 / 1";
const resolvedAspectRatio = ref(props.aspectRatio || fallbackAspectRatio);
const thumbnailImageStyle = computed(() => ({
  objectFit: props.imageFit,
  padding:
    props.imageFit === "contain" &&
    props.thumbnailVariant !== "audio" &&
    props.containPadding
      ? "10px"
      : "0",
  transform:
    props.imageFit === "contain" && props.containScale !== 1
      ? `scale(${props.containScale})`
      : undefined,
}));
const thumbnailStyle = computed(() => ({
  aspectRatio: resolvedAspectRatio.value,
}));

const displayTags = computed(() => props.tags?.slice(0, 2) || []);

watch(
  () => props.aspectRatio,
  (value) => {
    resolvedAspectRatio.value = value || fallbackAspectRatio;
  },
  { immediate: true }
);

watch(
  () => props.image,
  () => {
    if (!props.aspectRatio) {
      resolvedAspectRatio.value = fallbackAspectRatio;
    }
  }
);

const handleImageLoad = (event: Event) => {
  if (props.aspectRatio) return;

  const image = event.target as HTMLImageElement | null;
  if (!image) return;

  if (image.naturalWidth <= 0 || image.naturalHeight <= 0) return;

  resolvedAspectRatio.value = `${image.naturalWidth} / ${image.naturalHeight}`;
};

const toggleSelect = () => {
  emit("select", !isSelected.value);
};
</script>

<style scoped lang="scss">
.standard-card {
  container: resource-card / inline-size;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  cursor: pointer;
  background: var(--bg-card, #fff);
  border: var(--border-width, 1px) solid var(--border-color, #e2e8f0);
  border-radius: var(
    --standard-page-max-radius,
    calc(var(--radius-lg, 24px) / 3)
  );
  transition: all var(--transition-normal, 0.2s ease);

  &.supports-long-press {
    -webkit-touch-callout: none;
    user-select: none;
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color, #00baff);
    outline-offset: 2px;
  }

  &:hover {
    box-shadow: var(--shadow-lg);
    transform: translateY(-4px);
  }

  &.is-selected {
    border-color: var(--primary-color, #00baff);
    box-shadow: 0 0 0 2px var(--primary-light, rgb(0 186 255 / 10%)); // Keep specifics for now or use --shadow-focus
  }
}

// ===== Checkbox =====
.card-checkbox {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 10;
  opacity: 0;
  transition: opacity var(--transition-fast, 0.15s ease);

  &.visible {
    opacity: 1;
  }
}

.checkbox-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  cursor: pointer;
  background: var(--bg-overlay, rgb(0 0 0 / 30%));
  backdrop-filter: blur(4px);
  border: 2px solid rgb(255 255 255 / 80%);
  border-radius: 6px;
  transition: all var(--transition-fast, 0.15s ease);

  &:hover {
    background: var(--bg-overlay-hover, rgb(0 0 0 / 50%));
    border-color: #fff;
  }

  &.checked {
    background: var(--primary-color, #00baff);
    border-color: var(--primary-color, #00baff);

    .svg-inline--fa {
      font-size: 16px;
      font-weight: 600;
      color: #fff; // Always white on primary
    }
  }
}

// ===== Type Icon =====
.card-type-icon {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: #fff;
  pointer-events: none;
  background: var(--bg-overlay, rgb(0 0 0 / 30%));
  backdrop-filter: blur(8px);
  border: 1px solid rgb(255 255 255 / 20%);
  border-radius: 50%;
  transition: all var(--transition-fast, 0.15s ease);

  .svg-inline--fa {
    font-size: 16px;
  }
}

.standard-card:hover .card-type-icon {
  background: var(--bg-overlay-hover, rgb(0 0 0 / 50%));
  border-color: rgb(255 255 255 / 40%);
}

// ===== Thumbnail =====
.card-thumbnail {
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.thumbnail-inner {
  width: 100%;
  height: 100%;
  background: var(--resource-card-thumbnail-bg, #f4f7fa);

  img {
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    object-position: center;
    background: transparent;
    transition: transform var(--transition-slow, 0.3s ease);
  }
}

.standard-card:hover .thumbnail-inner img {
  transform: scale(1.05);
}

.audio-thumbnail {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.audio-thumbnail-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: clamp(72px, 34%, 112px);
  height: clamp(72px, 34%, 112px);
  background: linear-gradient(180deg, #1fb8f2 0%, #0999df 100%);
  border-radius: 50%;
  box-shadow: 0 10px 24px rgb(9 153 223 / 22%);
  transition: transform var(--transition-slow, 0.3s ease);

  .svg-inline--fa {
    font-size: clamp(32px, 14%, 46px);
    color: #fff;
  }
}

.standard-card:hover .audio-thumbnail-badge {
  transform: scale(1.05);
}

.thumbnail-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: var(--resource-card-thumbnail-bg, #f4f7fa);

  .svg-inline--fa {
    font-size: 48px;
    color: var(--text-muted, #94a3b8);
  }
}

// ===== Tags on Thumbnail =====
.thumbnail-tags {
  position: absolute;
  bottom: 12px;
  left: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-badge {
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary, #1e293b);
  background: var(--bg-card, #fff);
  backdrop-filter: blur(4px);
  border-radius: var(
    --standard-page-max-radius,
    calc(var(--radius-lg, 24px) / 3)
  );
  opacity: 0.9;
}

.tag-more {
  padding: 4px 8px;
  font-size: 12px;
  color: #fff;
  background: var(--bg-overlay, rgb(0 0 0 / 50%));
  border-radius: var(
    --standard-page-max-radius,
    calc(var(--radius-lg, 24px) / 3)
  );
}

// ===== Content Area =====
.card-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  padding: 16px;
}

.card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text-primary, #1e293b);
  overflow-wrap: anywhere;
  white-space: normal;
}

.card-description {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary, #64748b);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.card-meta {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  min-width: 0;
  margin-top: auto;
}

.meta-item {
  display: flex;
  gap: 4px;
  align-items: center;
  min-width: 0;
  max-width: 100%;
  font-size: 12px;
  color: var(--text-muted, #94a3b8);
}

.meta-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta-icon {
  flex-shrink: 0;
  font-size: 14px;
}

@container resource-card (width <= 260px) {
  .card-meta {
    grid-template-columns: minmax(0, 1fr);
    gap: 6px;
  }
}

// ===== Action Footer =====
.card-action {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 14px 16px;
  cursor: pointer;
  background: var(--bg-hover, #f8fafc);
  border-top: var(--border-width, 1px) solid var(--border-color, #e2e8f0);
  transition: background var(--transition-fast, 0.15s ease);

  &:hover {
    background: var(--bg-active, #e2e8f0);
  }
}

.action-icon {
  font-size: 18px;
  color: var(--text-secondary, #64748b);
}

.action-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary, #64748b);
}

.card-action:hover .action-icon,
.card-action:hover .action-text {
  color: var(--primary-color, #00baff);
}

.card-action-group {
  background: var(--bg-hover, #f8fafc);
  border-top: var(--border-width, 1px) solid var(--border-color, #e2e8f0);
}
</style>
