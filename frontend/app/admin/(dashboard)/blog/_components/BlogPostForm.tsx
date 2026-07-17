"use client";

import "react-quill-new/dist/quill.snow.css";

import { toast } from "sonner";
import { Formik, FormikProps } from "formik";
import * as Yup from "yup";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ImageIcon, PanelRightClose, PanelRightOpen } from "lucide-react";

import { cn } from "@/app/common/utils";
import { BlogCategory, BlogPostManage, BlogPostWritePayload, BlogStaffAuthor } from "@/app/common/types";
import { handleFormSubmissionError } from "@/app/common/utils";
import { useAlert } from "@/app/common/store/useAlert";
import Button from "@/app/common/components/DaisyButton";
import FormikField from "@/app/common/components/Forms/FormikField";
import {
  createBlogCategory,
  createBlogPost,
  updateBlogPost,
  uploadBlogImage,
} from "@/app/common/services/blog-admin";
import DeletePostButton from "./DeletePostButton";

const AUTHOR_TITLE_SUGGESTIONS = ["CEO", "CTO", "Engineering", "Marketing", "Product", "Operations"];
const DRAFT_STORAGE_KEY = "tiaago_blog_new_post_draft_v1";

const validationSchema = Yup.object().shape({
  title: Yup.string().required().label("Title"),
  category: Yup.string().required().label("Category"),
  excerpt: Yup.string().max(300).required().label("Excerpt"),
  content: Yup.string().required().label("Body"),
  status: Yup.string().oneOf(["DRAFT", "PUBLISHED"]).required().label("Status"),
});

type FormValues = {
  title: string;
  category: string;
  excerpt: string;
  content: string;
  status: string;
  author: string;
  custom_author_name: string;
  author_title: string;
  is_featured: boolean;
  is_pinned: boolean;
};

/** Rendered inside Formik's render-prop children so its `useEffect` attaches
 * to its own fiber -- Formik's <Formik> is a class component internally, so
 * calling a hook directly in the children callback would attach to the wrong
 * fiber and throw. */
const DraftAutosave = ({
  values,
  authorMode,
  isEdit,
  onSaved,
}: {
  values: FormValues;
  authorMode: "system" | "custom";
  isEdit: boolean;
  onSaved: (date: Date) => void;
}) => {
  useEffect(() => {
    if (isEdit) return;
    const timeout = setTimeout(() => {
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ ...values, authorMode }));
      onSaved(new Date());
    }, 800);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, authorMode, isEdit]);

  return null;
};

const BlogPostForm = ({
  post,
  categories,
  staffAuthors,
}: {
  post?: BlogPostManage;
  categories: BlogCategory[];
  staffAuthors: BlogStaffAuthor[];
}) => {
  const router = useRouter();
  const isEdit = Boolean(post);
  const setAlert = useAlert(state => state.setAlert);
  const formikRef = useRef<FormikProps<FormValues>>(null);

  const [categoryOptions, setCategoryOptions] = useState(categories);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [authorMode, setAuthorMode] = useState<"system" | "custom">(post?.custom_author_name ? "custom" : "system");
  const [imagePreviewUrl, setImagePreviewUrl] = useState(post?.featured_image || "");
  const [imagePath, setImagePath] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);

  const initialValues: FormValues = {
    title: post?.title || "",
    category: post?.category ? String(post.category) : "",
    excerpt: post?.excerpt || "",
    content: post?.content || "",
    status: post?.status || "DRAFT",
    author: post?.author ? String(post.author) : "",
    custom_author_name: post?.custom_author_name || "",
    author_title: post?.author_title || "",
    is_featured: post?.is_featured || false,
    is_pinned: post?.is_pinned || false,
  };

  // Restore a locally-saved draft on mount (new posts only) -- applied after
  // hydration via an effect, not during initial render, to avoid a hydration
  // mismatch between the server-rendered empty form and localStorage content.
  useEffect(() => {
    if (isEdit) return;
    const saved = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!saved) return;
    try {
      const draft = JSON.parse(saved);
      formikRef.current?.setValues({ ...initialValues, ...draft });
      if (draft.authorMode) setAuthorMode(draft.authorMode);
    } catch {
      // ignore corrupt draft
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    setAddingCategory(true);
    const result = await createBlogCategory(newCategoryName.trim());
    setAddingCategory(false);
    if (result.success) {
      setCategoryOptions(current => [...current, result.data]);
      setNewCategoryName("");
      toast.success("Category added");
    } else {
      toast.error(result.error);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localPreview = URL.createObjectURL(file);
    setImagePreviewUrl(localPreview);
    setUploadingImage(true);
    const formData = new FormData();
    formData.set("image", file);
    const result = await uploadBlogImage(formData);
    setUploadingImage(false);
    if (result.success) {
      setImagePath(result.data.path);
      setImagePreviewUrl(result.data.url);
      toast.success("Cover image uploaded");
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Formik
      innerRef={formikRef}
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={async (values, { setSubmitting, setFieldError }) => {
        if (authorMode === "custom" && !values.custom_author_name.trim()) {
          setFieldError("custom_author_name", "Enter a name for the custom author");
          setSubmitting(false);
          return;
        }

        const payload: BlogPostWritePayload = {
          title: values.title,
          category: values.category ? Number(values.category) : null,
          excerpt: values.excerpt,
          content: values.content,
          status: values.status as "DRAFT" | "PUBLISHED",
          author: authorMode === "system" && values.author ? Number(values.author) : null,
          custom_author_name: authorMode === "custom" ? values.custom_author_name.trim() : "",
          author_title: values.author_title,
          is_featured: values.is_featured,
          is_pinned: values.is_pinned,
          ...(imagePath ? { featured_image_path: imagePath } : {}),
        };

        const result = post ? await updateBlogPost(post.id, payload) : await createBlogPost(payload);

        setSubmitting(false);
        if (result.success) {
          if (!isEdit) window.localStorage.removeItem(DRAFT_STORAGE_KEY);
          toast.success(post ? "Post updated" : "Post created");
          router.push("/admin/blog");
          router.refresh();
        } else {
          handleFormSubmissionError(result.error, setFieldError, setAlert);
        }
      }}
    >
      {({ handleSubmit, errors, touched, values, isSubmitting, setFieldValue }) => {
        return (
          <form onSubmit={handleSubmit}>
            <DraftAutosave values={values} authorMode={authorMode} isEdit={isEdit} onSaved={setDraftSavedAt} />
            <div className='flex items-start justify-between gap-4 mb-6'>
              <div>
                <h1 className='text-2xl font-bold font-space-grotesk'>
                  {post ? "Edit Blog Post" : "Create Blog Post"}
                </h1>
                <p className='text-gray-500 text-sm mt-0.5'>
                  Write your post and configure its author, cover image, and publishing settings.
                </p>
              </div>
              <div className='flex items-center gap-3 shrink-0'>
                {!isEdit && draftSavedAt && (
                  <span className='text-xs text-gray-400 hidden sm:inline'>Draft saved locally</span>
                )}
                <button
                  type='button'
                  onClick={() => setShowSettings(s => !s)}
                  className='btn btn-outline btn-sm gap-2'
                >
                  {showSettings ? (
                    <>
                      <PanelRightClose className='h-4 w-4' /> Hide settings
                    </>
                  ) : (
                    <>
                      <PanelRightOpen className='h-4 w-4' /> Show settings
                    </>
                  )}
                </button>
                <button
                  type='button'
                  onClick={() => router.push("/admin/blog")}
                  className='btn btn-outline btn-sm'
                >
                  Back
                </button>
              </div>
            </div>

            <div className={cn("grid grid-cols-1 gap-6", showSettings && "lg:grid-cols-[1fr_360px]")}>
              {/* Story editor */}
              <div className='border border-gray-200 rounded-xl p-6'>
                <h2 className='font-semibold text-gray-900'>Story editor</h2>
                <p className='text-gray-500 text-sm mb-6'>
                  Write your post below. Use the toolbar to format text and insert images.
                </p>

                <FormikField
                  name='title'
                  label='Title'
                  value={values.title}
                  error={errors.title}
                  touched={touched.title}
                  placeholder='Title'
                  inputContainerClassName='border-none px-0 text-3xl font-bold h-auto py-2 focus-within:shadow-none'
                  className='mb-4'
                />

                <FormikField
                  name='excerpt'
                  label='Subtitle / Excerpt'
                  type='textarea'
                  value={values.excerpt}
                  error={errors.excerpt}
                  touched={touched.excerpt}
                  placeholder='A short subtitle shown in previews (max 300 characters).'
                  className='mb-4'
                />

                <FormikField
                  name='content'
                  label='Body'
                  type='richtext'
                  placeholder='Write your story...'
                  value={values.content}
                  error={errors.content}
                  touched={touched.content}
                  richtextProps={{ maxChars: 20000 }}
                />
              </div>

              {/* Settings sidebar */}
              {showSettings && (
                <div className='flex flex-col gap-6'>
                  <div className='border border-gray-200 rounded-xl p-6'>
                    <h3 className='font-semibold text-gray-900'>Author</h3>
                    <p className='text-gray-500 text-sm mb-4'>Who this post is published under.</p>

                    <div className='flex gap-2 mb-4'>
                      <button
                        type='button'
                        onClick={() => setAuthorMode("system")}
                        className={cn(
                          "btn btn-sm flex-1",
                          authorMode === "system" ? "btn-primary text-white" : "btn-outline"
                        )}
                      >
                        System author
                      </button>
                      <button
                        type='button'
                        onClick={() => setAuthorMode("custom")}
                        className={cn(
                          "btn btn-sm flex-1",
                          authorMode === "custom" ? "btn-primary text-white" : "btn-outline"
                        )}
                      >
                        Custom author
                      </button>
                    </div>

                    {authorMode === "system" ? (
                      <FormikField
                        name='author'
                        label='Author'
                        type='select'
                        value={values.author}
                        error={errors.author}
                        touched={touched.author}
                        placeholder='Defaults to you'
                        selectFieldProps={{
                          options: staffAuthors.map(a => ({ label: a.name, value: String(a.id) })),
                          value:
                            staffAuthors
                              .map(a => ({ label: a.name, value: String(a.id) }))
                              .find(o => o.value === values.author) || null,
                        }}
                      />
                    ) : (
                      <FormikField
                        name='custom_author_name'
                        label='Author name'
                        placeholder='e.g. Guest Contributor'
                        value={values.custom_author_name}
                        error={errors.custom_author_name}
                        touched={touched.custom_author_name}
                      />
                    )}

                    <FormikField
                      name='author_title'
                      label='Author title (optional)'
                      placeholder='e.g. CEO, Marketing, Product Lead'
                      value={values.author_title}
                      error={errors.author_title}
                      touched={touched.author_title}
                    />
                    <div className='flex flex-wrap gap-2 -mt-2'>
                      {AUTHOR_TITLE_SUGGESTIONS.map(suggestion => (
                        <button
                          key={suggestion}
                          type='button'
                          onClick={() => setFieldValue("author_title", suggestion)}
                          className='badge badge-outline cursor-pointer hover:bg-gray-100'
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className='border border-gray-200 rounded-xl p-6'>
                    <h3 className='font-semibold text-gray-900'>Cover image</h3>
                    <p className='text-gray-500 text-sm mb-4'>
                      Image shown at the top of the blog post and in featured cards.
                    </p>
                    <label className='label-text text-black font-medium font-onest mb-1 block'>
                      Upload cover image
                    </label>
                    <input
                      type='file'
                      accept='.png,.jpg,.jpeg,.webp'
                      onChange={handleImageChange}
                      className='file-input file-input-bordered w-full'
                    />
                    <p className='text-xs text-gray-400 mt-2 flex items-center gap-1'>
                      <ImageIcon className='h-3 w-3' /> Upload an image (max 10MB). It uploads immediately.
                    </p>
                    {uploadingImage && <p className='text-xs text-primary mt-2'>Uploading...</p>}
                    {imagePreviewUrl && !uploadingImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imagePreviewUrl}
                        alt='Cover preview'
                        className='mt-3 h-40 w-full object-cover rounded-lg border border-gray-200'
                      />
                    )}
                  </div>

                  <div className='border border-gray-200 rounded-xl p-6'>
                    <h3 className='font-semibold text-gray-900 mb-4'>Publishing</h3>

                    <FormikField
                      name='category'
                      label='Category'
                      type='select'
                      value={values.category}
                      error={errors.category}
                      touched={touched.category}
                      selectFieldProps={{
                        options: categoryOptions.map(c => ({ label: c.name, value: String(c.id) })),
                        value:
                          categoryOptions
                            .map(c => ({ label: c.name, value: String(c.id) }))
                            .find(o => o.value === values.category) || null,
                      }}
                    />
                    <div className='flex items-center gap-2 -mt-2 mb-4'>
                      <input
                        type='text'
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        placeholder='New category name'
                        className='input input-bordered input-sm flex-1'
                      />
                      <button
                        type='button'
                        onClick={handleAddCategory}
                        disabled={addingCategory || !newCategoryName.trim()}
                        className='btn btn-sm btn-outline btn-primary'
                      >
                        {addingCategory ? "Adding..." : "Add"}
                      </button>
                    </div>

                    <FormikField
                      name='status'
                      label='Status'
                      type='select'
                      value={values.status}
                      error={errors.status}
                      touched={touched.status}
                      selectFieldProps={{
                        options: [
                          { label: "Draft", value: "DRAFT" },
                          { label: "Published", value: "PUBLISHED" },
                        ],
                        value: [
                          { label: "Draft", value: "DRAFT" },
                          { label: "Published", value: "PUBLISHED" },
                        ].find(o => o.value === values.status),
                      }}
                    />

                    <label className='flex items-center gap-2 mt-4 cursor-pointer'>
                      <input
                        type='checkbox'
                        checked={values.is_featured}
                        onChange={e => setFieldValue("is_featured", e.target.checked)}
                        className='checkbox checkbox-sm checkbox-primary'
                      />
                      <span className='text-sm'>Featured on public blog page</span>
                    </label>
                    <label className='flex items-center gap-2 mt-2 cursor-pointer'>
                      <input
                        type='checkbox'
                        checked={values.is_pinned}
                        onChange={e => setFieldValue("is_pinned", e.target.checked)}
                        className='checkbox checkbox-sm checkbox-primary'
                      />
                      <span className='text-sm'>Pinned to top of listings</span>
                    </label>
                  </div>

                  {isEdit && post && (
                    <div className='border border-gray-200 rounded-xl p-6'>
                      <h3 className='font-semibold text-gray-900 mb-4'>Danger zone</h3>
                      <DeletePostButton id={post.id} title={post.title} redirectTo='/admin/blog' labeled />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className='flex items-center gap-3 pt-6 mt-6 border-t border-gray-100'>
              <Button loading={isSubmitting} color='primary' className='text-white' type='submit'>
                {isSubmitting ? "" : post ? "Save Changes" : "Create Post"}
              </Button>
              <Button type='button' color='ghost' onClick={() => router.push("/admin/blog")}>
                Cancel
              </Button>
            </div>
          </form>
        );
      }}
    </Formik>
  );
};

export default BlogPostForm;
