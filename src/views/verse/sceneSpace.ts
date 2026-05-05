import type { VerseData } from "@/api/v1/verse";

export const VERSE_SCENE_EXPAND =
  "metas, resources, space, space.mesh, space.file, space.image";

export const SPACE_REFERENCE_VISIBILITY_ACTION = "set-space-reference-visible";

export type VerseEditorUser = {
  id: number | null;
  role: string | null;
};

export type VerseEditorInitConfig = {
  id: number;
  data: VerseData;
  saveable: boolean;
  user: VerseEditorUser;
};

export type VerseEditorInitConfigInput = {
  id: number;
  verse: VerseData;
  saveable: boolean;
  user: VerseEditorUser;
};

export type SpaceVisibilityRequest = {
  action: typeof SPACE_REFERENCE_VISIBILITY_ACTION;
  visible: boolean;
};

export const formatSpaceLabel = (
  space: Pick<NonNullable<VerseData["space"]>, "name"> | null | undefined
) => {
  const name = space?.name?.trim();
  return name ? `使用空间：${name}` : "";
};

export const buildVerseEditorInitConfig = ({
  id,
  verse,
  saveable,
  user,
}: VerseEditorInitConfigInput): VerseEditorInitConfig => ({
  id,
  data: verse,
  saveable,
  user,
});

export const buildSpaceVisibilityRequest = (
  visible: boolean
): SpaceVisibilityRequest => ({
  action: SPACE_REFERENCE_VISIBILITY_ACTION,
  visible,
});
