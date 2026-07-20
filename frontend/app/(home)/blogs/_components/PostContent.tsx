import sanitizeHtml from "sanitize-html";

const clean = (html: string) =>
  sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2"]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt", "width", "height"],
      a: ["href", "name", "target", "rel"],
      // `id` on headings is injected by extractHeadingsAndSlugify() so the
      // table of contents can link/scroll to each section.
      h1: ["id"],
      h2: ["id"],
      h3: ["id"],
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
      className='prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-headings:tracking-tight prose-headings:scroll-mt-28 prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-[#5465FF] prose-a:no-underline hover:prose-a:underline prose-img:rounded-2xl prose-img:shadow-md prose-strong:text-gray-900 prose-blockquote:border-l-[3px] prose-blockquote:border-l-[#5465FF] prose-blockquote:not-italic prose-blockquote:font-medium prose-blockquote:text-gray-700 prose-blockquote:bg-[#5465FF]/[0.04] prose-blockquote:py-1 prose-blockquote:rounded-r-lg prose-code:text-[#5465FF] prose-code:bg-[#5465FF]/[0.06] prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none'
      dangerouslySetInnerHTML={{ __html: clean(html) }}
    />
  );
};

export default PostContent;
