import { FileType } from "./file";
import { UserType } from "./user";

export interface EduSchool {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  image?: FileType;
  principal?: number | UserType;
  info: {
    [key: string]: any;
  };
}
