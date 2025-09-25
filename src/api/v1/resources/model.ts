
import { FileType } from  "../../user/model";

export type Author = {
  id: number;
  nickname: string;
  email: string | null;
  username: string;
};

// 图片信息
export type ResourceInfo = {
  id: number;
  name?: string;
  uuid: string;
  type: string;
  image_id?: number;
  image?: FileType;
  file: FileType;
  created_at: string;
  info: string;
  author?: Author;
};

// 体素信息
export type VoxelInfo = {};

export type ApiResponse<T> = {
  data: T;
};
