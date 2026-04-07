import { createSecureLS } from "@/utils/secureLs";
const ls = createSecureLS({ encodingType: "aes" });

export const useTagsViewStore = defineStore("tagsView", () => {
  // 安全读取 SecureLS 数据，防止 JSON 解析失败或数据类型异常导致崩溃
  function safeGetArray<T>(key: string): T[] {
    try {
      const value = ls.get(key);
      return Array.isArray(value) ? value : [];
    } catch {
      ls.remove(key);
      return [];
    }
  }

  // 定义已访问的视图数组，初始值从 localStorage 获取，防止数据丢失
  const visitedViews = ref<TagView[]>(safeGetArray<TagView>("visitedViews"));

  // 定义缓存视图数组，初始值从 localStorage 获取
  const cachedViews = ref<string[]>(safeGetArray<string>("cachedViews"));

  function toSerializable(value: unknown): unknown {
    if (value === null) {
      return null;
    }
    const valueType = typeof value;
    if (
      valueType === "string" ||
      valueType === "number" ||
      valueType === "boolean"
    ) {
      return value;
    }
    if (Array.isArray(value)) {
      return value
        .map((item) => toSerializable(item))
        .filter((item) => item !== undefined);
    }
    if (valueType === "object") {
      const serializableObject: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(
        value as Record<string, unknown>
      )) {
        const serializableItem = toSerializable(item);
        if (serializableItem !== undefined) {
          serializableObject[key] = serializableItem;
        }
      }
      return serializableObject;
    }
    return undefined;
  }

  function toSerializableTagView(view: TagView): TagView {
    return {
      name: view.name,
      title: view.title,
      path: view.path,
      fullPath: view.fullPath,
      icon: view.icon,
      affix: view.affix,
      keepAlive: view.keepAlive,
      query: toSerializable(view.query) as TagView["query"],
    };
  }
  /**
   * 监听 visitedViews 的变化，将新值保存到 localStorage
   */
  watch(
    () => visitedViews.value.map((view) => toSerializableTagView(view)),
    (newViews) => {
      ls.set("visitedViews", newViews);
    }
  );

  /**
   * 添加已访问视图到已访问视图列表中
   */
  function addVisitedView(view: TagView) {
    // 如果已经存在于已访问的视图列表中，则不再添加
    if (visitedViews.value.some((v) => v.path === view.path)) {
      return;
    }
    // 如果视图是固定的（affix），则在已访问的视图列表的开头添加
    if (view.affix) {
      visitedViews.value.unshift(view);
    } else {
      // 如果视图不是固定的，则在已访问的视图列表的末尾添加
      visitedViews.value.push(view);
    }
  }

  /**
   * 添加缓存视图到缓存视图列表中
   */
  function addCachedView(view: TagView) {
    const viewName = view.name;
    // 如果缓存视图名称已经存在于缓存视图列表中，则不再添加
    if (cachedViews.value.includes(viewName)) {
      return;
    }

    // 如果视图需要缓存（keepAlive），则将其路由名称添加到缓存视图列表中
    if (view.keepAlive) {
      cachedViews.value.push(viewName);
    }
  }

  /**
   * 从已访问视图列表中删除指定的视图
   */
  function delVisitedView(view: TagView) {
    return new Promise((resolve) => {
      for (const [i, v] of visitedViews.value.entries()) {
        // 找到与指定视图路径匹配的视图，在已访问视图列表中删除该视图
        if (v.path === view.path) {
          visitedViews.value.splice(i, 1);
          break;
        }
      }
      resolve([...visitedViews.value]);
    });
  }

  function delCachedView(view: TagView) {
    const viewName = view.name;
    return new Promise((resolve) => {
      const index = cachedViews.value.indexOf(viewName);
      index > -1 && cachedViews.value.splice(index, 1);
      resolve([...cachedViews.value]);
    });
  }

  function delOtherVisitedViews(view: TagView) {
    return new Promise((resolve) => {
      visitedViews.value = visitedViews.value.filter((v) => {
        return v?.affix || v.path === view.path;
      });
      resolve([...visitedViews.value]);
    });
  }

  function delOtherCachedViews(view: TagView) {
    const viewName = view.name as string;
    return new Promise((resolve) => {
      const index = cachedViews.value.indexOf(viewName);
      if (index > -1) {
        cachedViews.value = cachedViews.value.slice(index, index + 1);
      } else {
        // if index = -1, there is no cached tags
        cachedViews.value = [];
      }
      resolve([...cachedViews.value]);
    });
  }

  function updateVisitedView(view: TagView) {
    for (let v of visitedViews.value) {
      if (v.path === view.path) {
        v = Object.assign(v, view);
        break;
      }
    }
  }

  function addView(view: TagView) {
    addVisitedView(view);
    addCachedView(view);
  }

  function delView(view: TagView) {
    return new Promise((resolve) => {
      delVisitedView(view);
      delCachedView(view);
      resolve({
        visitedViews: [...visitedViews.value],
        cachedViews: [...cachedViews.value],
      });
    });
  }

  function delOtherViews(view: TagView) {
    return new Promise((resolve) => {
      delOtherVisitedViews(view);
      delOtherCachedViews(view);
      resolve({
        visitedViews: [...visitedViews.value],
        cachedViews: [...cachedViews.value],
      });
    });
  }

  function delLeftViews(view: TagView) {
    return new Promise((resolve) => {
      const currIndex = visitedViews.value.findIndex(
        (v) => v.path === view.path
      );
      if (currIndex === -1) {
        return;
      }
      visitedViews.value = visitedViews.value.filter((item, index) => {
        if (index >= currIndex || item?.affix) {
          return true;
        }

        const cacheIndex = cachedViews.value.indexOf(item.name);
        if (cacheIndex > -1) {
          cachedViews.value.splice(cacheIndex, 1);
        }
        return false;
      });
      resolve({
        visitedViews: [...visitedViews.value],
      });
    });
  }
  function delRightViews(view: TagView) {
    return new Promise((resolve) => {
      const currIndex = visitedViews.value.findIndex(
        (v) => v.path === view.path
      );
      if (currIndex === -1) {
        return;
      }
      visitedViews.value = visitedViews.value.filter((item, index) => {
        if (index <= currIndex || item?.affix) {
          return true;
        }
      });
      resolve({
        visitedViews: [...visitedViews.value],
      });
    });
  }

  function delAllViews() {
    return new Promise((resolve) => {
      const affixTags = visitedViews.value.filter((tag) => tag?.affix);
      visitedViews.value = affixTags;
      cachedViews.value = [];
      resolve({
        visitedViews: [...visitedViews.value],
        cachedViews: [...cachedViews.value],
      });
    });
  }

  function delAllVisitedViews() {
    return new Promise((resolve) => {
      const affixTags = visitedViews.value.filter((tag) => tag?.affix);
      visitedViews.value = affixTags;
      resolve([...visitedViews.value]);
    });
  }

  function delAllCachedViews() {
    return new Promise((resolve) => {
      cachedViews.value = [];
      resolve([...cachedViews.value]);
    });
  }

  return {
    visitedViews,
    cachedViews,
    addVisitedView,
    addCachedView,
    delVisitedView,
    delCachedView,
    delOtherVisitedViews,
    delOtherCachedViews,
    updateVisitedView,
    addView,
    delView,
    delOtherViews,
    delLeftViews,
    delRightViews,
    delAllViews,
    delAllVisitedViews,
    delAllCachedViews,
  };
});
