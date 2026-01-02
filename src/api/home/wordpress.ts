import request from "@/utils/wp";

export const getCategory = (id: number) => {
  return request({
    url: `/categories/${id}`,
    method: "get",
  });
};

export const Article = (id: number) => {
  return request({
    url: `/posts/${id}?_embed`,
    method: "get",
  });
};

export const Post = (id: number) => {
  return request({
    url: `/posts/${id}?_fields=id,title`,
    method: "get",
  });
};

export const Posts = (category: number, size: number, page: number) => {
  return request({
    url: `/posts?categories=${category}&per_page=${size}&page=${page}&_fields=id,title,sort,excerpt,jetpack_featured_media_url,date`,
    method: "get",
  });
};
