"use server";
import { handleServerApiCallError } from "../utils";
import serverKyInstance from "../utils/server-ky.instance";
import {
  ApiResponse,
  BlogCategory,
  BlogPostManage,
  BlogPostWritePayload,
  BlogStaffAuthor,
  ID,
  PagedResource,
} from "../types";

export type BlogManageFilters = {
  page?: number;
  search?: string;
  status?: string;
  category?: ID;
};

export const getManageBlogPosts = async (filters: BlogManageFilters = {}) => {
  const { page = 1, search, status, category } = filters;
  try {
    const data = await serverKyInstance
      .get<PagedResource<BlogPostManage>>("blog/manage/posts", {
        searchParams: {
          page,
          ...(search ? { search } : {}),
          ...(status ? { status } : {}),
          ...(category ? { category } : {}),
        },
      })
      .json();
    return data;
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("getManageBlogPosts Error: ", errMsg);
    throw Error(errMsg);
  }
};

export const getManageBlogPost = async (id: ID): Promise<BlogPostManage | undefined> => {
  try {
    const data = await serverKyInstance.get<BlogPostManage>(`blog/manage/posts/${id}`).json();
    return data;
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("getManageBlogPost Error: ", errMsg);
    return undefined;
  }
};

export const createBlogPost = async (
  payload: BlogPostWritePayload
): Promise<ApiResponse<BlogPostManage>> => {
  try {
    const data = await serverKyInstance
      .post("blog/manage/posts/", { json: payload })
      .json<BlogPostManage>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("createBlogPost Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

export const updateBlogPost = async (
  id: ID,
  payload: BlogPostWritePayload
): Promise<ApiResponse<BlogPostManage>> => {
  try {
    const data = await serverKyInstance
      .patch(`blog/manage/posts/${id}/`, { json: payload })
      .json<BlogPostManage>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("updateBlogPost Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

export const uploadBlogImage = async (
  formData: FormData
): Promise<ApiResponse<{ path: string; url: string }>> => {
  try {
    const data = await serverKyInstance
      .post("blog/manage/upload-image/", { body: formData })
      .json<{ path: string; url: string }>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("uploadBlogImage Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

export const getBlogStaffAuthors = async (): Promise<BlogStaffAuthor[]> => {
  try {
    const data = await serverKyInstance.get<BlogStaffAuthor[]>("blog/manage/authors").json();
    return data;
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("getBlogStaffAuthors Error: ", errMsg);
    return [];
  }
};

export const deleteBlogPost = async (id: ID) => {
  try {
    await serverKyInstance.delete(`blog/manage/posts/${id}/`);
    return { success: true };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("deleteBlogPost Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};

export const getManageBlogCategories = async (): Promise<BlogCategory[]> => {
  try {
    const data = await serverKyInstance.get<BlogCategory[]>("blog/manage/categories").json();
    return data;
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("getManageBlogCategories Error: ", errMsg);
    return [];
  }
};

export const createBlogCategory = async (name: string): Promise<ApiResponse<BlogCategory>> => {
  try {
    const data = await serverKyInstance
      .post("blog/manage/categories/", { json: { name } })
      .json<BlogCategory>();
    return { success: true, data };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("createBlogCategory Error: ", errMsg);
    return { success: false, error: errMsg };
  }
};
