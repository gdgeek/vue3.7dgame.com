<template>
  <Teleport to="body">
    <Transition name="panel-fade">
      <div
        v-if="modelValue"
        class="detail-panel-overlay"
        :style="{ zIndex: String(overlayZIndex) }"
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
              <h3 class="panel-title">{{ title || t("ui.resourceDetail") }}</h3>
              <button class="panel-close" @click="handleClose">
                <font-awesome-icon :icon="['fas', 'xmark']"></font-awesome-icon>
              </button>
            </div>

            <!-- Content -->
            <div class="panel-body" v-loading="loading">
              <!-- Preview Area -->
              <div class="panel-preview" :style="{ height: previewHeight }">
                <slot name="preview">
                  <div class="preview-placeholder">
                    <font-awesome-icon
                      :icon="placeholderIcon"
                    ></font-awesome-icon>
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
                      <font-awesome-icon
                        :icon="['fas', 'pen-to-square']"
                      ></font-awesome-icon>
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
                        {{ t("common.cancel") }}
                      </button>
                      <button
                        class="btn-edit-save"
                        @click="saveEdit"
                        :disabled="!editingName.trim()"
                      >
                        {{ t("ui.save") }}
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
                    <div class="info-value">
                      <template v-if="item.slotName">
                        <slot :name="`property-${item.slotName}`" :item="item">
                          {{ item.value }}
                        </slot>
                      </template>
                      <template v-else>
                        {{ item.value }}
                      </template>
                    </div>
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
                      <font-awesome-icon
                        :icon="['fas', 'file-lines']"
                      ></font-awesome-icon>
                      {{ secondaryActionText || t("ui.useInEditor") }}
                    </button>
                    <!-- Bottom: Download and Delete side by side -->
                    <div class="actions-row">
                      <button
                        class="btn-pill-secondary"
                        @click="$emit('download')"
                      >
                        <font-awesome-icon
                          :icon="downloadIcon"
                        ></font-awesome-icon>
                        {{ downloadText || t("ui.copy") }}
                      </button>
                      <button
                        v-if="showDelete"
                        class="btn-pill-danger"
                        @click="$emit('delete')"
                      >
                        <font-awesome-icon
                          :icon="['fas', 'trash-can']"
                        ></font-awesome-icon>
                        {{ deleteText || t("common.delete") }}
                      </button>
                    </div>
                  </template>
                  <template v-else>
                    <button class="btn-primary-full" @click="$emit('download')">
                      <font-awesome-icon
                        :icon="['fas', 'download']"
                      ></font-awesome-icon>
                      {{ downloadText || t("ui.download") }}
                    </button>
                    <button
                      v-if="secondaryAction"
                      class="btn-text-link"
                      @click="$emit('secondary')"
                    >
                      {{ secondaryActionText || t("ui.useInEditor") }}
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
                  <font-awesome-icon
                    :icon="['fas', 'trash-can']"
                  ></font-awesome-icon>
                  {{ deleteText || t("ui.deleteResource") }}
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
import { useI18n } from "vue-i18n";

const { t } = useI18n();

interface PropertyItem {
  label: string;
  value: string | number;
  slotName?: string;
}

interface Props {
  modelValue: boolean;
  title?: string;
  name?: string;
  loading?: boolean;
  editable?: boolean;
  properties?: PropertyItem[];
  previewHeight?: string;
  placeholderIcon?: string | string[];
  placeholderText?: string;
  downloadText?: string;
  downloadIcon?: string | string[];
  deleteText?: string;
  secondaryAction?: boolean;
  secondaryActionText?: string;
  showDelete?: boolean;
  width?: string;
  actionLayout?: "stacked" | "grid";
  zIndex?: number;
}

const props = withDefaults(defineProps<Props>(), {
  title: "",
  name: "",
  loading: false,
  editable: true,
  properties: () => [],
  previewHeight: "300px",
  placeholderIcon: () => ["fas", "image"],
  placeholderText: "",
  downloadText: "",
  downloadIcon: () => ["fas", "copy"],
  deleteText: "",
  secondaryAction: false,
  secondaryActionText: "",
  showDelete: true,
  width: "840px",
  actionLayout: "stacked",
  zIndex: 2000,
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
const overlayZIndex = computed(() => props.zIndex);

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
  z-index: 2000;
  display: flex;
  justify-content: flex-end;
  background: var(--bg-overlay, rgb(0 0 0 / 30%));
  backdrop-filter: blur(2px);
}

// Panel
.detail-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--bg-card, #fff);
  box-shadow: -4px 0 24px var(--shadow-lg, rgb(0 0 0 / 15%));
}

// Header
.panel-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: var(--border-width, 1px) solid var(--border-color, #e2e8f0);
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
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm, 8px);
  transition: all var(--transition-fast, 0.15s ease);

  &:hover {
    color: var(--text-primary, #1e293b);
    background: var(--bg-hover, #f1f5f9);
  }

  .svg-inline--fa {
    font-size: 20px;
  }
}

// Body (Scrollable)
.panel-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  overflow-y: auto;
}

// Footer (Fixed)
.panel-footer {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: 12px;
  padding: 24px;
  background: var(--bg-card, #fff);
  border-top: var(--border-width, 1px) solid var(--border-color, #e2e8f0);
}

// Preview
.panel-preview {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 100%;
  overflow: hidden;
  background: var(--bg-secondary, #f1f5f9);
  border-radius: var(--radius-lg, 16px);

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
  gap: 8px;
  align-items: center;
  color: var(--text-muted, #94a3b8);

  .svg-inline--fa {
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
  gap: 8px;
  align-items: center;
}

.info-name {
  flex: 1;
  margin: 0;
  overflow: hidden;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
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
    box-shadow: 0 0 0 3px var(--primary-light, rgb(3 169 244 / 15%));
  }

  &::placeholder {
    color: var(--text-muted, #94a3b8);
  }
}

.edit-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-edit-cancel {
  height: 36px;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  background: transparent;
  border: var(--border-width, 1px) solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-md, 10px);
  transition: all var(--transition-fast, 0.15s ease);

  &:hover {
    color: var(--text-primary, #1e293b);
    background: var(--bg-hover, #f1f5f9);
  }
}

.btn-edit-save {
  height: 36px;
  padding: 0 20px;
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  cursor: pointer;
  background: var(--primary-color, #03a9f4);
  border: none;
  border-radius: var(--radius-md, 10px);
  transition: all var(--transition-fast, 0.15s ease);

  &:hover:not(:disabled) {
    background: var(--primary-hover, var(--primary-dark, #0288d1));
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}

.btn-icon-only {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm, 6px);
  transition: all var(--transition-fast, 0.15s ease);

  &:hover {
    color: var(--primary-color, #03a9f4);
    background: var(--bg-hover, #f1f5f9);
  }

  .svg-inline--fa {
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
  gap: 8px;
  align-items: flex-start;
  justify-content: center;
  padding: 16px 20px;
  background-color: var(--bg-secondary, #f8fafc);
  border-radius: var(--radius-md, 12px);
  transition: all var(--transition-normal, 0.2s ease);

  &:hover {
    background-color: var(--bg-hover, #f1f5f9);
  }
}

.info-label {
  font-size: 13px;
  line-height: 1;
  color: var(--text-secondary, #94a3b8);
}

.info-value {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text-primary, #1e293b);
  word-break: break-all;
}

// Actions
.panel-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Slot actions: dual primary buttons + bottom row actions */
.panel-actions :deep(.dual-primary-btn) {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 48px;
  font-size: 15px;
  font-weight: 500;
  color: #fff;
  cursor: pointer;
  background: var(--primary-color, #03a9f4);
  border: none;
  border-radius: var(--radius-md, 12px);
  transition: all var(--transition-normal, 0.2s ease);
}

.panel-actions :deep(.dual-primary-btn:hover) {
  background: var(--primary-hover, var(--primary-dark, #0288d1));
  transform: translateY(-1px);
}

/* Slot primary action (entity/scene edit) should match legacy large size */
.panel-actions :deep(.enter-edit-btn) {
  display: inline-flex !important;
  gap: 8px !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100% !important;
  height: 52px !important;
  min-height: 52px !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  border-radius: 26px !important;
}

.panel-actions :deep(.actions-row) {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.panel-actions :deep(.actions-row .btn-pill-secondary),
.panel-actions :deep(.actions-row .btn-pill-danger) {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 44px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-radius: var(--radius-md, 12px);
  transition: all var(--transition-fast, 0.15s ease);
}

.panel-actions :deep(.actions-row .btn-pill-secondary) {
  color: var(--text-secondary, #64748b);
  background: var(--bg-card, #fff);
  border: var(--border-width, 1px) solid var(--border-color, #e2e8f0);
}

.panel-actions :deep(.actions-row .btn-pill-secondary:hover) {
  color: var(--primary-color, #03a9f4);
  border-color: var(--primary-color, #03a9f4);
}

.panel-actions :deep(.actions-row .btn-pill-danger) {
  color: #ef4444;
  background: #fff;
  border: var(--border-width, 1px) solid #fecaca;
}

.panel-actions :deep(.actions-row .btn-pill-danger:hover) {
  background: #fef2f2;
  border-color: #fca5a5;
}

.btn-primary-full {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 48px;
  font-size: 15px;
  font-weight: 500;
  color: #fff;
  cursor: pointer;
  background: var(--primary-color, #03a9f4);
  border: none;
  border-radius: var(--radius-md, 12px);
  transition: all var(--transition-normal, 0.2s ease);

  &:hover {
    background: var(--primary-hover, var(--primary-dark, #0288d1));
    transform: translateY(-1px);
  }

  .svg-inline--fa {
    font-size: 20px;
  }
}

.btn-text-link {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 40px;
  font-size: 14px;
  font-weight: 500;
  color: var(--primary-color, #03a9f4);
  cursor: pointer;
  background: transparent;
  border: none;
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
  gap: 6px;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 40px;
  font-size: 14px;
  color: var(--danger-color, #ef4444);
  cursor: pointer;
  background: transparent;
  border: none;
  transition: all var(--transition-fast, 0.15s ease);

  &:hover {
    background: var(--danger-light, rgb(239 68 68 / 10%));
    border-radius: var(--radius-sm, 8px);
  }

  .svg-inline--fa {
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
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 52px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  background: var(--primary-color, #03a9f4);
  border: none;
  border-radius: 26px;
  box-shadow: 0 4px 12px var(--primary-light, rgb(3 169 244 / 25%));
  transition: all var(--transition-normal, 0.2s ease);

  &:hover {
    background: var(--primary-hover, var(--primary-dark, #0288d1));
    box-shadow: 0 6px 16px var(--primary-light, rgb(3 169 244 / 35%));
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
}

.btn-pill-secondary {
  display: flex;
  flex: 1;
  gap: 6px;
  align-items: center;
  justify-content: center;
  height: 38px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  background: var(--bg-card, #fff);
  border: 1.5px solid var(--border-color, #e2e8f0);
  border-radius: 19px;
  transition: all var(--transition-fast, 0.15s ease);

  &:hover {
    color: var(--primary-color, #03a9f4);
    background: var(--primary-light, rgb(3 169 244 / 5%));
    border-color: var(--primary-color, #03a9f4);
  }

  .svg-inline--fa {
    font-size: 14px;
  }
}

.btn-pill-danger {
  display: flex;
  flex: 1;
  gap: 6px;
  align-items: center;
  justify-content: center;
  height: 38px;
  font-size: 13px;
  font-weight: 500;
  color: var(--danger-color, #ef4444);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 19px;
  transition: all var(--transition-fast, 0.15s ease);

  &:hover {
    background: var(--danger-light, rgb(239 68 68 / 10%));
  }

  .svg-inline--fa {
    font-size: 14px;
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
