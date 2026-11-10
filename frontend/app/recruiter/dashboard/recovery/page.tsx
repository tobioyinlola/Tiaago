import DisplayErrorMessages, { DisplayErrorMessagesProps } from "@/app/common/components/DisplayErrorMessages";
import { getRecoveryQueue } from "@/app/common/services/jobs";
import RecoveryQueue from "./_components/RecoveryQueue";

export const metadata = { title: "Needs attention" };

const RecoveryPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const queue = await getRecoveryQueue().catch(error => {
    errors.push({ title: "Could not load the recovery queue", message: error.message });
    return null;
  });
  return <><DisplayErrorMessages errors={errors} /><div className='dashboard-content-constraint flex flex-col gap-6 p-8 max-md:px-1 sm:gap-8'><div><h1 className='font-space-grotesk text-2xl font-semibold'>Needs attention</h1><p className='mt-1 text-secondary-black'>Candidates whose automatic progression was held, and messages that could not be delivered. Nothing here is lost: fix the cause, then retry, or dismiss once you have handled it another way.</p></div><RecoveryQueue initial={queue || { holds: [], notifications: [] }} /></div></>;
};

export default RecoveryPage;
