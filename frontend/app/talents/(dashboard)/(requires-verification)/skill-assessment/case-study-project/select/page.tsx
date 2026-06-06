import {
  getAvailableCaseStudyProjects,
  getCaseStudyAttempts,
} from "@/app/common/services/case-study";
import { isPremiumPlan } from "@/app/common/utils";
import SelectCSP from "../../_components/SelectCSP";
import { getCurrentUser } from "@/app/common/services/profile";
import { useTalentStore } from "@/app/talents/(dashboard)/store";
import { getSubscriptionPlan } from "@/app/common/services/subscription";

export const metadata = {
  title: "Select Case study project",
};

type Props = {
  searchParams?: Promise<{
    id?: string;
  }>;
};

const SelectCaseStudyProjectPage = async ({ searchParams }: Props) => {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  let currentUser = useTalentStore.getState().profile;
  if (!currentUser) {
    currentUser = (await getCurrentUser("talent")).currentUser;
    useTalentStore.setState({ profile: currentUser });
  }
  const subscribedPlan = currentUser?.subscribed_plan
    ? await getSubscriptionPlan(currentUser.subscribed_plan.plan_id)
    : undefined;
  const projects = await getAvailableCaseStudyProjects();
  const attempts = await getCaseStudyAttempts();
  const projectId = resolvedSearchParams?.id;
  return (
    <div className='p-8 max-md:px-1 flex flex-col gap-6 sm:gap-8'>
      <div className='border-b border-gray-200 pb-1'>
        <h1 className='text-2xl mb-1 font-space-grotesk font-semibold'>
          Case study project
        </h1>
        <h4 className='text-gray-900 text-base'>
          Kindly select your preferred project
        </h4>
      </div>
      <SelectCSP
        projects={projects}
        attempts={attempts}
        isPremiumUser={isPremiumPlan(subscribedPlan)}
        defaultProject={projectId}
      />
    </div>
  );
};

export default SelectCaseStudyProjectPage;
