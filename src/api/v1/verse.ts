import { putVerse } from './verse';
import request from "@/utils/request";
import qs from "querystringify";
import path from "path-browserify";
import { v4 as uuidv4 } from "uuid";
import environment from "@/environment";
import { MessageType } from "./message";
import { metaInfo } from "./meta";

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
  message: MessageType | null;
  image: ImageDetails;
  author?: Author;
  verseShare?: VerseShare;
  languages?: Languages[];
  metas?: metaInfo[];
  script?: Script;
  verseCode?: any;
};

export type PostVerseData = {
  image_id?: number;
  info: string;
  name: string;
  uuid: string;
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

export const putVerseCode = (id: number, data: VerseCode) => { 
  return request({
    url: path.join(
      "v1",
      "verses",
      `code${qs.stringify({ id: id }, true)}`
    ),
    data,
    method: "put",
  }); 
}
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
