/**
 * Phototype（影子类型）相关类型定义
 */

import type { Author, FileInfo, JsonValue } from "./common";
import type { ResourceInfo } from "../resources/model";

export interface PhototypeType {
  id?: number;
  type?: string | null;
  title?: string;
  name?: string;
  uuid?: string | null;
  data?: JsonValue | null;
  schema?: JsonValue | null;
  created_at?: string;
  updated_at?: string;
  image_id?: number | null;
  updater_id?: number;
  author_id?: number;
  resource_id?: number | null;
  author?: Author;
  resource?: ResourceInfo | null;
  image?: FileInfo;
}

export type CreatePhototypeRequest = PhototypeType;

export type UpdatePhototypeRequest = Partial<PhototypeType>;
