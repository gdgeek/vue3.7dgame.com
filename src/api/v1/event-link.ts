import request from "@/utils/request";
//import silent from "@/utils/silent_request";
import qs from "querystringify";
import path from "path-browserify";

export function postEventLink(data: any) {
  const url = path.join("v1", "event-links");
  return request({
    url,
    method: "post",
    data,
  });
}

function getEventLink(id: number) {
  const url = path.join("v1", "event-links", id.toString());

  return request({
    url,
    method: "get",
  });
}
function headEventLink(id: number) {
  const url = path.join("v1", "event-links", id.toString());

  return request({
    url,
    method: "head",
  });
}
function deleteEventLink(id: number) {
  const url = path.join("v1", "event-links", id.toString());
  return request({
    url,
    method: "delete",
  });
}

export function testDelEventLink(id: number) {
  return new Promise(async (resolve, reject) => {
    try {
      await headEventLink(id);
      const response = await deleteEventLink(id);
      resolve(response);
    } catch (error) {
      console.log("error");
      console.log(error);
      reject(resolve);
    }
  });
}
