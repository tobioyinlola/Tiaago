import { notFound } from "next/navigation";

import {
  getBlogStaffAuthors,
  getManageBlogCategories,
  getManageBlogPost,
} from "@/app/common/services/blog-admin";
import BlogPostForm from "../../_components/BlogPostForm";

export const metadata = {
  title: "Edit Blog Post",
};

type Props = {
  params: Promise<{ id: string }>;
};

const EditBlogPostPage = async ({ params }: Props) => {
  const { id } = await params;
  const [post, categories, staffAuthors] = await Promise.all([
    getManageBlogPost(id),
    getManageBlogCategories(),
    getBlogStaffAuthors(),
  ]);

  if (!post) return notFound();

  return <BlogPostForm post={post} categories={categories} staffAuthors={staffAuthors} />;
};

export default EditBlogPostPage;
