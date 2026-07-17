import PostJobBtn from "../../components/PostJobBtn";
import SavedCandidatesTable from "../_components/SavedCandidatesTable";

export const metadata = {
  title: "Saved Candidates",
};

const SavedCandidatesPage = () => {
  return (
    <>
      <div className='border-b w-full border-gray-200 pb-1 mb-2'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>
            Saved Candidates
          </h1>
          <PostJobBtn />
        </div>
        <h4 className='text-gray-900 text-sm md:text-base'>
          Kindly go through your saved candidates
        </h4>
      </div>
      <SavedCandidatesTable />
    </>
  );
};

export default SavedCandidatesPage;
