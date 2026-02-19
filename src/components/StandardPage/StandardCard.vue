<template>
  <div
    class="standard-card"
    :class="{ 'is-selected': isSelected, 'selection-mode': selectionMode }"
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
        <span v-if="isSelected" class="material-symbols-outlined">check</span>
      </div>
    </div>

    <!-- Type Icon -->
    <div
      v-if="typeIcon"
      class="card-type-icon"
      :class="{ 'with-checkbox': selectionMode || isHovered || isSelected }"
    >
      <span class="material-symbols-outlined">{{ typeIcon }}</span>
    </div>

    <!-- Thumbnail Area -->
    <div class="card-thumbnail" :style="{ aspectRatio }" @click="$emit('view')">
      <div class="thumbnail-inner">
        <img v-if="image" :src="image" :alt="title" />
        <div v-else class="thumbnail-placeholder">
          <span class="material-symbols-outlined">{{ placeholderIcon }}</span>
        </div>
      </div>

      <!-- Hover Overlay -->
      <div class="thumbnail-overlay">
        <button class="overlay-btn" @click.stop="$emit('view')">
          <span class="material-symbols-outlined">info</span>
          <span>查看信息</span>
        </button>
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
      <h3 class="card-title" :title="title">{{ title }}</h3>
      <p v-if="description" class="card-description">{{ description }}</p>
      <div v-if="meta" class="card-meta">
        <span v-if="meta.author" class="meta-item">
          <span class="material-symbols-outlined meta-icon">person</span>
          {{ meta.author }}
        </span>
        <span v-if="meta.date" class="meta-item">
          <span class="material-symbols-outlined meta-icon">schedule</span>
          {{ meta.date }}
        </span>
      </div>
    </div>

    <!-- Action Footer -->
    <div v-if="actionText" class="card-action" @click.stop="$emit('action')">
      <span class="material-symbols-outlined action-icon">{{
        actionIcon
      }}</span>
      <span class="action-text">{{ actionText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

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
    actionIcon?: string;
    placeholderIcon?: string;
    selected?: boolean;
    selectionMode?: boolean;
    typeIcon?: string;
    showCheckbox?: boolean;
    aspectRatio?: string;
  }>(),
  {
    actionIcon: "edit",
    placeholderIcon: "image",
    selected: false,
    selectionMode: false,
    typeIcon: "",
    showCheckbox: true,
    aspectRatio: "1 / 1",
  }
);

const emit = defineEmits<{
  (e: "view"): void;
  (e: "action"): void;
  (e: "select", selected: boolean): void;
}>();

const isHovered = ref(false);
const isSelected = computed(() => props.selected);

const displayTags = computed(() => props.tags?.slice(0, 2) || []);

const toggleSelect = () => {
  emit("select", !isSelected.value);
};
</script>

<style scoped lang="scss">
.standard-card {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--bg-card, #fff);
  border: var(--border-width, 1px) solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 24px);
  overflow: hidden;
  transition: all var(--transition-normal, 0.2s ease);

  &:hover {
    box-shadow: var(--shadow-lg);
    transform: translateY(-4px);
  }

  &.is-selected {
    border-color: var(--primary-color, #00baff);
    box-shadow: 0 0 0 2px var(--primary-light, rgba(0, 186, 255, 0.1)); // Keep specifics for now or use --shadow-focus
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
  width: 24px;
  height: 24px;
  border: 2px solid rgba(255, 255, 255, 0.8);
  border-radius: 6px;
  background: var(--bg-overlay, rgba(0, 0, 0, 0.3));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
  backdrop-filter: blur(4px);

  &:hover {
    background: var(--bg-overlay-hover, rgba(0, 0, 0, 0.5));
    border-color: #fff;
  }

  &.checked {
    background: var(--primary-color, #00baff);
    border-color: var(--primary-color, #00baff);

    .material-symbols-outlined {
      color: #fff; // Always white on primary
      font-size: 16px;
      font-weight: 600;
    }
  }
}

// ===== Type Icon =====
.card-type-icon {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  width: 28px;
  height: 28px;
  background: var(--bg-overlay, rgba(0, 0, 0, 0.3));
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  pointer-events: none;
  transition: all var(--transition-fast, 0.15s ease);

  .material-symbols-outlined {
    font-size: 16px;
  }
}

.standard-card:hover .card-type-icon {
  background: var(--bg-overlay-hover, rgba(0, 0, 0, 0.5));
  border-color: rgba(255, 255, 255, 0.4);
}

// ===== Thumbnail =====
.card-thumbnail {
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  cursor: pointer;
}

.thumbnail-inner {
  width: 100%;
  height: 100%;
  background: var(--bg-secondary, #f1f5f9);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform var(--transition-slow, 0.3s ease);
  }
}

.standard-card:hover .thumbnail-inner img {
  transform: scale(1.05);
}

.thumbnail-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    135deg,
    var(--bg-secondary, #f1f5f9) 0%,
    var(--bg-tertiary, #e2e8f0) 100%
  );

  .material-symbols-outlined {
    font-size: 48px;
    color: var(--text-muted, #94a3b8);
  }
}

// ===== Hover Overlay =====
.thumbnail-overlay {
  position: absolute;
  inset: 0;
  background: var(--bg-overlay, rgba(0, 0, 0, 0.5));
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--transition-normal, 0.2s ease);
  backdrop-filter: blur(2px);
}

.standard-card:hover .thumbnail-overlay {
  opacity: 1;
}

.overlay-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: var(--bg-card, #fff);
  border: none;
  border-radius: var(--radius-full, 9999px);
  color: var(--text-primary, #1e293b);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
  transform: translateY(10px);
  box-shadow: var(--shadow-md, 0 4px 12px rgba(0, 0, 0, 0.15));

  .material-symbols-outlined {
    font-size: 20px;
  }

  &:hover {
    background: var(--bg-hover, #f8fafc);
    transform: translateY(0) scale(1.05);
  }
}

.standard-card:hover .overlay-btn {
  transform: translateY(0);
}

// ===== Tags on Thumbnail =====
.thumbnail-tags {
  position: absolute;
  bottom: 12px;
  left: 12px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tag-badge {
  padding: 4px 10px;
  background: var(--bg-card, #fff);
  border-radius: var(--radius-full, 9999px);
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary, #1e293b);
  backdrop-filter: blur(4px);
  opacity: 0.9;
}

.tag-more {
  padding: 4px 8px;
  background: var(--bg-overlay, rgba(0, 0, 0, 0.5));
  border-radius: var(--radius-full, 9999px);
  font-size: 12px;
  color: #fff;
}

// ===== Content Area =====
.card-content {
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-description {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary, #64748b);
  line-height: 1.5;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  gap: 12px;
  margin-top: auto;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted, #94a3b8);
}

.meta-icon {
  font-size: 14px;
}

// ===== Action Footer =====
.card-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 16px;
  background: var(--bg-hover, #f8fafc);
  border-top: var(--border-width, 1px) solid var(--border-color, #e2e8f0);
  cursor: pointer;
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
</style>
