import { LuExternalLink } from "react-icons/lu";

import AddNewRole from "../../components/AddNewRole";
import ScrollArea from "@/app/common/components/ScrollArea";
import ApprovalActions from "./_components/ApprovalActions";
import { getAllTalents } from "@/app/common/services/profile";
import EmptyState from "@/app/common/components/dashboard/EmptyState";
import { AvatarWithVerifiedBadge } from "@/app/common/components/UserAvatar";
import { getAllCaseStudyAttempts } from "@/app/common/services/case-study";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";

export const metadata = {
  title: "Case Studies Approval",
};

const CaseStudiesApprovalPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const [talents, caseStudyAttempts] = await Promise.all([
    getAllTalents().catch(async e => {
      const error = await handleServerApiCallError(e);
      console.log("Get talents error (admin case studies approval page): ", error);
      errors.push({
        message: error,
        title: "Error getting talents",
      });
      return null;
    }),
    getAllCaseStudyAttempts().catch(async e => {
      const error = await handleServerApiCallError(e);
      console.log("Get case study attempts error (admin case studies approval page): ", error);
      errors.push({
        message: error,
        title: "Error getting case study attempts",
      });
      return null;
    }),
  ]);
  // const caseStudyProjects = await getCaseStudyProjects();
  const needsApproval = caseStudyAttempts?.filter(
    attempt => attempt.approved === null
  );
  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>
            Approval
          </h1>
          <AddNewRole />
        </div>
        <h4 className='text-gray-900 text-sm md:text-base'>
          Kindly review and approve the case studies of the talents
        </h4>
      </div>
      <ScrollArea className='border mb-8 rounded dashboard-content-constraint'>
        <table className='table'>
          {/* head */}
          <thead>
            <tr>
              <th className='max-sm:hidden'>S/N</th>
              <th>Talent</th>
              <th>Role</th>
              <th>Remark</th>
              <th>Case Study Link</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {!!needsApproval && needsApproval.length ? (
              needsApproval.map((attempt, index) => {
                // const project = caseStudyProjects.find(
                //   project => project.id === attempt.project_id
                // );
                const talent = talents?.results.find(
                  talent => talent.pk === attempt.user_id
                );
                return (
                  <tr key={attempt.id}>
                    <td className='max-sm:hidden'>{index + 1}</td>
                    <td className='flex items-center gap-2'>
                      {talent ? (
                        <>
                          <AvatarWithVerifiedBadge
                            profilePic={talent.profile_pic}
                            firstName={talent.first_name}
                            lastName={talent.last_name}
                            className='w-10'
                            verified={talent.has_passed_assessment}
                          />
                          <div className='font-medium'>
                            <h6 className='text-[#101828]'>
                              {talent.first_name} {talent.last_name}
                            </h6>
                            <p className='text-[#667085]'>{talent.email}</p>
                          </div>
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                    {/* <td>{project?.role_names.join(", ")}</td> */}
                    <td className='capitalize'>{talent?.role}</td>
                    <td className='line-clamp-1'>{attempt.remark ?? "-"}</td>
                    <td>
                      <a
                        href={attempt.submission}
                        target='_blank'
                        rel='noreferrer'
                        className='text-primary hover:opacity-70 flex items-center gap-1'
                      >
                        Open <LuExternalLink />
                      </a>
                    </td>
                    <td>
                      {!!talent && (
                        <ApprovalActions
                          id={attempt.id}
                          projectId={attempt.project_id}
                          talentId={talent.id}
                          talentName={[talent.first_name, talent.last_name]
                            .join(" ")
                            .trim()}
                        />
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5}>
                  <EmptyState text='There are no case studies to approve' />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ScrollArea>
    </>
  );
};

export default CaseStudiesApprovalPage;
