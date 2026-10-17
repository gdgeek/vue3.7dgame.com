<template>
  <div v-if="canManageProperties" class="scene-properties">
    <section
      class="scene-properties__current"
      :aria-label="t('verse.properties.current')"
    >
      <h3>{{ t("verse.properties.currentLabel") }}</h3>
      <div :aria-busy="loading" aria-live="polite">
        <p v-if="loading" role="status">{{ t("verse.properties.loading") }}</p>
        <div v-else-if="loadError" class="scene-properties__error" role="alert">
          <p>{{ loadError }}</p>
          <el-button :disabled="saving" @click="loadProperties">{{
            t("verse.properties.retry")
          }}</el-button>
        </div>
        <p v-else-if="properties.length === 0" class="scene-properties__empty">
          {{ t("verse.properties.empty") }}
        </p>
        <table v-else class="scene-properties__table">
          <colgroup>
            <col class="scene-properties__key-column" />
            <col />
            <col class="scene-properties__action-column" />
          </colgroup>
          <caption class="scene-properties__caption">
            {{
              t("verse.properties.title")
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ t("verse.properties.columnKey") }}</th>
              <th scope="col">{{ t("verse.properties.columnInfo") }}</th>
              <th scope="col">{{ t("verse.properties.actions") }}</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="property in properties" :key="property.id">
              <tr class="scene-properties__row">
                <th scope="row">
                  <code class="scene-properties__key">{{ property.key }}</code>
                </th>
                <td class="scene-properties__description">
                  <pre>{{ formatInfo(property.info) }}</pre>
                  <p
                    v-if="property.key === 'public'"
                    class="scene-properties__warning"
                  >
                    {{ t("verse.properties.publicRemovalWarning") }}
                  </p>
                </td>
                <td class="scene-properties__actions">
                  <div class="scene-properties__row-actions">
                    <button
                      type="button"
                      class="scene-properties__remove"
                      :disabled="blocked"
                      v-bind="{
                        'aria-label': t('verse.properties.removeNamed', {
                          key: property.key,
                        }),
                      }"
                      @click="requestRemoval(property)"
                    >
                      {{ t("verse.properties.remove") }}
                    </button>
                    <button
                      type="button"
                      v-if="isRoot"
                      class="scene-properties__delete"
                      :disabled="blocked"
                      :aria-label="
                        t('verse.properties.deleteNamed', { key: property.key })
                      "
                      @click="requestGlobalDeletion(property)"
                    >
                      {{ t("verse.properties.deleteProperty") }}
                    </button>
                  </div>
                </td>
              </tr>
              <tr
                v-if="pendingRemoval?.id === property.id"
                class="scene-properties__confirmation-row"
              >
                <td colspan="3">
                  <div
                    class="scene-properties__confirmation"
                    role="group"
                    :aria-label="t('verse.properties.confirmRemoval')"
                  >
                    <p>
                      {{
                        t("verse.properties.removeQuestion", {
                          key: property.key,
                        })
                      }}
                    </p>
                    <small>{{ t("verse.properties.removeScope") }}</small>
                    <div>
                      <el-button
                        :disabled="saving"
                        @click="pendingRemoval = null"
                        >{{ t("verse.properties.cancel") }}</el-button
                      >
                      <el-button
                        type="danger"
                        :loading="saving"
                        :disabled="saving"
                        @click="removeProperty(property)"
                        >{{ t("verse.properties.confirmRemoval") }}</el-button
                      >
                    </div>
                    <p
                      v-if="removeError"
                      class="scene-properties__error"
                      role="alert"
                    >
                      {{ removeError }}
                    </p>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <section
        v-if="pendingGlobal"
        ref="globalConfirmRef"
        tabindex="-1"
        class="scene-properties__global-confirmation"
        role="group"
        :aria-label="t('verse.properties.globalDeleteTitle')"
      >
        <h4>{{ t("verse.properties.globalDeleteTitle") }}</h4>
        <p>
          {{
            t("verse.properties.globalDeleteQuestion", {
              key: pendingGlobal.key,
            })
          }}
        </p>
        <p v-if="usageLoading" role="status">
          {{ t("verse.properties.usageLoading") }}
        </p>
        <template v-else-if="globalUsage">
          <p>
            {{
              t("verse.properties.globalImpact", {
                count: globalUsage.sceneCount,
              })
            }}
          </p>
          <p
            v-if="pendingGlobal.key === 'public'"
            class="scene-properties__global-warning"
          >
            {{ t("verse.properties.globalPublicWarning") }}
          </p>
          <label class="scene-properties__acknowledgement">
            <input
              v-model="acknowledgeGlobal"
              type="checkbox"
              :disabled="saving"
            />
            <span>{{ t("verse.properties.globalAcknowledge") }}</span>
          </label>
        </template>
        <p v-if="globalError" class="scene-properties__error" role="alert">
          {{ globalError }}
        </p>
        <div class="scene-properties__global-actions">
          <el-button :disabled="saving" @click="cancelGlobalDeletion">{{
            t("verse.properties.cancel")
          }}</el-button>
          <el-button
            v-if="!usageLoading && !globalUsage"
            :disabled="saving"
            @click="loadGlobalUsage"
            >{{ t("verse.properties.retry") }}</el-button
          >
          <el-button
            type="danger"
            :loading="saving"
            :disabled="
              usageLoading || saving || !globalUsage || !acknowledgeGlobal
            "
            @click="deleteGlobalProperty"
            >{{ t("verse.properties.deleteEverywhere") }}</el-button
          >
        </div>
      </section>
    </section>

    <section
      class="scene-properties__add"
      :aria-label="t('verse.properties.addHeading')"
    >
      <h3>{{ t("verse.properties.addHeading") }}</h3>
      <el-radio-group
        v-if="isRoot"
        v-model="mode"
        class="scene-properties__mode"
        :disabled="saving"
        v-bind="{ 'aria-label': t('verse.properties.addMethod') }"
        @change="clearFeedback"
      >
        <el-radio-button value="existing">{{
          t("verse.properties.selectExisting")
        }}</el-radio-button>
        <el-radio-button value="new">{{
          t("verse.properties.createNew")
        }}</el-radio-button>
      </el-radio-group>

      <form
        v-if="mode === 'existing'"
        class="scene-properties__existing-form"
        novalidate
        @submit.prevent="addProperty"
      >
        <div v-if="optionsError" class="scene-properties__error" role="alert">
          <p>{{ optionsError }}</p>
          <el-button :disabled="saving" @click="loadOptions">{{
            t("verse.properties.retry")
          }}</el-button>
        </div>
        <el-select
          :id="`${formId}-existing`"
          v-model="selectedId"
          class="scene-properties__select"
          filterable
          clearable
          :teleported="false"
          :loading="optionsLoading"
          :disabled="blocked || Boolean(optionsError)"
          :filter-method="filterOptions"
          :placeholder="t('verse.properties.selectPlaceholder')"
          v-bind="{ 'aria-label': t('verse.properties.existing') }"
          @change="clearFeedback"
          @visible-change="search = ''"
        >
          <template #prefix
            ><el-icon><Search></Search></el-icon
          ></template>
          <el-option
            v-for="property in filteredOptions"
            :key="property.id"
            :label="property.key"
            :value="property.id"
            :disabled="isAssociated(property)"
          >
            <span>{{ property.key }}</span>
            <small
              v-if="isAssociated(property)"
              class="scene-properties__associated"
              >{{ t("verse.properties.associated") }}</small
            >
          </el-option>
        </el-select>
        <el-button
          type="primary"
          native-type="submit"
          class="scene-properties__submit"
          :loading="saving"
          :disabled="
            blocked ||
            optionsLoading ||
            Boolean(optionsError) ||
            !selectedProperty ||
            isAssociated(selectedProperty)
          "
          >{{ t("verse.properties.associate") }}</el-button
        >
      </form>

      <form
        v-else
        class="scene-properties__form"
        novalidate
        @submit.prevent="addProperty"
      >
        <div class="scene-properties__field">
          <label :for="`${formId}-key`"
            >{{ t("verse.properties.key") }} *</label
          >
          <el-input
            :id="`${formId}-key`"
            v-model="key"
            :disabled="saving"
            v-bind="{
              required: true,
              'aria-invalid': Boolean(keyError),
              'aria-describedby': keyError ? `${formId}-key-error` : undefined,
            }"
            maxlength="255"
            :placeholder="t('verse.properties.keyPlaceholder')"
          ></el-input>
          <p
            v-if="keyError"
            :id="`${formId}-key-error`"
            class="scene-properties__error"
            role="alert"
          >
            {{ keyError }}
          </p>
        </div>
        <div class="scene-properties__field">
          <label :for="`${formId}-info`">{{
            t("verse.properties.infoOptional")
          }}</label>
          <el-input
            :id="`${formId}-info`"
            v-model="info"
            type="textarea"
            :rows="4"
            :disabled="saving"
            v-bind="{
              'aria-invalid': Boolean(infoError),
              'aria-describedby': infoError
                ? `${formId}-info-error`
                : undefined,
            }"
            maxlength="65535"
            :placeholder="t('verse.properties.infoPlaceholder')"
          ></el-input>
          <p
            v-if="infoError"
            :id="`${formId}-info-error`"
            class="scene-properties__error"
            role="alert"
          >
            {{ infoError }}
          </p>
        </div>
        <el-button
          type="primary"
          native-type="submit"
          class="scene-properties__submit"
          :loading="saving"
          :disabled="blocked"
          >{{ t("verse.properties.add") }}</el-button
        >
      </form>
      <p
        v-if="mode === 'existing' && selectedProperty"
        class="scene-properties__selected-info"
      >
        {{ formatInfo(selectedProperty.info) }}
      </p>
      <button
        v-if="isRoot && mode === 'existing' && selectedProperty"
        type="button"
        class="scene-properties__delete scene-properties__delete-selected"
        :disabled="blocked"
        @click="requestGlobalDeletion(selectedProperty)"
      >
        {{ t("verse.properties.deleteSelected") }}
      </button>
      <p v-if="saveError" class="scene-properties__error" role="alert">
        {{ saveError }}
      </p>
      <p v-if="saveSuccess" class="scene-properties__success" role="status">
        {{ t(`verse.properties.${saveSuccess}`) }}
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from "vue";
import { useAbility } from "@casl/vue";
import { useI18n } from "vue-i18n";
import { Search } from "@element-plus/icons-vue";
import {
  addSceneProperty,
  getSceneProperties,
  getScenePropertyOptions,
  removeSceneProperty,
  getScenePropertyUsage,
  deleteGlobalSceneProperty,
  type SceneProperty,
} from "@/api/v1/scene-properties";

const props = defineProps<{ sceneId: number }>();
const emit = defineEmits<{
  added: [property: SceneProperty];
  removed: [property: SceneProperty];
  "globally-deleted": [property: SceneProperty];
  "busy-change": [busy: boolean];
  "count-change": [count: number];
}>();
const { t } = useI18n();
const ability = useAbility();
const isRoot = computed(() => ability.can("root", "all"));
const canManageProperties = computed(
  () => isRoot.value || ability.can("admin", "all")
);
const validSceneId = computed(
  () => Number.isSafeInteger(props.sceneId) && props.sceneId > 0
);
const formId = `scene-property-${useId()}`;
const properties = ref<SceneProperty[]>([]);
const loading = ref(false);
const saving = ref(false);
const loadError = ref("");
const saveError = ref("");
const keyError = ref("");
const infoError = ref("");
const saveSuccess = ref<"added" | "removed" | "globallyDeleted" | "">("");
const pendingRemoval = ref<SceneProperty | null>(null);
const removeError = ref("");
const search = ref("");
const pendingGlobal = ref<SceneProperty | null>(null);
const globalUsage = ref<{ property: SceneProperty; sceneCount: number } | null>(
  null
);
const globalError = ref("");
const usageLoading = ref(false);
const acknowledgeGlobal = ref(false);
const globalConfirmRef = ref<HTMLElement | null>(null);
const deletedPropertyIds = new Set<number>();
const key = ref("");
const info = ref("");
const mode = ref<"existing" | "new">("existing");
const selectedId = ref<number>();
const options = ref<SceneProperty[]>([]);
const optionsLoading = ref(false);
const optionsError = ref("");
const selectedProperty = computed(() =>
  options.value.find((property) => property.id === selectedId.value)
);
const filteredOptions = computed(() => {
  const query = search.value.trim().toLocaleLowerCase();
  return options.value
    .filter(
      (property) =>
        !query ||
        `${property.key} ${formatInfo(property.info)}`
          .toLocaleLowerCase()
          .includes(query)
    )
    .sort(
      (a, b) =>
        Number(isAssociated(a)) - Number(isAssociated(b)) ||
        a.key.localeCompare(b.key)
    );
});
const blocked = computed(
  () =>
    loading.value ||
    saving.value ||
    usageLoading.value ||
    Boolean(loadError.value) ||
    !validSceneId.value
);
let scopeVersion = 0;
let loadVersion = 0;
let optionsVersion = 0;
let catalogMutationVersion = 0;
let usageVersion = 0;

async function requestGlobalDeletion(property: SceneProperty) {
  if (!isRoot.value || blocked.value) return;
  clearFeedback();
  pendingRemoval.value = null;
  pendingGlobal.value = property;
  globalUsage.value = null;
  globalError.value = "";
  acknowledgeGlobal.value = false;
  void loadGlobalUsage();
  await nextTick();
  globalConfirmRef.value?.focus();
}

function cancelGlobalDeletion() {
  if (saving.value) return;
  ++usageVersion;
  usageLoading.value = false;
  pendingGlobal.value = null;
  globalUsage.value = null;
  globalError.value = "";
  acknowledgeGlobal.value = false;
}

async function loadGlobalUsage() {
  if (
    !isRoot.value ||
    !validSceneId.value ||
    saving.value ||
    !pendingGlobal.value
  )
    return;
  const scope = scopeVersion;
  const request = ++usageVersion;
  const property = pendingGlobal.value;
  globalError.value = "";
  usageLoading.value = true;
  try {
    const { data } = await getScenePropertyUsage(props.sceneId, property.id);
    if (
      !isCurrentScope(scope) ||
      request !== usageVersion ||
      pendingGlobal.value?.id !== property.id
    )
      return;
    if (
      data.property?.id !== property.id ||
      !Number.isSafeInteger(data.sceneCount) ||
      data.sceneCount < 0
    )
      throw new Error("Invalid property usage");
    globalUsage.value = data;
  } catch {
    if (isCurrentScope(scope) && request === usageVersion)
      globalError.value = t("verse.properties.usageFailed");
  } finally {
    if (isCurrentScope(scope) && request === usageVersion)
      usageLoading.value = false;
  }
}

async function deleteGlobalProperty() {
  if (
    !isRoot.value ||
    blocked.value ||
    !pendingGlobal.value ||
    globalUsage.value?.property.id !== pendingGlobal.value.id ||
    !acknowledgeGlobal.value
  )
    return;
  const scope = scopeVersion;
  const property = pendingGlobal.value;
  globalError.value = "";
  saving.value = true;
  try {
    const { data } = await deleteGlobalSceneProperty(
      props.sceneId,
      property.id
    );
    if (!isCurrentScope(scope)) return;
    if (!data.success || data.property?.id !== property.id)
      throw new Error("Property not deleted");
    deletedPropertyIds.add(property.id);
    ++catalogMutationVersion;
    properties.value = properties.value.filter(
      (item) => item.id !== property.id
    );
    options.value = options.value.filter((item) => item.id !== property.id);
    if (selectedId.value === property.id) selectedId.value = undefined;
    pendingGlobal.value = null;
    globalUsage.value = null;
    acknowledgeGlobal.value = false;
    saveSuccess.value = "globallyDeleted";
    emit("globally-deleted", data.property);
  } catch {
    if (isCurrentScope(scope))
      globalError.value = t("verse.properties.globalDeleteFailed");
  } finally {
    if (isCurrentScope(scope)) saving.value = false;
  }
}

function filterOptions(query: string) {
  search.value = query;
}

function isAssociated(property: SceneProperty) {
  return properties.value.some(
    (item) => item.id === property.id || item.key === property.key
  );
}

function clearFeedback() {
  saveError.value = "";
  saveSuccess.value = "";
  keyError.value = "";
  infoError.value = "";
}

function requestRemoval(property: SceneProperty) {
  if (!canManageProperties.value || blocked.value) return;
  cancelGlobalDeletion();
  clearFeedback();
  removeError.value = "";
  pendingRemoval.value = property;
}

async function removeProperty(property: SceneProperty) {
  if (
    !canManageProperties.value ||
    blocked.value ||
    pendingRemoval.value?.id !== property.id
  )
    return;
  const scope = scopeVersion;
  clearFeedback();
  removeError.value = "";
  saving.value = true;
  try {
    const { data } = await removeSceneProperty(props.sceneId, property.id);
    if (!isCurrentScope(scope)) return;
    if (!data.success || data.property?.id !== property.id)
      throw new Error("Property not removed");
    properties.value = properties.value.filter(
      (item) => item.id !== property.id
    );
    pendingRemoval.value = null;
    saveSuccess.value = "removed";
    emit("removed", data.property);
  } catch {
    if (isCurrentScope(scope))
      removeError.value = t("verse.properties.removeFailed");
  } finally {
    if (isCurrentScope(scope)) saving.value = false;
  }
}

async function loadOptions() {
  if (!canManageProperties.value || !validSceneId.value || saving.value) return;
  const scope = scopeVersion;
  const request = ++optionsVersion;
  const mutations = catalogMutationVersion;
  optionsLoading.value = true;
  optionsError.value = "";
  try {
    const { data } = await getScenePropertyOptions(props.sceneId);
    if (isCurrentScope(scope) && request === optionsVersion) {
      // Retain dictionary entries learned from creates after this GET began,
      // including entries subsequently removed from the current scene.
      options.value =
        mutations === catalogMutationVersion
          ? data
          : [
              ...new Map(
                [...data, ...options.value].map((property) => [
                  property.id,
                  property,
                ])
              ).values(),
            ];
      options.value = options.value.filter(
        (property) => !deletedPropertyIds.has(property.id)
      );
    }
  } catch {
    if (isCurrentScope(scope) && request === optionsVersion) {
      optionsError.value = t("verse.properties.optionsFailed");
    }
  } finally {
    if (isCurrentScope(scope) && request === optionsVersion)
      optionsLoading.value = false;
  }
}

const isCurrentScope = (version: number) =>
  version === scopeVersion && canManageProperties.value && validSceneId.value;

async function loadProperties() {
  if (!canManageProperties.value || !validSceneId.value || saving.value) return;
  const scope = scopeVersion;
  const request = ++loadVersion;
  loading.value = true;
  loadError.value = "";
  try {
    const { data } = await getSceneProperties(props.sceneId);
    if (isCurrentScope(scope) && request === loadVersion) {
      properties.value = data;
    }
  } catch {
    if (isCurrentScope(scope) && request === loadVersion) {
      loadError.value = t("verse.properties.loadFailed");
    }
  } finally {
    if (isCurrentScope(scope) && request === loadVersion) {
      loading.value = false;
    }
  }
}

async function addProperty() {
  if (
    !canManageProperties.value ||
    !validSceneId.value ||
    (mode.value === "new" && !isRoot.value) ||
    loading.value ||
    saving.value ||
    usageLoading.value ||
    loadError.value
  ) {
    return;
  }
  cancelGlobalDeletion();
  clearFeedback();
  const existing = mode.value === "existing";
  if (
    existing &&
    (optionsLoading.value ||
      optionsError.value ||
      !selectedProperty.value ||
      isAssociated(selectedProperty.value))
  )
    return;
  const trimmedKey = key.value.trim();
  if (!existing && (!trimmedKey || Array.from(trimmedKey).length > 255)) {
    keyError.value = t("verse.properties.keyInvalid");
  }
  if (!existing && new TextEncoder().encode(info.value).byteLength > 65535) {
    infoError.value = t("verse.properties.infoTooLong");
  }
  if (keyError.value || infoError.value) return;

  const scope = scopeVersion;
  saving.value = true;
  try {
    const { data } = await addSceneProperty(
      props.sceneId,
      existing
        ? { propertyId: selectedProperty.value!.id }
        : { key: trimmedKey, ...(info.value ? { info: info.value } : {}) }
    );
    if (!isCurrentScope(scope)) return;
    if (!data.success || !data.property) throw new Error("Property not saved");
    ++catalogMutationVersion;
    properties.value = [
      ...properties.value.filter(
        (property) =>
          property.id !== data.property.id && property.key !== data.property.key
      ),
      data.property,
    ];
    options.value = [
      ...options.value.filter((property) => property.id !== data.property.id),
      data.property,
    ];
    loadError.value = "";
    key.value = "";
    info.value = "";
    selectedId.value = undefined;
    saveSuccess.value = "added";
    pendingRemoval.value = null;
    emit("added", data.property);
  } catch {
    if (isCurrentScope(scope)) {
      saveError.value = t("verse.properties.addFailed");
    }
  } finally {
    if (isCurrentScope(scope)) saving.value = false;
  }
}

function formatInfo(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return t("verse.properties.noInfo");
  }
  return typeof value === "string"
    ? value
    : (JSON.stringify(value, null, 2) ?? String(value));
}

watch(
  [() => props.sceneId, canManageProperties, isRoot],
  () => {
    ++scopeVersion;
    ++loadVersion;
    ++optionsVersion;
    ++usageVersion;
    deletedPropertyIds.clear();
    pendingGlobal.value = null;
    globalUsage.value = null;
    globalError.value = "";
    usageLoading.value = false;
    acknowledgeGlobal.value = false;
    properties.value = [];
    key.value = "";
    info.value = "";
    keyError.value = "";
    infoError.value = "";
    saveError.value = "";
    loadError.value = "";
    saveSuccess.value = "";
    pendingRemoval.value = null;
    removeError.value = "";
    search.value = "";
    loading.value = false;
    saving.value = false;
    mode.value = "existing";
    selectedId.value = undefined;
    options.value = [];
    optionsLoading.value = false;
    optionsError.value = "";
    void loadProperties();
    void loadOptions();
  },
  { immediate: true, flush: "sync" }
);

watch(
  [saving, usageLoading],
  ([savingValue, usageValue]) => emit("busy-change", savingValue || usageValue),
  { flush: "sync" }
);
watch(
  () => properties.value.length,
  (count) => emit("count-change", count),
  { immediate: true }
);

onBeforeUnmount(() => {
  ++scopeVersion;
});
</script>

<style scoped lang="scss">
.scene-properties {
  font-size: 16px;
  color: var(--el-text-color-primary);

  h3 {
    margin: 0 0 22px;
    font-size: 22px;
    font-weight: 650;
    line-height: 1.5;
  }

  &__table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
  }

  &__key-column {
    width: 31%;
  }

  &__action-column {
    width: 110px;
  }

  &__table th,
  &__table td {
    padding: 24px 20px;
    text-align: left;
    overflow-wrap: anywhere;
    vertical-align: top;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  &__table thead th {
    padding: 14px 20px;
    font-size: 15px;
    font-weight: 600;
    color: var(--el-text-color-regular);
    background: var(--el-fill-color-light);
  }

  &__table td:last-child,
  &__table thead th:last-child {
    text-align: right;
  }

  &__table pre {
    margin: 0;
    font: inherit;
    font-size: 17px;
    line-height: 1.6;
    color: var(--el-text-color-regular);
    white-space: pre-wrap;
  }

  &__key {
    display: inline;
    padding: 6px 10px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 17px;
    font-weight: 600;
    line-height: 1.8;
    color: var(--el-text-color-primary);
    white-space: pre-wrap;
    background: var(--el-fill-color-light);
    border-radius: 6px;
    box-decoration-break: clone;
  }

  &__warning {
    margin: 7px 0 0;
    font-size: 14px;
    line-height: 1.5;
    color: var(--el-text-color-secondary);
  }

  &__remove {
    min-height: 30px;
    padding: 3px 0;
    font: inherit;
    font-size: 17px;
    color: var(--el-color-primary-dark-2);
    cursor: pointer;
    background: transparent;
    border: 0;
  }

  &__remove:disabled {
    cursor: default;
    opacity: 0.5;
  }

  &__remove:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 3px;
  }

  &__row-actions {
    display: grid;
    gap: 4px;
    justify-items: end;
  }

  &__delete {
    min-height: 30px;
    padding: 3px 0;
    font: inherit;
    font-size: 13px;
    color: var(--el-color-danger-dark-2);
    cursor: pointer;
    background: transparent;
    border: 0;
  }

  &__delete:disabled {
    cursor: default;
    opacity: 0.5;
  }

  &__delete:focus-visible {
    outline: 2px solid var(--el-color-danger);
    outline-offset: 3px;
  }

  &__delete-selected {
    margin-top: 10px;
  }

  &__global-confirmation {
    display: grid;
    gap: 14px;
    padding: 20px;
    margin-top: 24px;
    color: var(--el-text-color-regular);
    background: var(--el-color-danger-light-9);
    border: 1px solid var(--el-color-danger-light-5);
    border-radius: 12px;
  }

  &__global-confirmation:focus-visible {
    outline: 2px solid var(--el-color-danger);
    outline-offset: 3px;
  }

  &__global-confirmation h4,
  &__global-confirmation p {
    margin: 0;
    line-height: 1.6;
  }

  &__global-confirmation h4 {
    font-size: 18px;
    color: var(--el-text-color-primary);
  }

  &__global-warning {
    font-weight: 600;
    color: var(--el-color-danger-dark-2);
  }

  &__acknowledgement {
    display: flex;
    gap: 10px;
    align-items: baseline;
    line-height: 1.6;
    cursor: pointer;
  }

  &__acknowledgement input {
    flex: none;
    width: 16px;
    height: 16px;
    margin: 0;
    accent-color: var(--el-color-danger);
  }

  &__global-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  &__global-actions :deep(.el-button) {
    margin: 0;
  }

  &__table &__confirmation-row td {
    padding: 0 0 16px;
    text-align: left;
  }

  &__confirmation {
    display: grid;
    gap: 10px;
    padding: 16px;
    color: var(--el-text-color-regular);
    background: var(--el-fill-color-light);
    border-radius: 12px;
  }

  &__confirmation p {
    margin: 0;
  }

  &__confirmation small {
    font-size: 13px;
  }

  &__confirmation > div {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__add {
    padding-top: 28px;
    margin-top: 28px;
    border-top: 1px solid var(--el-border-color-lighter);
  }

  &__mode {
    margin-bottom: 24px;
  }

  &__mode :deep(.el-radio-button__inner) {
    min-width: 145px;
    padding: 14px 18px;
    font-size: 16px;
  }

  &__existing-form {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 16px;
    align-items: start;
  }

  &__existing-form > .scene-properties__error {
    grid-column: 1 / -1;
  }

  &__select {
    width: 100%;
  }

  &__select :deep(.el-select__wrapper) {
    min-height: 50px;
    padding: 8px 12px;
  }

  &__select :deep(.el-select__input),
  &__select :deep(.el-select__placeholder) {
    font-size: 16px;
  }

  &__associated {
    float: right;
    margin-left: 16px;
    color: var(--el-text-color-secondary);
  }

  &__form {
    display: grid;
    gap: 18px;
  }

  &__field {
    display: grid;
    gap: 8px;
  }

  &__submit {
    min-width: 150px;
    min-height: 50px;
    margin: 0;
    font-size: 16px;
  }

  &__form &__submit {
    justify-self: start;
  }

  &__selected-info {
    margin: 14px 0 0;
    font-size: 14px;
    line-height: 1.6;
    color: var(--el-text-color-secondary);
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }

  &__empty {
    padding: 20px 0;
    color: var(--el-text-color-secondary);
  }

  &__error {
    margin: 8px 0 0;
    color: var(--el-color-danger);
  }

  &__success {
    margin: 16px 0 0;
    color: var(--el-color-success-dark-2);
  }

  &__caption {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  @media (width <= 600px) {
    font-size: 14px;

    h3 {
      font-size: 18px;
    }

    &__key-column {
      width: 38%;
    }

    &__action-column {
      width: 66px;
    }

    &__table th,
    &__table td {
      padding: 16px 8px;
    }

    &__table thead th {
      padding: 12px 8px;
      font-size: 13px;
    }

    &__table pre,
    &__key {
      font-size: 14px;
    }

    &__key {
      padding: 4px;
    }

    &__remove {
      font-size: 14px;
    }

    &__delete {
      font-size: 12px;
    }

    &__global-confirmation {
      padding: 16px;
    }

    &__warning {
      font-size: 12px;
    }

    &__mode {
      display: flex;
    }

    &__mode :deep(.el-radio-button) {
      flex: 1;
    }

    &__mode :deep(.el-radio-button__inner) {
      width: 100%;
      min-width: 0;
      font-size: 14px;
    }

    &__existing-form {
      grid-template-columns: minmax(0, 1fr);
    }

    &__submit {
      width: 100%;
    }
  }
}
</style>
