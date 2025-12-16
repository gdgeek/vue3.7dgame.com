import request from "@/utils/request";
import qs from "querystringify";
import type { Group, GroupCreateData, GroupUpdateData } from "./types/group";

/**
 * Get list of groups with pagination, sorting, and filtering
 * @param sort - Sort field (e.g., "-created_at" for descending order by created_at)
 * @param search - Search keyword for name
 * @param page - Page number (default 1)
 * @param perPage - Items per page (default 20)
 * @param expand - Expand related data (e.g., "user,image")
 * @param filters - Additional filter parameters
 */
export const getGroups = (
  sort = "-created_at",
  search = "",
  page = 1,
  perPage = 20,
  expand = "image,user",
  filters: Record<string, any> = {}
) => {
  const query: Record<string, any> = {
    sort,
    expand,
  };

  if (search !== "") {
    query["GroupSearch[name]"] = search;
  }
  if (page > 1) {
    query["page"] = page;
  }
  if (perPage !== 20) {
    query["per-page"] = perPage;
  }

  // Add additional filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query[key] = value;
    }
  });

  return request<Group[]>({
    url: `/group${qs.stringify(query, true)}`,
    method: "get",
  });
};

/**
 * Get a single group by ID
 * @param id - Group ID
 * @param expand - Expand related data
 */
export const getGroup = (id: number, expand = "image,user") => {
  const query: Record<string, any> = {};
  if (expand) {
    query["expand"] = expand;
  }
  return request<Group>({
    url: `/group/${id}${qs.stringify(query, true)}`,
    method: "get",
  });
};

/**
 * Create a new group
 * @param data - Group creation data
 */
export const createGroup = (data: GroupCreateData) => {
  return request<Group>({
    url: `/group`,
    method: "post",
    data,
  });
};

/**
 * Update a group (full update)
 * @param id - Group ID
 * @param data - Complete group data
 */
export const updateGroup = (id: number, data: GroupUpdateData) => {
  return request<Group>({
    url: `/group/${id}`,
    method: "put",
    data,
  });
};

/**
 * Partially update a group
 * @param id - Group ID
 * @param data - Partial group data
 */
export const patchGroup = (id: number, data: Partial<GroupUpdateData>) => {
  return request<Group>({
    url: `/group/${id}`,
    method: "patch",
    data,
  });
};

/**
 * Delete a group
 * @param id - Group ID
 */
export const deleteGroup = (id: number) => {
  return request({
    url: `/group/${id}`,
    method: "delete",
  });
};

/**
 * Get supported HTTP methods (for CORS preflight)
 */
export const getGroupOptions = () => {
  return request({
    url: `/group`,
    method: "options",
  });
};

/**
 * Join a group
 * @param id - Group ID
 */
export const joinGroup = (id: number) => {
  return request({
    url: `/group/${id}/join`,
    method: "post",
  });
};

export default {
  getGroups,
  getGroup,
  createGroup,
  updateGroup,
  patchGroup,
  deleteGroup,
  getGroupOptions,
  joinGroup,
};
