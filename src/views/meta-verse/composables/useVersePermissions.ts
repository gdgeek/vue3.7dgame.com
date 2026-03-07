import { computed } from "vue";
import { useAbility } from "@casl/vue";

export function useVersePermissions() {
  const ability = useAbility();

  const canManage = computed(
    () =>
      ability.can("manager", "all") ||
      ability.can("admin", "all") ||
      ability.can("root", "all")
  );

  const canViewSceneFilter = computed(
    () => ability.can("admin", "all") || ability.can("root", "all")
  );

  return { canManage, canViewSceneFilter };
}
