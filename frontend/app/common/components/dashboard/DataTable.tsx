import ScrollArea from "@/app/common/components/ScrollArea";
import { EmptyStateV3 } from "@/app/common/components/dashboard/EmptyState";
import { cn } from "@/app/common/utils";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string | number;
  emptyText?: string;
  emptySubText?: string;
  className?: string;
};

// Generic wrapper around the table table-zebra + ScrollArea + EmptyStateV3
// markup used across every admin list page (e.g. Email Logs) -- callers
// still own pagination/search state at the page level via SearchBar/
// ServerPagination, matching the existing server-driven convention.
function DataTable<T>({
  columns,
  data,
  rowKey,
  emptyText = "Nothing here yet",
  emptySubText,
  className,
}: DataTableProps<T>) {
  return (
    <ScrollArea className={cn("border mb-8 rounded dashboard-content-constraint", className)}>
      <table className='table table-zebra text-sm text-center'>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} className={col.className}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className='text-foreground text-xs'>
          {data.length ? (
            data.map((row, i) => (
              <tr key={rowKey(row, i)}>
                {columns.map(col => (
                  <td key={col.key} className={col.className}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length}>
                <EmptyStateV3 text={emptyText} subText={emptySubText} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </ScrollArea>
  );
}

export default DataTable;
