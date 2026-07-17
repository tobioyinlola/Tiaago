import AccessDenied from "@/app/common/components/AccessDenied";

const UnauthorisedPage = async ({
  searchParams,
}: {
  searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>>;
}) => {
  const resolvedSearchParams = await searchParams;
  const permission =
    typeof resolvedSearchParams.permission === "string" ? resolvedSearchParams.permission : undefined;

  return (
    <AccessDenied
      showLogo
      title="Access Restricted"
      message="You do not have permission to view this page."
      backHref="/admin"
      backLabel="Back to Dashboard"
      permissionLabel={permission ? `Required: ${permission}` : undefined}
    />
  );
};

export default UnauthorisedPage;
