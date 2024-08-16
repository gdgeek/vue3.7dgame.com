import request from "@/utils/request";
import qs from "querystringify";
import path from "path-browserify";
import { v4 as uuidv4 } from "uuid";
import environment from "@/environment";

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

type Message = {
  id: string;
  [key: string]: any;
};

type VerseOpen = {
  id: number;
  [key: string]: any;
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
  message: Message | null;
  image: ImageDetails;
  author?: Author;
  verseShare: string;
  languages: string[];
};

export type PostVerseData = {
  image_id?: number;
  info: string;
  name: string;
  uuid: string;
  version?: number;
};

export type PutVerseData = {
  info?: string;
  name: string;
  version?: number;
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

export const getVerse = (id: number | string, expand = "metas,share") => {
  return request<VerseData>({
    url: path.join(
      "v1",
      "verses",
      `${id.toString()}${qs.stringify({ expand: expand }, true)}`
    ),
    method: "get",
  });
};

const createQueryParams = (
  sort: string,
  search: string,
  page: number,
  expand: string
): Record<string, any> => {
  const query: Record<string, any> = [];
  query["expand"] = expand;
  query["sort"] = sort;

  if (search !== "") {
    query["VerseSearch[name]"] = search;
  }
  if (page > 1) {
    query["page"] = page;
  }
  return query;
};

export const getVersesWithShare = (
  sort = "-created_at",
  search = "",
  page = 0,
  expand = "image,author"
) => {
  const query = createQueryParams(sort, search, page, expand);
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
  const query = createQueryParams(sort, search, page, expand);
  return request({
    url: path.join("v1", "verses", "open" + qs.stringify(query, true)),
    method: "get",
  });
};

export const getVerses = (
  sort = "-created_at",
  search = "",
  page = 0,
  expand = "image,author,share"
) => {
  const query = createQueryParams(sort, search, page, expand);
  return request<VerseData[]>({
    url: path.join("v1", "verses" + qs.stringify(query, true)),
    method: "get",
  });
};

export const putVerse = (id: number | string, data: PutVerseData) => {
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
