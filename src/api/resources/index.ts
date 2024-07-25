import request from "@/utils/request";
import { v4 as uuidv4 } from "uuid";
import qs from "querystringify";
import path from "path-browserify";

type ResourceType = "voxel" | "polygen" | "picture" | "video" | "audio";

// 上传资源类型
type ResourceData = {
  file_id?: string;
  name: string;
  type?: ResourceType;
  uuid?: string;
};

type ResourcePut = {
  name: string;
};

// 获取资源列表
export const getResources = (
  type: ResourceType,
  sort: string = "-created_at",
  search: string = "",
  page: number = 0,
  expand: string = "image,author"
) => {
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
  const url = `resources${queryString}`; // 拼接 URL
  return request({
    url,
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

// 修改资源
const putResources = (id: number | string, resource: ResourcePut) => {
  const url = path.join("resources", id.toString());
  return request({
    url,
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

// 上传资源
const postResources = (data: ResourceData) => {
  data.uuid = uuidv4(); // 生成 UUID

  const url = path.join("resources");
  return request({
    url,
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

// 删除资源
const deleteResources = (id: number | string) => {
  const url = path.join("resources", id.toString());
  return request({
    url,
    method: "delete",
  });
};

export const deletePolygen = (id: number | string) => deleteResources(id);

export const deleteVoxel = (id: number | string) => deleteResources(id);

export const deletePicture = (id: number | string) => deleteResources(id);

export const deleteVideo = (id: number | string) => deleteResources(id);

export const deleteAudio = (id: number | string) => deleteResources(id);
