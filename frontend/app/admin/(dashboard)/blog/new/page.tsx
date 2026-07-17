import { getBlogStaffAuthors, getManageBlogCategories } from "@/app/common/services/blog-admin";
import BlogPostForm from "../_components/BlogPostForm";

export const metadata = {
  title: "New Blog Post",
};

const NewBlogPostPage = async () => {
  const [categories, staffAuthors] = await Promise.all([
    getManageBlogCategories(),
    getBlogStaffAuthors(),
  ]);

  return <BlogPostForm categories={categories} staffAuthors={staffAuthors} />;
};

export default NewBlogPostPage;
