import { MongoAbility } from "@casl/ability";

export const useAbility = () => {
  const $ability = ref<MongoAbility | null>(null);

  const can = (action: string, subject: any, fields?: any) => {
    if (!$ability.value) return false;
    return $ability.value.can(action, subject, fields);
  };

  return { can };
};
