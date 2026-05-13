const buildGlobalTablePreamble = (name: "meta" | "verse") =>
  `_G.${name} = _G.${name} or {}\nlocal ${name} = _G.${name}\n`;

const normalizeUnityPreviewLuaTable = (
  code: unknown,
  name: "meta" | "verse"
): string => {
  const script = typeof code === "string" ? code : "";
  const globalTablePattern = new RegExp(
    `^\\s*(?:_G\\.)?${name}\\s*=\\s*(?:_G\\.)?${name}\\s+or\\s*\\{\\}`
  );
  const localGlobalAliasPattern = new RegExp(
    `^\\s*local\\s+${name}\\s*=\\s*_G\\.${name}\\b`
  );

  if (globalTablePattern.test(script) || localGlobalAliasPattern.test(script)) {
    return script;
  }

  const localOnlyGuardPattern = new RegExp(
    `^\\s*local\\s+${name}\\s*=\\s*(?:(?:_G\\.)?${name}\\s+or\\s*)?\\{\\}\\s*\\n?`
  );
  const localIndexGuardPattern = /^\s*local\s+index\s*=\s*(["'])\s*\1\s*\n?/;
  const scriptWithoutLocalOnlyGuard = script
    .replace(localOnlyGuardPattern, "")
    .replace(localIndexGuardPattern, "");

  return `${buildGlobalTablePreamble(name)}${scriptWithoutLocalOnlyGuard}`;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readFirstString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === "string") return value;
  }

  return "";
};

const readCodeObjectValue = (
  value: unknown,
  language: "lua" | "js"
): string => {
  if (typeof value === "string") return value;
  if (!isRecord(value)) return "";

  return readFirstString(value[language], value.script, value.code);
};

export const readUnityPreviewMetaLuaCode = (meta: unknown): string => {
  const record = isRecord(meta) ? meta : {};
  return readFirstString(
    readCodeObjectValue(record.code, "lua"),
    readCodeObjectValue(record.metaCode, "lua"),
    record.lua,
    record.script
  );
};

export const readUnityPreviewMetaJavaScriptCode = (meta: unknown): string => {
  const record = isRecord(meta) ? meta : {};
  return readFirstString(
    readCodeObjectValue(record.code, "js"),
    readCodeObjectValue(record.metaCode, "js"),
    record.js,
    record.script
  );
};

export const normalizeUnityPreviewMetaLua = (code: unknown): string =>
  normalizeUnityPreviewLuaTable(code, "meta");

export const normalizeUnityPreviewVerseLua = (code: unknown): string =>
  normalizeUnityPreviewLuaTable(code, "verse");

export const extractUnityPreviewLuaActions = (code: unknown): string[] => {
  if (typeof code !== "string" || code.length === 0) return [];

  const actions: string[] = [];
  const seen = new Set<string>();
  const addAction = (action: string) => {
    if (
      action &&
      action !== "@init" &&
      action !== "#init" &&
      !seen.has(action)
    ) {
      seen.add(action);
      actions.push(action);
    }
  };
  const actionPattern = /(?:meta|verse)\s*\[\s*["']([^"']+)["']\s*\]/g;
  let match = actionPattern.exec(code);

  while (match) {
    addAction(match[1]);

    match = actionPattern.exec(code);
  }

  const indexedActionPattern =
    /local\s+index\s*=\s*["']([^"']+)["'][\s\S]*?(?:meta|verse)\s*\[\s*index\s*\]/g;
  match = indexedActionPattern.exec(code);

  while (match) {
    addAction(match[1]);

    match = indexedActionPattern.exec(code);
  }

  return actions;
};
