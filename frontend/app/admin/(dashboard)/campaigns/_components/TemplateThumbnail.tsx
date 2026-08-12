"use client";

// A real rendered-HTML thumbnail (scaled down via CSS transform inside a
// clipped iframe) rather than the old gradient-and-text placeholder --
// there was no live-thumbnail precedent in the codebase for this feature.
const TemplateThumbnail = ({ html, heightClassName = "h-28" }: { html: string; heightClassName?: string }) => (
  <div className={`relative w-full overflow-hidden bg-white ${heightClassName}`}>
    {html ? (
      <iframe
        title="Template preview"
        srcDoc={html}
        sandbox=""
        className="pointer-events-none absolute left-0 top-0 w-[400%] h-[400%] origin-top-left scale-[0.25] border-0"
      />
    ) : (
      <div className="flex h-full w-full items-center justify-center text-xs text-[#9E9E9E]">No content yet</div>
    )}
  </div>
);

export default TemplateThumbnail;
