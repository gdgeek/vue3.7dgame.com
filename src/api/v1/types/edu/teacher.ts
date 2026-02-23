/**
 * Edu Teacher（教师）相关类型定义
 */

/** 教师信息 */
import type { FileType } from "../file";
import type { UserType } from "../user";

export interface Teacher {
  id: number;
  name: string;
  subject: string;
  phone: string;
  avatar: string;
  user_id?: number;
  class_id?: number;
  school_id?: number;
  created_at?: string;
  updated_at?: string;
  user?: UserType & { avatar?: FileType };
  school?: { id: number; name: string };
  eduClass?: { id: number; name: string };
  [key: string]: unknown;
}

/** 创建教师请求 */
export interface CreateTeacherRequest {
  user_id: number;
  class_id: number;
  school_id: number;
  subject?: string;
}

/** 更新教师请求 */
export interface UpdateTeacherRequest extends Partial<Teacher> {
  id?: number;
}
