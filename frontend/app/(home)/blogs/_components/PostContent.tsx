import sanitizeHtml from "sanitize-html";

const clean = (html: string) =>
  sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2"]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt", "width", "height"],
      a: ["href", "name", "target", "rel"],
    },
    // CKEditor-authored content is trusted (staff-only), but external links
    // still get target/rel hardened for visitor safety.
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }),
    },
  });

const PostContent = ({ html }: { html: string }) => {
  return (
    <div
      className='prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-[#5465FF] prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-blockquote:border-l-[#5465FF] prose-blockquote:text-gray-600'
      dangerouslySetInnerHTML={{ __html: clean(html) }}
    />
  );
};

export default PostContent;
