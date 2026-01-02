import request from "@/utils/request";
import { v4 as uuidv4 } from "uuid";
import { convertToHttps } from "@/assets/js/helper";
import qs from "querystringify";
import type { ApiResponse, ResourceInfo } from "./model";
import { AxiosResponse } from "axios";

type ResourceType =
  | "voxel"
  | "polygen"
  | "picture"
  | "video"
  | "audio"
  | "particle"
  | string;

// 上传资源类型
type ResourceData = {
  file_id?: number;
  name: string;
  type?: ResourceType;
  uuid?: string;
  effect_type?: string; // 添加 effect_type 字段
  info?: string;
  image_id?: number;
};

type ResourcePut = {
  name: string;
  [key: string]: unknown;
};

// 获取资源列表
export const getResources = (
  type: ResourceType,
  sort: string = "-created_at",
  search: string = "",
  page: number = 0,
  expand: string = "image,author"
): Promise<AxiosResponse<ResourceInfo[]>> => {
  const query: Record<string, string | number> = {
    type,
    expand,
    sort,
  };

  if (search) {
    query["ResourceSearch[name]"] = search;
  }
  if (page > 0) {
    query["page"] = page;
  }

  const queryString = qs.stringify(query, true);
  return request<ResourceInfo[]>({
    url: `/resources${queryString}`, // 拼接 URL
    method: "get",
  });
};

export const getVoxels = (
  sort: string = "-created_at",
  search: string = "",
  page: number = 0
) => getResources("voxel", sort, search, page);

export const getPolygens = (
  sort: string = "-created_at",
  search: string = "",
  page: number = 0
) => getResources("polygen", sort, search, page);

export const getPictures = (
  sort: string = "-created_at",
  search: string = "",
  page: number = 0
) => getResources("picture", sort, search, page);

export const getVideos = (
  sort: string = "-created_at",
  search: string = "",
  page: number = 0
) => getResources("video", sort, search, page);

export const getAudios = (
  sort: string = "-created_at",
  search: string = "",
  page: number = 0
) => getResources("audio", sort, search, page);

export const getParticles = (
  sort: string = "-created_at",
  search: string = "",
  page: number = 0
) => getResources("particle", sort, search, page);

// 修改资源
const putResources = (id: number | string, resource: ResourcePut) => {
  return request({
    url: `/resources/${id}`,
    method: "put",
    data: resource,
  });
};

export const putPolygen = (id: number | string, polygen: ResourcePut) =>
  putResources(id, polygen);

export const putVoxel = (id: number | string, voxel: ResourcePut) =>
  putResources(id, voxel);

export const putPicture = (id: number | string, picture: ResourcePut) =>
  putResources(id, picture);

export const putVideo = (id: number | string, video: ResourcePut) =>
  putResources(id, video);

export const putAudio = (id: number | string, audio: ResourcePut) =>
  putResources(id, audio);

export const putParticle = (id: number | string, particle: ResourcePut) =>
  putResources(id, particle);

// 上传资源
const postResources = (data: ResourceData) => {
  data.uuid = uuidv4(); // 生成 UUID

  return request({
    url: `/resources`,
    method: "post",
    data,
  });
};

export const postPolygen = (data: Omit<ResourceData, "type">) => {
  return postResources({ ...data, type: "polygen" });
};

export const postVoxel = (data: Omit<ResourceData, "type">) => {
  return postResources({ ...data, type: "voxel" });
};

export const postPicture = (data: Omit<ResourceData, "type">) => {
  return postResources({ ...data, type: "picture" });
};

export const postVideo = (data: Omit<ResourceData, "type">) => {
  return postResources({ ...data, type: "video" });
};

export const postAudio = (data: Omit<ResourceData, "type">) => {
  return postResources({ ...data, type: "audio" });
};

export const postParticle = (data: Omit<ResourceData, "type">) =>
  postResources({ ...data, type: "particle" });

// 删除资源
const deleteResources = (id: number | string) => {
  return request({
    url: `/resources/${id}`,
    method: "delete",
  });
};

export const deletePolygen = (id: number | string) => deleteResources(id);

export const deleteVoxel = (id: number | string) => deleteResources(id);

export const deletePicture = (id: number | string) => deleteResources(id);

export const deleteVideo = (id: number | string) => deleteResources(id);

export const deleteAudio = (id: number | string) => deleteResources(id);

export const deleteParticle = (id: number | string) => deleteResources(id);

// 获取特定资源
const getResource = (
  type: ResourceType,
  id: number | string,
  expand: string = "image,author"
) => {
  const query: Record<string, string> = {
    type,
    expand,
  };
  const queryString = qs.stringify(query, true);
  const url = `/resources/${id}${queryString}`;
  return request({
    url,
    method: "get",
  });
};

export const getPolygen = (
  id: number | string,
  expand: string = "image,file,author"
) => {
  return new Promise((resolve, reject) => {
    getResource("polygen", id, expand)
      .then((response) => {
        if (response.data.file && response.data.file.url) {
          response.data.file.url = convertToHttps(response.data.file.url);
        }
        resolve(response);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

export const getVoxel = (
  id: number | string,
  expand: string = "image,file,author"
) => {
  return new Promise((resolve, reject) => {
    getResource("voxel", id, expand)
      .then((response) => {
        if (response.data.file && response.data.file.url) {
          response.data.file.url = convertToHttps(response.data.file.url);
        }
        resolve(response);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

export const getPicture = (
  id: number | string,
  expand: string = "image,file,author"
): Promise<ApiResponse<ResourceInfo>> => {
  return new Promise((resolve, reject) => {
    getResource("picture", id, expand)
      .then((response) => {
        if (response.data.file && response.data.file.url) {
          response.data.file.url = convertToHttps(response.data.file.url);
        }
        resolve(response);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

export const getVideo = (
  id: number | string,
  expand: string = "image,file,author"
): Promise<ApiResponse<ResourceInfo>> => {
  return new Promise((resolve, reject) => {
    getResource("video", id, expand)
      .then((response) => {
        if (response.data.file && response.data.file.url) {
          response.data.file.url = convertToHttps(response.data.file.url);
        }
        resolve(response);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

export const getParticle = (
  id: number | string,
  expand: string = "image,file,author"
): Promise<ApiResponse<ResourceInfo>> => {
  return new Promise((resolve, reject) => {
    getResource("particle", id, expand)
      .then((response) => {
        if (response.data.file && response.data.file.url) {
          response.data.file.url = convertToHttps(response.data.file.url);
        }
        resolve(response);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

export const getAudio = (
  id: number | string,
  expand: string = "image,file,author"
): Promise<ApiResponse<ResourceInfo>> => {
  return new Promise((resolve, reject) => {
    getResource("audio", id, expand)
      .then((response) => {
        if (response.data.file && response.data.file.url) {
          response.data.file.url = convertToHttps(response.data.file.url);
        }
        resolve(response);
      })
      .catch((error) => {
        reject(error);
      });
  });
};
