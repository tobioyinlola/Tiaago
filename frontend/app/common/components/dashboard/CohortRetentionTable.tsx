import { cn } from "@/app/common/utils";
import ScrollArea from "@/app/common/components/ScrollArea";
import { EmptyStateV3 } from "@/app/common/components/dashboard/EmptyState";

export type CohortRow = {
  cohort: string;
  cohort_size: number;
  months: { offset: number; pct_active: number }[];
};

const cellColor = (pct: number) => {
  if (pct >= 70) return "bg-badge-green-bg text-badge-green-text";
  if (pct >= 40) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-700";
};

const CohortRetentionTable = ({ rows }: { rows: CohortRow[] }) => {
  if (!rows.length) {
    return (
      <EmptyStateV3
        text='No cohort data yet'
        subText='Once organisations start signing up, monthly retention will appear here.'
      />
    );
  }

  const maxOffset = Math.max(...rows.map(r => r.months.length - 1));

  return (
    <ScrollArea className='border rounded dashboard-content-constraint'>
      <table className='table text-sm text-center'>
        <thead>
          <tr>
            <th className='text-left'>Signup month</th>
            <th>Cohort size</th>
            {Array.from({ length: maxOffset + 1 }, (_, i) => (
              <th key={i}>Month {i}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.cohort}>
              <td className='text-left font-medium'>{row.cohort}</td>
              <td>{row.cohort_size}</td>
              {Array.from({ length: maxOffset + 1 }, (_, i) => {
                const cell = row.months.find(m => m.offset === i);
                return (
                  <td key={i}>
                    {cell ? (
                      <span
                        className={cn(
                          "inline-block min-w-[3rem] rounded px-2 py-1 font-medium",
                          cellColor(cell.pct_active)
                        )}
                      >
                        {cell.pct_active}%
                      </span>
                    ) : (
                      <span className='text-muted-foreground'>—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollArea>
  );
};

export default CohortRetentionTable;
