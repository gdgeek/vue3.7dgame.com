<template>
  <el-card v-if="isRoot" class="scene-properties">
    <template #header>
      <b>{{ t("verse.properties.title") }}</b>
    </template>

    <div :aria-busy="loading" aria-live="polite">
      <p v-if="loading" role="status">
        {{ t("verse.properties.loading") }}
      </p>
      <div v-else-if="loadError" class="scene-properties__error" role="alert">
        <p>{{ loadError }}</p>
        <el-button :disabled="saving" @click="loadProperties">
          {{ t("verse.properties.retry") }}
        </el-button>
      </div>
      <p v-else-if="properties.length === 0">
        {{ t("verse.properties.empty") }}
      </p>
      <table v-else class="scene-properties__table">
        <caption class="scene-properties__caption">
          {{
            t("verse.properties.title")
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">{{ t("verse.properties.key") }}</th>
            <th scope="col">{{ t("verse.properties.info") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="property in properties" :key="property.id">
            <th scope="row">{{ property.key }}</th>
            <td>
              <pre>{{ formatInfo(property.info) }}</pre>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <form
      class="scene-properties__form"
      novalidate
      @submit.prevent="addProperty"
    >
      <h3>{{ t("verse.properties.add") }}</h3>
      <div class="scene-properties__field">
        <label :for="`${formId}-key`">{{ t("verse.properties.key") }} *</label>
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
          :rows="3"
          :disabled="saving"
          v-bind="{
            'aria-invalid': Boolean(infoError),
            'aria-describedby': infoError ? `${formId}-info-error` : undefined,
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
      <p v-if="saveError" class="scene-properties__error" role="alert">
        {{ saveError }}
      </p>
      <p v-if="saveSuccess" role="status">
        {{ t("verse.properties.added") }}
      </p>
      <el-button
        type="primary"
        native-type="submit"
        :loading="saving"
        :disabled="loading || saving || Boolean(loadError) || !validSceneId"
      >
        {{ t("verse.properties.add") }}
      </el-button>
    </form>
  </el-card>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from "vue";
import { useAbility } from "@casl/vue";
import { useI18n } from "vue-i18n";
import {
  addSceneProperty,
  getSceneProperties,
  type SceneProperty,
} from "@/api/v1/scene-properties";

const props = defineProps<{ sceneId: number }>();
const emit = defineEmits<{ added: [property: SceneProperty] }>();
const { t } = useI18n();
const ability = useAbility();
const isRoot = computed(() => ability.can("root", "all"));
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
const saveSuccess = ref(false);
const key = ref("");
const info = ref("");
let scopeVersion = 0;
let loadVersion = 0;

const isCurrentScope = (version: number) =>
  version === scopeVersion && isRoot.value && validSceneId.value;

async function loadProperties() {
  if (!isRoot.value || !validSceneId.value || saving.value) return;
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
    !isRoot.value ||
    !validSceneId.value ||
    loading.value ||
    saving.value ||
    loadError.value
  ) {
    return;
  }
  keyError.value = "";
  infoError.value = "";
  saveError.value = "";
  saveSuccess.value = false;
  const trimmedKey = key.value.trim();
  if (!trimmedKey || Array.from(trimmedKey).length > 255) {
    keyError.value = t("verse.properties.keyInvalid");
  }
  if (new TextEncoder().encode(info.value).byteLength > 65535) {
    infoError.value = t("verse.properties.infoTooLong");
  }
  if (keyError.value || infoError.value) return;

  const scope = scopeVersion;
  saving.value = true;
  try {
    const { data } = await addSceneProperty(props.sceneId, {
      key: trimmedKey,
      ...(info.value ? { info: info.value } : {}),
    });
    if (!isCurrentScope(scope)) return;
    if (!data.success || !data.property) throw new Error("Property not saved");
    properties.value = [
      ...properties.value.filter(
        (property) =>
          property.id !== data.property.id && property.key !== data.property.key
      ),
      data.property,
    ];
    loadError.value = "";
    key.value = "";
    info.value = "";
    saveSuccess.value = true;
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
  [() => props.sceneId, isRoot],
  () => {
    ++scopeVersion;
    ++loadVersion;
    properties.value = [];
    key.value = "";
    info.value = "";
    keyError.value = "";
    infoError.value = "";
    saveError.value = "";
    loadError.value = "";
    saveSuccess.value = false;
    loading.value = false;
    saving.value = false;
    void loadProperties();
  },
  { immediate: true, flush: "sync" }
);

onBeforeUnmount(() => {
  ++scopeVersion;
});
</script>

<style scoped lang="scss">
.scene-properties {
  &__table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;

    th,
    td {
      padding: 10px;
      text-align: left;
      overflow-wrap: anywhere;
      vertical-align: top;
      border-bottom: 1px solid var(--el-border-color-lighter);
    }

    th:first-child {
      width: 35%;
    }

    pre {
      margin: 0;
      font: inherit;
      white-space: pre-wrap;
    }
  }

  &__caption {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  &__form {
    display: grid;
    gap: 16px;
    padding-top: 16px;
    margin-top: 16px;
    border-top: 1px solid var(--el-border-color-lighter);

    h3 {
      margin: 0;
      font-size: 14px;
    }

    .el-button {
      justify-self: start;
    }
  }

  &__field {
    display: grid;
    gap: 8px;
  }

  &__error {
    margin: 0;
    color: var(--el-color-danger);
  }
}
</style>
