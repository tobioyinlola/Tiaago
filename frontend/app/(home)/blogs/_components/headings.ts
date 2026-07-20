export type PostHeading = { id: string; text: string; level: 2 | 3 };

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";

const stripTags = (html: string) => html.replace(/<[^>]+>/g, "").trim();

/**
 * Scans h2/h3 tags in already-sanitized post content HTML, injects a unique
 * `id` on each so the table of contents can link/scroll to them, and returns
 * the modified HTML alongside the flat heading list the TOC renders from.
 */
export const extractHeadingsAndSlugify = (html: string): { html: string; headings: PostHeading[] } => {
  const headings: PostHeading[] = [];
  const seenSlugs = new Map<string, number>();

  const modifiedHtml = html.replace(/<(h[23])([^>]*)>(.*?)<\/\1>/gis, (match, tag, attrs, inner) => {
    const level = (tag === "h2" ? 2 : 3) as 2 | 3;
    const text = stripTags(inner);
    if (!text) return match;

    const baseSlug = slugify(text);
    const count = seenSlugs.get(baseSlug) || 0;
    seenSlugs.set(baseSlug, count + 1);
    const id = count === 0 ? baseSlug : `${baseSlug}-${count}`;

    headings.push({ id, text, level });

    const attrsWithoutId = attrs.replace(/\sid="[^"]*"/i, "");
    return `<${tag}${attrsWithoutId} id="${id}">${inner}</${tag}>`;
  });

  return { html: modifiedHtml, headings };
};
