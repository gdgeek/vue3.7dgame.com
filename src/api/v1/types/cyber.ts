/**
 * Cyber 相关类型定义
 */

export interface CyberType {
  id: number;
  data: string;
  script: string;
}

export type CreateCyberRequest = Omit<CyberType, "id"> & {
  id?: number;
};

export type UpdateCyberRequest = Partial<Omit<CyberType, "id">>;
