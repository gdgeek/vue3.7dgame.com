declare module "generate-schema" {
  /** 将任意对象转换为 JSON Schema */
  export function json(obj: any): any;
  /** 将任意对象转换为 YAML Schema（如有需要） */
  export function yaml(obj: any): any;
  // 如有其他导出，也可在此补充声明
}
