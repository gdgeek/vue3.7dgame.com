import { FileType } from "./file";
import { UserType } from "./user";

export interface EduSchool {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  image_id?: number;
  image?: FileType;
  principal_id?: number;
  principal?: UserType | null;
  address?: string;
  info: Record<string, unknown>;
}

export interface CreateSchoolRequest {
  name: string;
  image_id?: number;
  principal_id?: number;
  address?: string;
  info?: Record<string, unknown>;
}

export type UpdateSchoolRequest = Partial<CreateSchoolRequest>;
