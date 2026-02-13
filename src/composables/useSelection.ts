import { ref, computed } from 'vue'

export interface SelectableItem {
  id: number | string
  [key: string]: unknown
}

export function useSelection<T extends SelectableItem>() {
  const selectedIds = ref<Set<number | string>>(new Set())

  const selectedCount = computed(() => selectedIds.value.size)
  const hasSelection = computed(() => selectedIds.value.size > 0)

  const isSelected = (id: number | string) => {
    return selectedIds.value.has(id)
  }

  const toggleSelection = (id: number | string) => {
    const newSet = new Set(selectedIds.value)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    selectedIds.value = newSet
  }

  const selectAll = (items: T[]) => {
    selectedIds.value = new Set(items.map(item => item.id))
  }

  const selectItems = (items: T[]) => {
    const newSet = new Set(selectedIds.value)
    items.forEach(item => newSet.add(item.id))
    selectedIds.value = newSet
  }

  const deselectItems = (items: T[]) => {
    const newSet = new Set(selectedIds.value)
    items.forEach(item => newSet.delete(item.id))
    selectedIds.value = newSet
  }

  const clearSelection = () => {
    selectedIds.value = new Set()
  }

  const getSelectedItems = (items: T[]): T[] => {
    return items.filter(item => selectedIds.value.has(item.id))
  }

  return {
    selectedIds,
    selectedCount,
    hasSelection,
    isSelected,
    toggleSelection,
    selectAll,
    selectItems,
    deselectItems,
    clearSelection,
    getSelectedItems,
  }
}
