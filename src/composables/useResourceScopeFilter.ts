import { computed, ref, watch } from "vue";
import { getVerses, getVerse, type VerseData } from "@/api/v1/verse";
import { getMeta } from "@/api/v1/meta";
import type { MetaInfo } from "@/api/v1/types/meta";
import type { ResourceInfo } from "@/api/v1/resources/model";
import { sortByMultilingualField } from "@/utils/multilingualSort";

type ScopeMode = "all" | "scene";

type SceneOption = {
  id: number;
  name: string;
};

type EntityOption = {
  id: number;
  name: string;
  resources?: ResourceInfo[];
};

type SceneDetail = VerseData & {
  resources?: ResourceInfo[];
  metas?: (MetaInfo & { resources?: ResourceInfo[] })[];
};

const RESOURCE_TYPE_ALIASES: Record<string, string[]> = {
  polygen: ["polygen", "model"],
  picture: ["picture", "image"],
  audio: ["audio", "sound"],
  video: ["video"],
};

const normalizeText = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase();

const dedupeResources = (resources: ResourceInfo[]) => {
  const map = new Map<number, ResourceInfo>();
  resources.forEach((resource) => {
    if (typeof resource?.id === "number") {
      map.set(resource.id, resource);
    }
  });
  return Array.from(map.values());
};

const matchesResourceType = (resourceType: string, expectedType: string) => {
  const aliases = RESOURCE_TYPE_ALIASES[expectedType] || [expectedType];
  return aliases.includes(resourceType);
};

const toSceneName = (scene: VerseData) =>
  String(scene.name || `Scene-${scene.id}`).trim();

const toEntityName = (meta: MetaInfo) =>
  String(meta.title || meta.name || `Meta-${meta.id}`).trim();

const sortResources = (resources: ResourceInfo[], sortValue: string) => {
  const descending = sortValue.startsWith("-");
  const field = descending ? sortValue.slice(1) : sortValue;
  const list = [...resources];

  if (field === "name" || field === "title") {
    return sortByMultilingualField(list, "name", descending);
  }

  list.sort((a, b) => {
    const aVal = new Date(
      String((a as Record<string, unknown>)[field] || 0)
    ).getTime();
    const bVal = new Date(
      String((b as Record<string, unknown>)[field] || 0)
    ).getTime();
    return descending ? bVal - aVal : aVal - bVal;
  });

  return list;
};

export function useResourceScopeFilter(resourceType: string, pageSize = 24) {
  const scopeMode = ref<ScopeMode>("scene");
  const selectedSceneId = ref<number | null>(null);
  const selectedEntityId = ref<number | null>(null);

  const scenes = ref<SceneOption[]>([]);
  const entities = ref<EntityOption[]>([]);

  const loadingScenes = ref(false);
  const loadingSceneDetail = ref(false);
  const loadingEntityDetail = ref(false);

  const scopedSceneResources = ref<ResourceInfo[]>([]);
  const scopedEntityResources = ref<ResourceInfo[]>([]);

  const localSearch = ref("");
  const localSort = ref("-created_at");
  const localPage = ref(1);

  const sceneCache = new Map<number, SceneDetail>();
  const entityResourcesCache = new Map<number, ResourceInfo[]>();

  const isFilterActive = computed(
    () => scopeMode.value === "scene" && selectedSceneId.value !== null
  );

  const showSceneSelect = computed(() => scopeMode.value === "scene");
  const showEntitySelect = computed(
    () => scopeMode.value === "scene" && selectedSceneId.value !== null
  );

  const scopedResources = computed(() =>
    selectedEntityId.value
      ? scopedEntityResources.value
      : scopedSceneResources.value
  );

  const typeFilteredResources = computed(() =>
    scopedResources.value.filter((item) =>
      matchesResourceType(String(item.type || ""), resourceType)
    )
  );

  const searchedResources = computed(() => {
    const keyword = normalizeText(localSearch.value);
    if (!keyword) return typeFilteredResources.value;
    return typeFilteredResources.value.filter((item) =>
      normalizeText(item.name).includes(keyword)
    );
  });

  const sortedResources = computed(() =>
    sortResources(searchedResources.value, localSort.value)
  );

  const totalPages = computed(() =>
    Math.max(1, Math.ceil(sortedResources.value.length / pageSize))
  );

  const pagedResources = computed(() => {
    const start = (localPage.value - 1) * pageSize;
    return sortedResources.value.slice(start, start + pageSize);
  });

  watch(totalPages, (count) => {
    if (localPage.value > count) {
      localPage.value = count;
    }
  });

  const resetLocalState = () => {
    localSearch.value = "";
    localSort.value = "-created_at";
    localPage.value = 1;
  };

  const clearSceneScopedData = () => {
    selectedSceneId.value = null;
    selectedEntityId.value = null;
    entities.value = [];
    scopedSceneResources.value = [];
    scopedEntityResources.value = [];
    resetLocalState();
  };

  const loadScenes = async () => {
    loadingScenes.value = true;
    try {
      const allScenes: VerseData[] = [];
      let page = 1;
      let pageCount = 1;

      do {
        const response = await getVerses({
          sort: "-updated_at",
          page,
          perPage: 100,
        });

        allScenes.push(...response.data);
        pageCount = parseInt(
          String(response.headers["x-pagination-page-count"] || "1")
        );
        page += 1;
      } while (page <= pageCount);

      scenes.value = allScenes.map((scene) => ({
        id: scene.id,
        name: toSceneName(scene),
      }));
    } finally {
      loadingScenes.value = false;
    }
  };

  const loadSceneDetail = async (sceneId: number) => {
    if (sceneCache.has(sceneId)) {
      return sceneCache.get(sceneId)!;
    }
    const response = await getVerse(sceneId, "metas,resources");
    const detail = response.data as SceneDetail;
    sceneCache.set(sceneId, detail);
    return detail;
  };

  const syncSceneScopedData = (detail: SceneDetail) => {
    const sceneResources = Array.isArray(detail.resources)
      ? detail.resources
      : [];
    const metaList = Array.isArray(detail.metas) ? detail.metas : [];
    const metaResources = metaList.flatMap((meta) =>
      Array.isArray(meta.resources) ? meta.resources : []
    );

    scopedSceneResources.value = dedupeResources([
      ...sceneResources,
      ...metaResources,
    ]);

    entities.value = metaList.map((meta) => ({
      id: meta.id,
      name: toEntityName(meta),
      resources: Array.isArray(meta.resources) ? meta.resources : [],
    }));
  };

  const handleScopeModeChange = async (mode: ScopeMode) => {
    scopeMode.value = mode;
    if (mode === "all") {
      clearSceneScopedData();
      return;
    }
    resetLocalState();
    if (scenes.value.length === 0) {
      await loadScenes();
    }
  };

  const handleSceneChange = async (sceneId: number | null) => {
    selectedSceneId.value = sceneId;
    selectedEntityId.value = null;
    scopedEntityResources.value = [];
    resetLocalState();

    if (!sceneId) {
      entities.value = [];
      scopedSceneResources.value = [];
      return;
    }

    loadingSceneDetail.value = true;
    try {
      const detail = await loadSceneDetail(sceneId);
      syncSceneScopedData(detail);
    } finally {
      loadingSceneDetail.value = false;
    }
  };

  const handleEntityChange = async (entityId: number | null) => {
    selectedEntityId.value = entityId;
    scopedEntityResources.value = [];
    resetLocalState();

    if (!entityId) return;

    if (entityResourcesCache.has(entityId)) {
      scopedEntityResources.value = entityResourcesCache.get(entityId)!;
      return;
    }

    const selectedEntity = entities.value.find((item) => item.id === entityId);
    if (selectedEntity && Array.isArray(selectedEntity.resources)) {
      const deduped = dedupeResources(selectedEntity.resources);
      entityResourcesCache.set(entityId, deduped);
      scopedEntityResources.value = deduped;
      return;
    }

    loadingEntityDetail.value = true;
    try {
      const response = await getMeta(entityId, { expand: "resources" });
      const deduped = dedupeResources(response.data.resources || []);
      entityResourcesCache.set(entityId, deduped);
      scopedEntityResources.value = deduped;
    } finally {
      loadingEntityDetail.value = false;
    }
  };

  const handleScopedSearch = (value: string) => {
    if (!isFilterActive.value) return false;
    localSearch.value = value;
    localPage.value = 1;
    return true;
  };

  const handleScopedSort = (value: string) => {
    if (!isFilterActive.value) return false;
    localSort.value = value;
    localPage.value = 1;
    return true;
  };

  const handleScopedPageChange = (page: number) => {
    if (!isFilterActive.value) return false;
    localPage.value = page;
    return true;
  };

  watch(
    showSceneSelect,
    async (visible) => {
      if (!visible || scenes.value.length > 0 || loadingScenes.value) return;
      await loadScenes();
    },
    { immediate: true }
  );

  return {
    scopeMode,
    selectedSceneId,
    selectedEntityId,
    scenes,
    entities,
    loadingScenes,
    loadingSceneDetail,
    loadingEntityDetail,
    isFilterActive,
    showSceneSelect,
    showEntitySelect,
    pagedResources,
    totalPages,
    localPage,
    handleScopeModeChange,
    handleSceneChange,
    handleEntityChange,
    handleScopedSearch,
    handleScopedSort,
    handleScopedPageChange,
    loadScenes,
  };
}
