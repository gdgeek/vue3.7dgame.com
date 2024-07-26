export type ImageDetails = {
  id: number;
  md5: string;
  type: string;
  url: string;
  filename: string;
  size: number;
  key: string;
};

export type Author = {
  id: number;
  nickname: string;
  email: string | null;
  username: string;
};

// 图片信息
export type PictureInfo = {
  id: number;
  name: string;
  uuid: string;
  type: string;
  image_id: number;
  image: ImageDetails;
  file: ImageDetails;
  created_at: string;
  info: string;
  author: Author;
};

export type ApiResponse<T> = {
  data: T;
};
