import request from "@/utils/request";
import qs from "querystringify";
import path from "path-browserify";
import { v4 as uuidv4 } from "uuid";
import environment from "@/environment";
import { MessageType } from "./message";
import { metaInfo } from "./meta";
import { ResourceInfo } from "@/api/v1/resources/model";

export type Author = {
  id: number;
  nickname: string;
  email: string | null;
  username: string;
};

type ImageDetails = {
  id: number;
  md5: string;
  type: string;
  url: string;
  filename: string;
  size: number;
  key: string;
};

type VerseOpen = {
  id: number;
  verse_id: number;
  user_id: number;
  message_id: number;
};

type VerseRelease = {
  id: number;
  code: string;
};

export type VerseShare = {
  id: number;
  verse_id: number;
  info: string;
  editable: 1 | 0;
  user: Author;
};

type Languages = {
  id: number;
  verse_id: number;
  language: string;
  name: string;
  description: string;
};
export type VerseCode = {
  blockly: string;
  lua?: string;
  js?: string;
};
export type Script = {
  id: number;
  created_at: string;
  verse_id: number;
  script: string;
  title: string;
  uuid: string;
  workspace: string;
};

export type VerseData = {
  id: number;
  author_id: number;
  created_at?: string;
  name: string;
  info: string | null;
  data: string | null;
  version: number;
  uuid: string;
  editable: boolean;
  viewable: boolean;
  verseOpen: VerseOpen | null;
  verseRelease: VerseRelease | null;
  verseShare?: VerseShare;
  message: MessageType | null;
  image: ImageDetails;
  author?: Author;
  languages?: Languages[];
  metas?: metaInfo[];
  script?: Script;
  verseCode?: any;
  verseTags?: [];
};

export type PostVerseData = {
  image_id?: number;
  info: string;
  name: string;
  uuid: string;
  version?: number;
};

export type meta = {
  id: number;
  data: string;
  uuid: string;
  events: string;
  title: string;
  prefabs: number;
  type: string;
  script: string;
};

export type VerseMetasWithJsCode = {
  id: number;
  metas: meta[];
  name: string;
  description: string;
  uuid: string;
  data: string;
  code: string;
  resources: ResourceInfo[];
};

export const postVerse = (data: PostVerseData) => {
  data.version = environment.version;
  data.uuid = data.uuid || uuidv4();
  return request({
    url: path.join("v1", "verses"),
    method: "post",
    data,
  });
};

export const putVerseCode = (id: number, data: VerseCode) => {
  return request<VerseCode>({
    url: path.join("v1", "verses", `code${qs.stringify({ id: id }, true)}`),
    data,
    method: "put",
  });
};
export const getVerse = (id: number, expand = "metas,share") => {
  return request({
    url: path.join(
      "v1",
      "verses",
      `${id.toString()}${qs.stringify({ expand: expand }, true)}`
    ),
    method: "get",
  });
};

export const getVerseMetasWithJsCode = (
  id: number,
  expand = "id,name,description,data,metas,resources,code,uuid,code",
  cl = "js"
) => {
  return request({
    url: path.join(
      "a1",
      "verses",
      `${id.toString()}${qs.stringify({ expand: expand, cl }, true)}`
    ),
    method: "get",
  });
};
export interface VersesParams {
  sort?: string;
  search?: string;
  page?: number;
  expand?: string;
  tags?: number[]; // 假设tags是数字ID数组，如果是其他类型可以相应调整
}

const createQueryParams = ({
  sort,
  search,
  page,
  expand,
  tags,
}: VersesParams): Record<string, any> => {
  const query: Record<string, any> = [];
  query["expand"] = expand;
  query["sort"] = sort;
  if (search && search !== "") {
    query["VerseSearch[name]"] = search;
  }

  if (page && page > 1) {
    query["page"] = page;
  }
  if (tags && tags.length > 0) {
    query["tags"] = tags;
  }
  return query;
};

export const getVersesWithShare = (
  sort = "-created_at",
  search = "",
  page = 0,
  expand = "image,author"
) => {
  const query = createQueryParams({ sort, search, page, expand });
  return request({
    url: path.join("v1", "verses", "share" + qs.stringify(query, true)),
    method: "get",
  });
};

export const getVersesWithOpen = (
  sort = "-created_at",
  search = "",
  page = 0,
  expand = "image,author"
) => {
  const query = createQueryParams({ sort, search, page, expand });
  return request({
    url: path.join("v1", "verses", "open" + qs.stringify(query, true)),
    method: "get",
  });
};


export const getPublic= (params: VersesParams) => {
  const query = createQueryParams(params);
  return request({
    url: path.join("v1", "verses", "public" + qs.stringify(query, true)),
    method: "get",
  });
};
export const getVerses = (params: VersesParams) => {
  const query = createQueryParams(params);
  return request({
    url: path.join("v1", "verses" + qs.stringify(query, true)),
    method: "get",
  });
};

export const putVerse = (id: number, data: any) => {
  data.version = environment.version;
  return request({
    url: path.join("v1", "verses", id.toString()),
    method: "put",
    data,
  });
};

export const deleteVerse = (id: number | string) => {
  return request({
    url: path.join("v1", "verses", id.toString()),
    method: "delete",
  });
};
