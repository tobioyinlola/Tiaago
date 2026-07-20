const KeyTakeaways = ({ items }: { items: string[] }) => {
  if (!items.length) return null;

  return (
    <div className='max-w-3xl mx-auto px-4 mb-10'>
      <div className='border-l-4 border-[#5465FF] bg-[#5465FF]/[0.04] rounded-r-xl p-6'>
        <h2 className='text-sm font-jetbrains-mono uppercase tracking-widest text-[#5465FF] font-semibold mb-3'>
          Key Takeaways
        </h2>
        <ul className='flex flex-col gap-2'>
          {items.map((item, index) => (
            <li key={index} className='flex items-start gap-2.5 text-gray-800'>
              <span className='mt-2 h-1.5 w-1.5 rounded-full bg-[#5465FF] shrink-0' />
              <span className='leading-relaxed'>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default KeyTakeaways;
