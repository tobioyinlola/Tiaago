import { notFound } from "next/navigation";

import { getTemplate } from "@/app/common/services/campaigns";
import BlockEditor from "../_components/BlockEditor";

export const metadata = {
  title: "Email Template Editor",
};

const TemplateEditorPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;

  if (id === "new") {
    return <BlockEditor initialTemplate={null} />;
  }

  const template = await getTemplate(id).catch(() => null);
  if (!template) return notFound();

  return <BlockEditor initialTemplate={template} />;
};

export default TemplateEditorPage;
