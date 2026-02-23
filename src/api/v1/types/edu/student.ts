/**
 * Edu Student（学生）相关类型定义
 */

import type { FileType } from "../file";
import type { UserType } from "../user";

/** 学生信息 */
export interface Student {
  id: number;
  name: string;
  age: number;
  grade: string;
  class: string;
  avatar: FileType;
  student_id?: string;
  user_id?: number;
  class_id?: number;
  created_at?: string;
  updated_at?: string;
  user?: UserType & { avatar?: FileType };
  school?: { id: number; name: string };
  eduClass?: { id: number; name: string };
  [key: string]: unknown;
}

/** 创建学生请求 */
export interface CreateStudentRequest {
  user_id?: number;
  class_id: number;
  name?: string;
  age?: number;
  grade?: string;
}

/** 更新学生请求 */
export interface UpdateStudentRequest extends Partial<Student> {
  id?: number;
}

/** 班级信息（简化） */
export interface EduClassSimple {
  id: number;
  name: string;
  school_id?: number;
  image?: FileType;
  school?: {
    id: number;
    name: string;
  };
}

/** 学生记录（包含班级信息） */
export interface StudentRecord {
  id: number;
  eduClass: EduClassSimple;
  student?: Student;
}
