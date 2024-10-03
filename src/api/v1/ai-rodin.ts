import request from "@/utils/request";
import qs from "querystringify";
import path from "path-browserify";
import  { AxiosResponse } from 'axios';
export type AiRodinResult = {
  prompt: string,
  id: number,
  image:any,
  created_at: string,
  
};
const schedule = (jobs: any[]) => { 
  const length: number = jobs.length;
  const max = length * 2;
  let count = 0;
  jobs.forEach(job => {
    switch (job.status.toLowerCase()) {
      case "generating":
        count += 1;
        break;
      case "done":
        count += 2;
        break;
      default:
        break;
    }
  });
  return count / max;

}
const file = (id: number) => {
  const url = import.meta.env.VITE_APP_AI_API+'/' + path.join("file"+ qs.stringify({id:id.toString()}, true));

  return request({
    url,
    method: "get",
  });
}
const prompt = (prompt:string) => {
  const url = import.meta.env.VITE_APP_AI_API+'/' + path.join("prompt"+ qs.stringify({prompt}, true));

  return request({
    url,
    method: "get",
  });
}
const check = (id:number) => {
  const url = import.meta.env.VITE_APP_AI_API+'/' + path.join("check"+ qs.stringify({id:id.toString()}, true));

  return request({
    url,
    method: "get",
  });
}

const download = (id:number) => {
  const url = import.meta.env.VITE_APP_AI_API+'/' + path.join("download"+ qs.stringify({id:id.toString()}, true));

  return request({
    url,
    method: "get",
  });
}

export default {
  prompt,
  check,
  download,
  schedule,
  file
};
