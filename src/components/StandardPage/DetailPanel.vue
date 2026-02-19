<template>
  <Teleport to="body">
    <Transition name="panel-fade">
      <div
        v-if="modelValue"
        class="detail-panel-overlay"
        @click.self="handleClose"
      >
        <Transition name="panel-slide">
          <div
            v-if="modelValue"
            class="detail-panel"
            :style="{ width: panelWidth }"
          >
            <!-- Header -->
            <div class="panel-header">
              <h3 class="panel-title">{{ title }}</h3>
              <button class="panel-close" @click="handleClose">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <!-- Content -->
            <div class="panel-body" v-loading="loading">
              <!-- Preview Area -->
              <div class="panel-preview" :style="{ height: previewHeight }">
                <slot name="preview">
                  <div class="preview-placeholder">
                    <span class="material-symbols-outlined">{{
                      placeholderIcon
                    }}</span>
                    <span v-if="placeholderText">{{ placeholderText }}</span>
                  </div>
                </slot>
              </div>

              <!-- Info Area -->
              <div class="panel-info">
                <!-- Name with inline edit -->
                <div class="info-name-section">
                  <div v-if="!isEditing" class="info-name-row">
                    <h4 class="info-name">{{ name }}</h4>
                    <button
                      v-if="editable"
                      class="btn-icon-only"
                      @click="startEditing"
                    >
                      <span class="material-symbols-outlined">edit</span>
                    </button>
                  </div>
                  <div v-else class="info-name-edit">
                    <input
                      ref="nameInputRef"
                      v-model="editingName"
                      type="text"
                      class="name-input"
                      @keyup.enter="saveEdit"
                      @keyup.escape="cancelEdit"
                    />
                    <div class="edit-actions">
                      <button class="btn-edit-cancel" @click="cancelEdit">
                        取消
                      </button>
                      <button
                        class="btn-edit-save"
                        @click="saveEdit"
                        :disabled="!editingName.trim()"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Properties Table -->
                <div class="info-table">
                  <div
                    v-for="(item, index) in properties"
                    :key="index"
                    class="info-row"
                  >
                    <span class="info-label">{{ item.label }}</span>
                    <span class="info-value">{{ item.value }}</span>
                  </div>
                </div>

                <!-- Extra slot for custom info -->
                <slot name="info"></slot>
              </div>
            </div>

            <!-- Footer Area (Fixed) -->
            <div class="panel-footer">
              <!-- Actions Area -->
              <div
                class="panel-actions"
                :class="{ 'layout-grid': actionLayout === 'grid' }"
              >
                <slot name="actions">
                  <template v-if="actionLayout === 'grid'">
                    <!-- Top: Secondary Action (Enter Editor) -->
                    <button
                      v-if="secondaryAction"
                      class="btn-pill-primary"
                      @click="$emit('secondary')"
                    >
                      <span class="material-symbols-outlined">edit_note</span>
                      {{ secondaryActionText }}
                    </button>
                    <!-- Bottom: Download and Delete side by side -->
                    <div class="actions-row">
                      <button
                        class="btn-pill-secondary"
                        @click="$emit('download')"
                      >
                        <span class="material-symbols-outlined">{{
                          downloadIcon
                        }}</span>
                        {{ downloadText || "复制" }}
                      </button>
                      <button
                        v-if="showDelete"
                        class="btn-pill-danger"
                        @click="$emit('delete')"
                      >
                        <span class="material-symbols-outlined">delete</span>
                        {{ deleteText || "删除" }}
                      </button>
                    </div>
                  </template>
                  <template v-else>
                    <button class="btn-primary-full" @click="$emit('download')">
                      <span class="material-symbols-outlined">download</span>
                      {{ downloadText || "下载" }}
                    </button>
                    <button
                      v-if="secondaryAction"
                      class="btn-text-link"
                      @click="$emit('secondary')"
                    >
                      {{ secondaryActionText }}
                    </button>
                  </template>
                </slot>
              </div>

              <!-- Danger Zone (only for stacked layout) -->
              <div
                v-if="showDelete && actionLayout === 'stacked'"
                class="panel-danger"
              >
                <button class="btn-danger-text" @click="$emit('delete')">
                  <span class="material-symbols-outlined">delete</span>
                  {{ deleteText || "删除此资源" }}
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue";

interface PropertyItem {
  label: string;
  value: string | number;
}

interface Props {
  modelValue: boolean;
  title?: string;
  name?: string;
  loading?: boolean;
  editable?: boolean;
  properties?: PropertyItem[];
  previewHeight?: string;
  placeholderIcon?: string;
  placeholderText?: string;
  downloadText?: string;
  downloadIcon?: string;
  deleteText?: string;
  secondaryAction?: boolean;
  secondaryActionText?: string;
  showDelete?: boolean;
  width?: string;
  actionLayout?: "stacked" | "grid";
}

const props = withDefaults(defineProps<Props>(), {
  title: "资源详情",
  name: "",
  loading: false,
  editable: true,
  properties: () => [],
  previewHeight: "300px",
  placeholderIcon: "image",
  placeholderText: "",
  downloadText: "下载",
  downloadIcon: "content_copy",
  deleteText: "删除此资源",
  secondaryAction: false,
  secondaryActionText: "在编辑器中使用",
  showDelete: true,
  width: "840px",
  actionLayout: "stacked",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "close"): void;
  (e: "download"): void;
  (e: "rename", newName: string): void;
  (e: "delete"): void;
  (e: "secondary"): void;
}>();

const panelWidth = computed(() => props.width);

// Inline editing state
const isEditing = ref(false);
const editingName = ref("");
const nameInputRef = ref<HTMLInputElement | null>(null);

const startEditing = () => {
  editingName.value = props.name;
  isEditing.value = true;
  nextTick(() => {
    nameInputRef.value?.focus();
    nameInputRef.value?.select();
  });
};

const cancelEdit = () => {
  isEditing.value = false;
  editingName.value = "";
};

const saveEdit = () => {
  if (editingName.value.trim() && editingName.value !== props.name) {
    emit("rename", editingName.value.trim());
  }
  isEditing.value = false;
};

// Reset editing state when panel closes or name changes
watch(
  () => props.modelValue,
  (newVal) => {
    if (!newVal) {
      isEditing.value = false;
      editingName.value = "";
    }
  }
);

const handleClose = () => {
  emit("update:modelValue", false);
  emit("close");
};

// Close on Escape key (but not when editing)
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape" && props.modelValue && !isEditing.value) {
    handleClose();
  }
};

onMounted(() => {
  document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
});
</script>

<style scoped lang="scss">
// Overlay
.detail-panel-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg-overlay, rgba(0, 0, 0, 0.3));
  z-index: 2000;
  display: flex;
  justify-content: flex-end;
  backdrop-filter: blur(2px);
}

// Panel
.detail-panel {
  height: 100%;
  background: var(--bg-card, #fff);
  box-shadow: -4px 0 24px var(--shadow-lg, rgba(0, 0, 0, 0.15));
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

// Header
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: var(--border-width, 1px) solid var(--border-color, #e2e8f0);
  flex-shrink: 0;
}

.panel-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
}

.panel-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm, 8px);
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);

  &:hover {
    background: var(--bg-hover, #f1f5f9);
    color: var(--text-primary, #1e293b);
  }

  .material-symbols-outlined {
    font-size: 20px;
  }
}

// Body (Scrollable)
.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

// Footer (Fixed)
.panel-footer {
  flex-shrink: 0;
  padding: 24px;
  border-top: var(--border-width, 1px) solid var(--border-color, #e2e8f0);
  background: var(--bg-card, #fff);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

// Preview
.panel-preview {
  width: 100%;
  flex-shrink: 0;
  background: var(--bg-secondary, #f1f5f9);
  border-radius: var(--radius-lg, 16px);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;

  :deep(img),
  :deep(video) {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--text-muted, #94a3b8);

  .material-symbols-outlined {
    font-size: 48px;
  }

  span:last-child {
    font-size: 14px;
  }
}

// Info
.panel-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-name-section {
  min-height: 36px;
}

.info-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// Inline edit styles
.info-name-edit {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.name-input {
  width: 100%;
  height: 44px;
  padding: 0 16px;
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary, #1e293b);
  background: var(
    --bg-input,
    var(--bg-card, #fff)
  ); // Use bg-input if available
  border: 2px solid var(--primary-color, #03a9f4);
  border-radius: var(--radius-md, 12px);
  outline: none;
  transition: all var(--transition-fast, 0.15s ease);

  &:focus {
    box-shadow: 0 0 0 3px var(--primary-light, rgba(3, 169, 244, 0.15));
  }

  &::placeholder {
    color: var(--text-muted, #94a3b8);
  }
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-edit-cancel {
  height: 36px;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary, #64748b);
  background: transparent;
  border: var(--border-width, 1px) solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-md, 10px);
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);

  &:hover {
    background: var(--bg-hover, #f1f5f9);
    color: var(--text-primary, #1e293b);
  }
}

.btn-edit-save {
  height: 36px;
  padding: 0 20px;
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  background: var(--primary-color, #03a9f4);
  border: none;
  border-radius: var(--radius-md, 10px);
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);

  &:hover:not(:disabled) {
    background: var(--primary-hover, var(--primary-dark, #0288d1));
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-icon-only {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm, 6px);
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
  flex-shrink: 0;

  &:hover {
    background: var(--bg-hover, #f1f5f9);
    color: var(--primary-color, #03a9f4);
  }

  .material-symbols-outlined {
    font-size: 18px;
  }
}

.info-table {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-top: 8px;
}

.info-row {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  padding: 16px 20px;
  background-color: var(--bg-secondary, #f8fafc);
  border-radius: var(--radius-md, 12px);
  gap: 8px;
  transition: all var(--transition-normal, 0.2s ease);

  &:hover {
    background-color: var(--bg-hover, #f1f5f9);
  }
}

.info-label {
  font-size: 13px;
  color: var(--text-secondary, #94a3b8);
  line-height: 1;
}

.info-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
  line-height: 1.4;
  word-break: break-all;
}

// Actions
.panel-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn-primary-full {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 48px;
  border: none;
  background: var(--primary-color, #03a9f4);
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  border-radius: var(--radius-md, 12px);
  cursor: pointer;
  transition: all var(--transition-normal, 0.2s ease);

  &:hover {
    background: var(--primary-hover, var(--primary-dark, #0288d1));
    transform: translateY(-1px);
  }

  .material-symbols-outlined {
    font-size: 20px;
  }
}

.btn-text-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  height: 40px;
  border: none;
  background: transparent;
  color: var(--primary-color, #03a9f4);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);

  &:hover {
    text-decoration: underline;
  }
}

// Danger Zone
.panel-danger {
  padding-top: 16px;
  border-top: var(--border-width, 1px) solid var(--border-color, #e2e8f0);
}

.btn-danger-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 40px;
  border: none;
  background: transparent;
  color: var(--danger-color, #ef4444);
  font-size: 14px;
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);

  &:hover {
    background: var(--danger-light, rgba(239, 68, 68, 0.1));
    border-radius: var(--radius-sm, 8px);
  }

  .material-symbols-outlined {
    font-size: 18px;
  }
}

// Grid Layout Actions
.panel-actions.layout-grid {
  gap: 16px;
}

.actions-row {
  display: flex;
  gap: 16px;
  width: 100%;
}

.btn-pill-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 52px;
  border: none;
  background: var(--primary-color, #03a9f4);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  border-radius: 26px;
  cursor: pointer;
  transition: all var(--transition-normal, 0.2s ease);
  box-shadow: 0 4px 12px var(--primary-light, rgba(3, 169, 244, 0.25));

  &:hover {
    background: var(--primary-hover, var(--primary-dark, #0288d1));
    transform: translateY(-1px);
    box-shadow: 0 6px 16px var(--primary-light, rgba(3, 169, 244, 0.35));
  }

  &:active {
    transform: translateY(0);
  }
}

.btn-pill-secondary {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 48px;
  border: 1.5px solid var(--border-color, #e2e8f0);
  background: var(--bg-card, #fff);
  color: var(--text-secondary, #64748b);
  font-size: 15px;
  font-weight: 500;
  border-radius: 24px;
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);

  &:hover {
    border-color: var(--primary-color, #03a9f4);
    color: var(--primary-color, #03a9f4);
    background: var(--primary-light, rgba(3, 169, 244, 0.05));
  }

  .material-symbols-outlined {
    font-size: 20px;
  }
}

.btn-pill-danger {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 48px;
  border: none;
  background: transparent;
  color: var(--danger-color, #ef4444);
  font-size: 15px;
  font-weight: 500;
  border-radius: 24px;
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);

  &:hover {
    background: var(--danger-light, rgba(239, 68, 68, 0.1));
  }

  .material-symbols-outlined {
    font-size: 20px;
  }
}

// Transitions
.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: opacity 0.3s ease;
}

.panel-fade-enter-from,
.panel-fade-leave-to {
  opacity: 0;
}

.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: transform 0.3s ease;
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  transform: translateX(100%);
}
</style>
