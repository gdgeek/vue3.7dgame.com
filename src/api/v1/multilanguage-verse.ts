import request from "@/utils/request";

interface putData {
  description: string;
  name: string;
}

interface postData {
  description: string;
  language: string;
  name: string;
  verse_id: number;
}

export function postMultilanguageVerse(data: postData) {
  return request({
    url: "v1/multilanguage-verses",
    method: "post",
    data: data,
  });
}

export function getMultilanguageVerse(id: number) {
  return request({
    url: "v1/multilanguage-verses/" + id,
    method: "get",
  });
}

export function putMultilanguageVerse(id: number, data: putData) {
  return request({
    url: "v1/multilanguage-verses/" + id,
    method: "put",
    data,
  });
}
export function deleteMultilanguageVerse(id: number) {
  return request({
    url: "v1/multilanguage-verses/" + id,
    method: "delete",
  });
}
