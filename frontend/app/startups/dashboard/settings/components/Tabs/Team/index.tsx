import EmptyState from "@/app/common/components/dashboard/EmptyState";

const TeamMembersTab = () => {
  return (
    <>
      <div className='w-full rounded-t-lg p-6 bg-[#D9DDFF] mt-4 flex items-center justify-between'>
        <div>
          <h2 className='text-base font-semibold'>Team Members</h2>
          <p className='text-gray-500 text-sm'>
            Manage your team members and their account permissions here.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <button className='btn btn-ghost bg-white text-gray-700 font-medium text-sm'>
            Download
          </button>
          <button className='btn btn-ghost bg-white text-gray-700 font-medium text-sm'>
            Invite an Admin
          </button>
        </div>
      </div>
      <EmptyState
        className='border-x border-[#EAECF0] border-b rounded-b-lg'
        text='Coming soon...'
        imgSrc='/assets/icons/coming-soon.svg'
        imgWidth={200}
        imgHeight={150}
      />
    </>
  );
};

export default TeamMembersTab;
