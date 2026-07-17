import { handleServerApiCallError } from "../utils";
import serverKyInstance from "../utils/server-ky.instance";
import { BlogCategory, BlogPost, BlogPostSummary, PagedResource } from "../types";

export const getBlogPosts = async (page = 1, category?: string, search?: string) => {
  try {
    const data = await serverKyInstance
      .get<PagedResource<BlogPostSummary>>("blog/posts", {
        searchParams: {
          page,
          ...(category ? { category } : {}),
          ...(search ? { search } : {}),
        },
      })
      .json();
    return data;
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("getBlogPosts Error: ", errMsg);
    throw Error(errMsg);
  }
};

export const getBlogPost = async (slug: string): Promise<BlogPost | undefined> => {
  try {
    const data = await serverKyInstance.get<BlogPost>(`blog/posts/${slug}`).json();
    return data;
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("getBlogPost Error: ", errMsg);
    return undefined;
  }
};

export const getBlogCategories = async (): Promise<BlogCategory[]> => {
  try {
    const data = await serverKyInstance.get<BlogCategory[]>("blog/categories").json();
    return data;
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("getBlogCategories Error: ", errMsg);
    return [];
  }
};
