import request from "@/utils/request";

export interface AppleIdData {
  code: string;
  id_token: string;
  state: string;
  url: string;
  userData: any;
}
