import type { WebMcpTool } from "./model-context";
type Json = Record<string, unknown>;
export type ScriptAssistanceDependencies = {
  actor: () => string | null;
  context: () => string;
  invokeTool: (name: string, input: unknown) => Promise<unknown>;
  availableTools: () => string[];
};
const rec = (v: unknown): Json => {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw new Error("预期对象数据");
  return v as Json;
};
const entries = (v: unknown) => (Array.isArray(v) ? v.map(rec) : []);
const checked = (v: unknown) => {
  const value = rec(v);
  if (
    value.isError ||
    value.ok === false ||
    value.status === "error" ||
    value.status === "loading"
  )
    throw new Error("编辑器尚未返回有效结果");
  return value;
};
const selectionSchema = {
  type: "object",
  properties: { type: { type: "string" }, fields: { type: "object" } },
  required: ["type"],
  additionalProperties: false,
};
export function createAuthoringScriptAssistanceTools(
  d: ScriptAssistanceDependencies
): WebMcpTool[] {
  const scope = () => {
    const actor = d.actor();
    const context = d.context();
    if (!actor) throw new Error("请先登录");
    return () => {
      if (actor !== d.actor() || context !== d.context())
        throw new Error("脚本上下文已改变");
    };
  };
  const invoke = async (tool: string, input: unknown) => {
    if (!d.availableTools().includes(tool))
      throw new Error("请先打开目标对象的脚本抽屉并等待就绪");
    return checked(await d.invokeTool(tool, input));
  };
  const readCatalog = async () =>
    invoke("xrugc_get_script_block_catalog", { limit: 250 });
  const buildBlock = (raw: unknown, catalog: Json[]) => {
    const selected = rec(raw);
    const found = catalog.find((b) => b.type === selected.type);
    if (!found) throw new Error("积木类型不在当前目录中，请查询真实目录");
    const defaults = rec(found.fields ?? {});
    const fields = rec(selected.fields ?? {});
    for (const [key, value] of Object.entries(fields)) {
      if (
        !Object.hasOwn(defaults, key) ||
        ["__proto__", "constructor", "prototype"].includes(key)
      )
        throw new Error(`未知积木字段 ${key}`);
      if (
        value !== null &&
        !["string", "number", "boolean"].includes(typeof value)
      )
        throw new Error("模板字段仅接受基础值");
    }
    const block = structuredClone(rec(found.sampleState));
    if (block.type !== selected.type) throw new Error("积木样例与类型不一致");
    delete block.id;
    delete block.next;
    block.fields = { ...defaults, ...fields };
    return { block, descriptor: found };
  };
  const templates = [
    {
      id: "statement_chain",
      title: "顺序动作",
      description: "按指定顺序连接当前目录支持的动作积木；参数来自实际字段。",
    },
    {
      id: "event_actions",
      title: "事件触发动作",
      description: "在当前目录的事件积木指定 statement 输入中连接动作链。",
    },
  ];
  return [
    {
      name: "xrugc_get_script_templates",
      description:
        "读取参数化脚本模板及当前可选积木类型。模板不承诺运行效果，最终使用原编辑器校验器。",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute() {
        const check = scope();
        const catalog = await readCatalog();
        check();
        return {
          version: "1.0.0",
          templates,
          availableBlockTypes: entries(catalog.blocks).map((b) => b.type),
          catalogScope: catalog.catalogScope,
          dynamicCategoriesExpanded: catalog.dynamicCategoriesExpanded,
          truncated: catalog.truncated === true,
        };
      },
    },
    {
      name: "xrugc_preview_script_template",
      description:
        "将参数化模板转换为真实积木批处理并调用已有 stage 校验，只生成草稿。返回的 draftId 仍须通过原 complete_script_block_batch 确认保存。",
      inputSchema: {
        type: "object",
        properties: {
          template: { enum: ["statement_chain", "event_actions"] },
          actions: {
            type: "array",
            minItems: 1,
            maxItems: 10,
            items: selectionSchema,
          },
          event: selectionSchema,
          inputName: { type: "string" },
        },
        required: ["template", "actions"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute(raw) {
        const check = scope();
        const input = rec(raw);
        if (
          !templates.some((t) => t.id === input.template) ||
          !Array.isArray(input.actions) ||
          !input.actions.length ||
          input.actions.length > 10 ||
          JSON.stringify(input).length > 32000
        )
          throw new Error("模板参数无效或过大");
        const catalog = await readCatalog();
        check();
        const blocks = entries(catalog.blocks);
        const actions = input.actions.map((a) => buildBlock(a, blocks));
        const operations: Json[] = [];
        actions.forEach((action, i) => {
          if (!rec(action.descriptor.connections).previous)
            throw new Error("动作必须支持 previous 连接");
          operations.push({
            op: "create",
            clientId: `action_${i}`,
            block: action.block,
          });
          if (i > 0) {
            if (!rec(actions[i - 1].descriptor.connections).next)
              throw new Error("前一个动作不支持 next 连接");
            operations.push({
              op: "connect",
              blockId: `action_${i}`,
              parentBlockId: `action_${i - 1}`,
              connection: "next",
            });
          }
        });
        if (input.template === "event_actions") {
          const event = buildBlock(input.event, blocks);
          const targetInput = entries(event.descriptor.inputs).find(
            (i) => i.name === input.inputName && i.kind === "statement"
          );
          if (!targetInput) throw new Error("事件缺少指定 statement 输入");
          operations.unshift({
            op: "create",
            clientId: "event",
            block: event.block,
          });
          operations.push({
            op: "connect",
            blockId: "action_0",
            parentBlockId: "event",
            connection: "input",
            inputName: input.inputName,
            replace: true,
          });
        }
        check();
        const preview = await invoke("xrugc_stage_script_block_batch", {
          operations,
        });
        check();
        return {
          ...preview,
          template: input.template,
          operations,
          nextStep:
            "检查 canSave、warnings 和草稿，再调用 xrugc_complete_script_block_batch 并查询保存回执。",
        };
      },
    },
    {
      name: "xrugc_diagnose_authoring_script",
      description:
        "检查当前脚本的积木链接，并调用真实编辑器的信号/节点/生成代码静态校验；提供建议，不自动修复或保存，不代表运行验收。",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute() {
        const check = scope();
        const structure = await invoke("xrugc_get_script_block_structure", {
          limit: 500,
        });
        check();
        const blocks = entries(structure.blocks);
        const ids = new Set(blocks.map((b) => b.id));
        const issues: Json[] = [];
        if (ids.size !== blocks.length)
          issues.push({
            code: "DUPLICATE_BLOCK_ID",
            suggestion: "在原编辑器重新读取并确认工作区完整性。",
          });
        for (const block of blocks) {
          const references = [
            block.nextBlockId,
            rec(block.relation ?? {}).parentId,
            ...entries(block.inputs).map((i) => i.connectedBlockId),
          ].filter((v) => typeof v === "string" && v);
          for (const ref of references)
            if (!ids.has(ref))
              issues.push({
                code: structure.truncated
                  ? "REFERENCE_OUTSIDE_SCAN"
                  : "DANGLING_BLOCK_LINK",
                blockId: block.id,
                referencedBlockId: ref,
                suggestion:
                  "重新读取完整结构；确认目标积木后预览连接修复，不直接删除。",
              });
        }
        const validationTool = d
          .availableTools()
          .includes("xrugc_validate_meta_script")
          ? "xrugc_validate_meta_script"
          : "xrugc_validate_scene_script";
        const validation = await invoke(validationTool, { focusIssue: false });
        check();
        if (
          structure.workspaceVersion &&
          validation.workspaceVersion &&
          structure.workspaceVersion !== validation.workspaceVersion
        )
          throw new Error("分析期间脚本改变，请重新检查");
        return {
          source: "live_script_editor",
          workspaceVersion:
            validation.workspaceVersion ?? structure.workspaceVersion,
          structuralIssues: issues.slice(0, 100),
          validation,
          coverage: {
            truncated: structure.truncated === true || issues.length > 100,
            runtimeVerified: false,
            externalObjectsInspected: false,
            signalAndNodeRules: "editor_validator",
          },
          suggestions: [
            "先修复校验器指向的 blockId、信号或节点引用，再预览更改。",
            "组件或信号变更前使用依赖/影响分析定位相关场景。",
            "静态校验通过后才保存，保存成功以回执为准。",
          ],
        };
      },
    },
  ];
}
