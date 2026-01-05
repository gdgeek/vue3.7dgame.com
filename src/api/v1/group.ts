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

/**
 * Leave a group
 * @param id - Group ID
 */
export const leaveGroup = (id: number) => {
  return request({
    url: `/group/${id}/leave`,
    method: "post",
  });
};

/**
 * Create a verse under a group
 * POST /v1/group/{id}/verse
 * @param groupId - Group ID
 * @param data - Verse creation data
 */
export const createGroupVerse = (
  groupId: number,
  data: {
    name: string;
    description?: string;
    image_id?: number;
  }
) => {
  return request<any>({
    url: `/group/${groupId}/verse`,
    method: "post",
    data,
  });
};

/**
 * GroupVerse type definition
 */
export interface GroupVerse {
  id: number;
  group_id: number;
  verse_id: number;
  created_at?: string;
  updated_at?: string;
  group?: any;
  verse?: any;
}

/**
 * Get verses under a group
 * GET /v1/group/{id}/verses
 * @param groupId - Group ID
 * @param sort - Sort field (e.g., "-created_at")
 * @param page - Page number (default 1)
 * @param perPage - Items per page (default 20)
 * @param expand - Expand related data (e.g., "verse.image")
 * @param search - Search keyword
 */
export const getGroupVerses = (
  groupId: number,
  sort = "-created_at",
  page = 1,
  perPage = 20,
  expand = "verse.image,verse.author",
  search = ""
) => {
  const query: Record<string, any> = {
    sort,
    expand,
  };

  if (page > 1) {
    query["page"] = page;
  }
  if (perPage !== 20) {
    query["per-page"] = perPage;
  }
  if (search) {
    query["search"] = search;
  }

  return request<GroupVerse[]>({
    url: `/group/${groupId}/verses${qs.stringify(query, true)}`,
    method: "get",
  });
};

/**
 * Delete a verse from a group
 * DELETE /v1/group/{id}/verse/{verseId}
 * @param groupId - Group ID
 * @param verseId - Verse ID
 */
export const deleteGroupVerse = (groupId: number, verseId: number) => {
  return request<void>({
    url: `/group/${groupId}/verse/${verseId}`,
    method: "delete",
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
  leaveGroup,
  createGroupVerse,
  getGroupVerses,
  deleteGroupVerse,
};
