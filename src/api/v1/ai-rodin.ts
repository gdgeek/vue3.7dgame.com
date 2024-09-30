import request from "@/utils/request";
import qs from "querystringify";
import path from "path-browserify";
import  { AxiosResponse } from 'axios';
export type AiRodinResult = {
  prompt: string,
  token: string,
  id: number,
  created_at: string,
  status: string,
};

const prompt = (prompt:string) => {
  const url = import.meta.env.VITE_APP_AI_API+'/' + path.join("prompt"+ qs.stringify({prompt}, true));

  return request({
    url,
    method: "get",
  });
}
/*
const index = (data: Record<string, any>) => {
  return request({
    url: path.join("v1", "ai-rodin"),
    method: "get",
    data,
  });
}
const get = (id:string) => {
  return request<any, AxiosResponse<AiRodinResult[]> >({
    url: path.join("v1", "ai-rodin") + `/${id}`,
    method: "get"
  });
}
const list = () =>  {
 
  return request<any, AxiosResponse<AiRodinResult[]> >({
    url: path.join("v1", "ai-rodin"),
    method: "get"
  });
}
const put = (data: Record<string, any>) => {
  return request({
    url: path.join("v1", "ai-rodin"),
    method: "put",
    data,
  });
}
const del = (data: Record<string, any>) => {
  return request({
    url: path.join("v1", "ai-rodin"),
    method: "delete",
    data,
  });
}
*/
export default {
  prompt,
};
