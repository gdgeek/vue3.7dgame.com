import exp from "constants";

/**
 * 登录用户信息
 */
export type _UserDataType = {
  nickname: string | null;
  email: string | null;
  username: string | null;
  emailBind: boolean;
};
export type UploadFileType = {
  md5: string;
  particleType?: string;
  url: string;
  filename: string;
  key: string;
};
export type FileType = {
  id: number;
  md5: string;
  type: string;
  url: string;
  filename: string;
  size: number;
  key: string;
};
export type _InfoType = {
  sex: string;
  industry: string;
  selectedOptions: string[];
  textarea: string;
};
export type _UserInfoType = {
  info: _InfoType | null;
  gold: number;
  points: number;
  avatar: FileType | null;
};
export type UserInfoType = {
  id: number | null;
  userData: _UserDataType | null;
  userInfo: _UserInfoType | null;
  roles: string[] | null;
  perms: string[] | null;
};
export type UserInfoReturnType = {
  success: boolean;
  message: string;
  data: UserInfoType;
};

/**
 * 用户查询对象类型
 */
export interface UserQuery extends PageQuery {
  keywords?: string;
  status?: number;
  deptId?: number;
  startTime?: string;
  endTime?: string;
}

/**
 * 用户分页对象
 */
export interface UserPageVO {
  /**
   * 用户头像地址
   */
  avatar?: string;
  /**
   * 创建时间
   */
  createTime?: Date;
  /**
   * 部门名称
   */
  deptName?: string;
  /**
   * 用户邮箱
   */
  email?: string;
  /**
   * 性别
   */
  genderLabel?: string;
  /**
   * 用户ID
   */
  id?: number;
  /**
   * 手机号
   */
  mobile?: string;
  /**
   * 用户昵称
   */
  nickname?: string;
  /**
   * 角色名称，多个使用英文逗号(,)分割
   */
  roleNames?: string;
  /**
   * 用户状态(1:启用;0:禁用)
   */
  status?: number;
  /**
   * 用户名
   */
  username?: string;
}

/**
 * 用户表单类型
 */
export interface UserForm {
  /**
   * 用户头像
   */
  avatar?: string;
  /**
   * 部门ID
   */
  deptId?: number;
  /**
   * 邮箱
   */
  email?: string;
  /**
   * 性别
   */
  gender?: number;
  /**
   * 用户ID
   */
  id?: number;
  mobile?: string;
  /**
   * 昵称
   */
  nickname?: string;
  /**
   * 角色ID集合
   */
  roleIds?: number[];
  /**
   * 用户状态(1:正常;0:禁用)
   */
  status?: number;
  /**
   * 用户名
   */
  username?: string;
}
