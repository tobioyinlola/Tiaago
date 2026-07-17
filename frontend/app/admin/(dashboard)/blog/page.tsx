import Link from "next/link";
import { Eye, FileText, Filter, Pin, Plus, Star } from "lucide-react";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import ScrollArea from "@/app/common/components/ScrollArea";
import { handleServerApiCallError } from "@/app/common/utils";
import ServerPagination from "@/app/common/components/ServerPagination";
import { getManageBlogCategories, getManageBlogPosts } from "@/app/common/services/blog-admin";
import { EmptyStateV3 } from "@/app/common/components/dashboard/EmptyState";

export const metadata = {
  title: "Blog Posts",
};

const statusBadgeClass = (status: string) =>
  status === "PUBLISHED"
    ? "bg-[#00B849]/10 text-[#00B849]"
    : "bg-gray-100 text-gray-600";

const BlogAdminPage = async ({
  searchParams,
}: {
  searchParams: Promise<any>;
}) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const resolvedSearchParams = await searchParams;
  const _page = resolvedSearchParams.page ? parseInt(resolvedSearchParams.page as string) : 1;
  const page = isNaN(_page) ? 1 : _page;
  const search = (resolvedSearchParams.search as string) || "";
  const status = (resolvedSearchParams.status as string) || "";
  const category = (resolvedSearchParams.category as string) || "";

  const [postsRes, categories] = await Promise.all([
    getManageBlogPosts({ page, search, status, category }).catch(async e => {
      const error = await handleServerApiCallError(e);
      console.log("Get manage blog posts error (admin => blog): ", error);
      errors.push({ message: error, title: "Error getting blog posts" });
      return null;
    }),
    getManageBlogCategories(),
  ]);

  const posts = postsRes?.results || [];
  const hasActiveFilters = Boolean(search || status || category);

  return (
    <>
      <DisplayErrorMessages errors={errors} />

      <div className='flex items-start gap-3 mb-6'>
        <FileText className='h-7 w-7 text-primary shrink-0 mt-0.5' />
        <div>
          <h1 className='text-2xl font-bold font-space-grotesk'>Blog Posts</h1>
          <p className='text-gray-500 text-sm mt-0.5'>
            Review and monitor all blog content that appears on the marketing site.
          </p>
        </div>
      </div>

      <div className='border border-gray-200 rounded-xl p-6 mb-6'>
        <div className='flex items-center gap-2 mb-5'>
          <Filter className='h-4 w-4 text-gray-500' />
          <h2 className='font-semibold text-gray-900'>Filters</h2>
        </div>

        <form method='GET' className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-5'>
          <div>
            <label className='block text-sm font-medium text-gray-900 mb-1.5'>Search</label>
            <input
              type='text'
              name='search'
              defaultValue={search}
              placeholder='Search by title or content...'
              className='input input-bordered w-full'
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-900 mb-1.5'>Status</label>
            <select name='status' defaultValue={status} className='select select-bordered w-full'>
              <option value=''>All statuses</option>
              <option value='DRAFT'>Draft</option>
              <option value='PUBLISHED'>Published</option>
            </select>
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-900 mb-1.5'>Category</label>
            <select name='category' defaultValue={category} className='select select-bordered w-full'>
              <option value=''>All categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className='md:col-span-3 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <button type='submit' className='btn bg-black text-white hover:bg-gray-800 border-none'>
                Apply Filters
              </button>
              {hasActiveFilters && (
                <Link href='/admin/blog' className='btn btn-outline'>
                  Clear
                </Link>
              )}
            </div>
            <Link href='/admin/blog/new' className='btn bg-black text-white hover:bg-gray-800 border-none gap-2'>
              <Plus className='h-4 w-4' /> Create Post
            </Link>
          </div>
        </form>
      </div>

      <div className='border border-gray-200 rounded-xl p-6'>
        <h2 className='font-semibold text-gray-900 text-lg'>Blog Posts</h2>
        <p className='text-gray-500 text-sm mb-5'>
          {postsRes ? `${postsRes.count} post${postsRes.count === 1 ? "" : "s"} found` : "—"}
        </p>

        {!posts.length ? (
          <EmptyStateV3
            text={hasActiveFilters ? "No posts match these filters" : "No blog posts yet"}
            subText={
              hasActiveFilters
                ? "Try adjusting or clearing your filters."
                : "Create your first post to get started."
            }
          />
        ) : (
          <>
            <ScrollArea className='border rounded dashboard-content-constraint'>
              <table className='table table-zebra text-sm'>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Author</th>
                    <th>Status</th>
                    <th>Published</th>
                    <th>Flags</th>
                    <th className='text-center'>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map(post => (
                    <tr key={post.id}>
                      <td className='max-w-xs'>
                        <Link
                          href={`/admin/blog/${post.id}/edit`}
                          className='font-semibold text-primary hover:underline block truncate'
                        >
                          {post.title}
                        </Link>
                        <span className='text-xs text-gray-400 truncate block'>{post.slug}</span>
                      </td>
                      <td>
                        {post.category_detail ? (
                          <span className='px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200'>
                            {post.category_detail.name}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className='whitespace-nowrap'>{post.author_name || "—"}</td>
                      <td>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadgeClass(
                            post.status
                          )}`}
                        >
                          {post.status === "PUBLISHED" ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className='whitespace-nowrap'>
                        {post.published_at
                          ? new Date(post.published_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td>
                        <div className='flex items-center gap-1.5'>
                          {post.is_featured && (
                            <span className='inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200'>
                              <Star className='h-3 w-3' /> Featured
                            </span>
                          )}
                          {post.is_pinned && (
                            <span className='inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200'>
                              <Pin className='h-3 w-3' /> Pinned
                            </span>
                          )}
                          {!post.is_featured && !post.is_pinned && (
                            <span className='text-gray-300 text-xs'>—</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className='flex items-center justify-center gap-3'>
                          <a
                            href={`/blogs/${post.slug}`}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='btn btn-xs btn-outline gap-1'
                          >
                            <Eye className='h-3 w-3' /> View
                          </a>
                          <Link href={`/admin/blog/${post.id}/edit`} className='btn btn-xs btn-outline'>
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
            {postsRes && <ServerPagination pagedResource={postsRes} searchParams={resolvedSearchParams} />}
          </>
        )}
      </div>
    </>
  );
};

export default BlogAdminPage;
