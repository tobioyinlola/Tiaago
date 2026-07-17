import Link from "next/link";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

type SortableHeaderProps = {
  field: string;
  label: string;
  currentOrdering?: string;
  searchParams: Record<string, string | string[] | undefined>;
};

// Column-header sort control for server-rendered tables: toggles `field`/`-field`
// in the `ordering` query param, matching the URL-driven search/pagination
// convention already used by SearchBar/ServerPagination on these pages.
const SortableHeader = ({ field, label, currentOrdering, searchParams }: SortableHeaderProps) => {
  const isActive = currentOrdering === field || currentOrdering === `-${field}`;
  const isDesc = currentOrdering === `-${field}`;
  const nextOrdering = isActive && !isDesc ? `-${field}` : field;

  return (
    <Link
      href={{ query: { ...searchParams, ordering: nextOrdering } }}
      className='inline-flex items-center gap-1 hover:text-primary'
    >
      {label}
      {isActive ? (
        isDesc ? <ChevronDown className='h-3.5 w-3.5' /> : <ChevronUp className='h-3.5 w-3.5' />
      ) : (
        <ChevronsUpDown className='h-3.5 w-3.5 opacity-40' />
      )}
    </Link>
  );
};

export default SortableHeader;
