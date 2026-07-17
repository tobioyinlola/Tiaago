export type MorningDigestProps = {
  activeOrganisationsToday: number;
  resumesScreenedLast24h: number;
  walletTopupsLast24hNgn: number;
};

const MorningDigest = ({
  activeOrganisationsToday,
  resumesScreenedLast24h,
  walletTopupsLast24hNgn,
}: MorningDigestProps) => {
  const items = [
    { label: "Active organisations today", value: activeOrganisationsToday },
    { label: "Resumes screened (last 24h)", value: resumesScreenedLast24h },
    {
      label: "Wallet top-ups (last 24h)",
      value: `₦${walletTopupsLast24hNgn.toLocaleString()}`,
    },
  ];

  return (
    <div className='rounded-xl border bg-gradient-to-br from-primary/5 to-transparent p-6 md:p-8 mb-8'>
      <p className='text-sm font-medium text-muted-foreground mb-6'>
        Morning Digest — today at a glance
      </p>
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-10'>
        {items.map(item => (
          <div key={item.label}>
            <p className='font-space-grotesk text-4xl md:text-5xl font-bold text-primary-black'>
              {item.value}
            </p>
            <p className='mt-2 text-sm text-muted-foreground'>{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MorningDigest;
