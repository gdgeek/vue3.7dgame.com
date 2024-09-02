import request from "@/utils/request";
export function postMultilanguageVerse(data: any) {
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

export function putMultilanguageVerse(id: number, data: any) {
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
