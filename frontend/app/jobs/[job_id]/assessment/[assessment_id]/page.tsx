import {
  Briefcase,
  Clock,
  Code,
  CheckCircle,
  HelpCircle,
  User,
  Shield,
  Award,
  Zap,
  Star,
  Play,
} from "lucide-react";
import { notFound } from "next/navigation";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { getPublicJobByPublicId } from "@/app/common/services/jobs";
import { getCurrentUser } from "@/app/common/services/profile";
import { getCompanyAssessment as getAssessment } from "@/app/common/services/assessment";
import SetTalentProfile from "@/app/talents/(dashboard)/components/SetTalentProfile";
import SetUserProfile from "@/app/common/components/Layout/SetUserProfile";
import Nav from "@/app/common/components/dashboard/Nav";
import ScrollArea from "@/app/common/components/ScrollArea";
import SideNavV3 from "@/app/common/components/dashboard/Nav/SideNavV3";
import { VerifiedBadgeIndicator } from "@/app/common/components/UserAvatar";
import {
  getAssessmentDurationInMinutes,
  getNoOfAssementQuestions,
  handleServerApiCallError,
} from "@/app/common/utils";
import { getTalenProfileStatus } from "@/app/common/services";
import { getSchedule } from "@/app/common/services/schedule";
import { getUnreadMessageCounts } from "@/app/common/services/chat";
import Link from "next/link";

export const metadata = {
  title: "Job Application Assessment",
};

const JobApplicationAssessmentLandingPage = async ({
  params,
}: {
  params: Promise<{ job_id: string; assessment_id: string }>;
}) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const resolvedParams = await params;
  const { job_id, assessment_id } = resolvedParams;
  const { currentUser: user, removeAuthCookies } = await getCurrentUser(
    "talent",
    {
      nullUserRedirect: `/talents/signin?next=/jobs/${job_id}/assessment/${assessment_id}`,
    }
  );

  const profileStatus = await getTalenProfileStatus().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log(
      "Get talent profile status error (job assessment page): ",
      error
    );
    errors.push({
      message: error,
      title: "Error getting talent profile status",
    });
    return {};
  });
  const isProfileComplete = Object.values(profileStatus).every(Boolean);

  // Verify the job exists
  const job = await getPublicJobByPublicId(job_id).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get job error (job assessment page): ", error);
    errors.push({
      message: error,
      title: "Error getting job",
    });
    return null;
  });
  if (!job) return notFound();

  // Get assessment details
  const assessment = await getAssessment(assessment_id).catch(() => null);
  if (!assessment) return notFound();

  const schedule = isProfileComplete
    ? await getSchedule().catch(async e => {
        const error = await handleServerApiCallError(e);
        console.log("Get schedule error (job assessment page): ", error);
        errors.push({
          message: error,
          title: "Error getting schedule",
        });
        return [];
      })
    : [];
  const noOfScheduleRequests = schedule.filter(
    meeting => typeof meeting.accepted !== "boolean"
  ).length;
  const unreadMessageCounts = isProfileComplete
    ? await getUnreadMessageCounts().catch(async e => {
        const error = await handleServerApiCallError(e);
        console.log(
          "Get unread message counts error (job assessment page): ",
          error
        );
        errors.push({
          message: error,
          title: "Error getting unread message counts",
        });
        return [];
      })
    : [];
  const unreadMessageCount = unreadMessageCounts.reduce(
    (acc, curr) => acc + curr.unread_messages,
    0
  );

  const mcqSection = assessment.sections.find(s => s.type === "MCQ");
  const codingTaskSection = assessment.sections.find(
    s => s.type === "CODING_TASK"
  );

  return (
    <div className='bg-white min-h-[100svh]'>
      <DisplayErrorMessages errors={errors} />
      <SetTalentProfile profile={user} isVerified={isProfileComplete} />
      <SetUserProfile profile={user} removeAuthCookies={removeAuthCookies} />
      <Nav
        // subscribedPlan={user.subscribed_plan}
        firstName={user.first_name}
        lastName={user.last_name}
        profilePic={user.profile_pic}
        indicator={
          user.has_passed_assessment ? (
            <VerifiedBadgeIndicator size={18} />
          ) : undefined
        }
        email={user.email}
        className='bg-[#FDFDFD] border-[#F0F2F5]'
      />
      <div className='lg:flex'>
        <div className='max-lg:drawer'>
          <input id='mobile-drawer' type='checkbox' className='drawer-toggle' />
          <div className='max-lg:drawer-side top-[5rem] z-10 h-[calc(100svh-5rem)]'>
            <label
              htmlFor='mobile-drawer'
              aria-label='close sidebar'
              className='drawer-overlay'
            />
            <SideNavV3
              as='talent'
              badges={{
                Schedule: noOfScheduleRequests,
                Inbox: unreadMessageCount,
              }}
              isProfileComplete={isProfileComplete}
            />
          </div>
        </div>
        <ScrollArea className='h-[calc(100svh-5rem)] max-lg:drawer-content bg-[#F8F9FA] px-3 md:px-8 flex-1'>
          <div className='h-8' />
          {/* Welcome Section */}
          <div className='text-center mb-12'>
            <div className='inline-flex items-center bg-primary/5 rounded-full px-6 py-3 mb-6 border border-primary/20'>
              <User className='w-5 h-5 text-primary mr-2' />
              <span className='text-primary font-medium'>
                Welcome, {user.first_name}!
              </span>
            </div>

            <h1 className='text-3xl md:text-4xl font-bold text-gray-900 mb-6'>
              Assessment Invitation
            </h1>
            <p className='text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed'>
              You&apos;ve been invited to take a skill assessment for the{" "}
              {job.role_title} position at {job.company?.company_name}.
            </p>
          </div>

          {/* Assessment Card */}
          <div className='bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-8'>
            {/* Card Header */}
            <div className='bg-primary text-white p-8'>
              <div className='flex items-center mb-4'>
                <div className='w-16 h-16 bg-white bg-opacity-20 rounded-xl flex items-center justify-center mr-6'>
                  <Briefcase className='w-8 h-8' />
                </div>
                <div>
                  <h2 className='text-2xl font-bold mb-1'>
                    Assessment for {job.role_title}
                  </h2>
                  <p className='text-primary-content/80 text-lg'>
                    {job.company?.company_name} • {user.first_name}
                  </p>
                </div>
              </div>
            </div>

            {/* Card Content */}
            <div className='p-8'>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
                <div className='flex items-center p-6 bg-primary/5 rounded-xl border border-primary/20'>
                  <div className='w-12 h-12 bg-primary rounded-lg flex items-center justify-center mr-4'>
                    <Clock className='w-6 h-6 text-white' />
                  </div>
                  <div>
                    <div className='text-sm text-primary font-medium'>
                      Duration
                    </div>
                    <div className='font-bold text-gray-900 text-lg'>
                      {getAssessmentDurationInMinutes(assessment)} minutes
                    </div>
                  </div>
                </div>

                <div className='flex items-center p-6 bg-primary/5 rounded-xl border border-primary/20'>
                  <div className='w-12 h-12 bg-primary rounded-lg flex items-center justify-center mr-4'>
                    <HelpCircle className='w-6 h-6 text-white' />
                  </div>
                  <div>
                    <div className='text-sm text-primary font-medium'>
                      Questions
                    </div>
                    <div className='font-bold text-gray-900 text-lg'>
                      {getNoOfAssementQuestions(assessment)}
                    </div>
                  </div>
                </div>

                <div className='flex items-center p-6 bg-primary/5 rounded-xl border border-primary/20'>
                  <div className='w-12 h-12 bg-primary rounded-lg flex items-center justify-center mr-4'>
                    <Code className='w-6 h-6 text-white' />
                  </div>
                  <div>
                    <div className='text-sm text-primary font-medium'>
                      Coding Task
                    </div>
                    <div className='font-bold text-gray-900 text-lg'>
                      {codingTaskSection ? "Included" : "Not Included"}
                    </div>
                  </div>
                </div>
              </div>

              <div className='bg-primary/5 rounded-xl p-6 mb-8 border border-primary/20'>
                <h3 className='text-xl font-bold text-gray-900 mb-4'>
                  What to Expect
                </h3>
                <p className='text-gray-700 leading-relaxed mb-4'>
                  {assessment.description}
                </p>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className='flex items-start space-x-3'>
                    <div className='w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5'>
                      <CheckCircle className='w-4 h-4 text-primary' />
                    </div>
                    <div>
                      <div className='font-medium text-gray-900'>
                        Technical Questions
                      </div>
                      <div className='text-sm text-gray-600'>
                        Multiple choice and coding challenges
                      </div>
                    </div>
                  </div>

                  <div className='flex items-start space-x-3'>
                    <div className='w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5'>
                      <Shield className='w-4 h-4 text-primary' />
                    </div>
                    <div>
                      <div className='font-medium text-gray-900'>
                        Secure Environment
                      </div>
                      <div className='text-sm text-gray-600'>
                        Proctored and monitored for integrity
                      </div>
                    </div>
                  </div>

                  <div className='flex items-start space-x-3'>
                    <div className='w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5'>
                      <Award className='w-4 h-4 text-primary' />
                    </div>
                    <div>
                      <div className='font-medium text-gray-900'>
                        Instant Feedback
                      </div>
                      <div className='text-sm text-gray-600'>
                        Get results immediately after completion
                      </div>
                    </div>
                  </div>

                  <div className='flex items-start space-x-3'>
                    <div className='w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5'>
                      <Zap className='w-4 h-4 text-primary' />
                    </div>
                    <div>
                      <div className='font-medium text-gray-900'>
                        AI-Powered Analysis
                      </div>
                      <div className='text-sm text-gray-600'>
                        Advanced evaluation of your responses
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Important Notes */}
              <div className='bg-primary/5 border border-primary/20 rounded-xl p-6 mb-8'>
                <div className='flex items-start space-x-3'>
                  <div className='w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5'>
                    <Star className='w-4 h-4 text-primary' />
                  </div>
                  <div>
                    <h4 className='font-semibold text-gray-900 mb-2'>
                      Important Notes
                    </h4>
                    <ul className='space-y-2 text-sm text-gray-700'>
                      <li>• Ensure you have a stable internet connection</li>
                      <li>• You cannot pause the assessment once started</li>
                      <li>• Make sure you&apos;re in a quiet environment</li>
                      <li>• Have your preferred coding environment ready</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Start Button */}
              <div className='text-center'>
                <Link
                  href={`/jobs/${job_id}/assessment/${assessment_id}/details`}
                  className='btn btn-primary text-lg font-semibold'
                >
                  <Play className='w-6 h-6 mr-3' />
                  Start Assessment
                </Link>

                <p className='text-sm text-gray-500 mt-4'>
                  Powered by Tiaago AI • Secure Assessment Platform
                </p>
              </div>
            </div>
          </div>
          {/* <div className='flex items-center justify-center bg-gray-50'>
            <div className='max-w-2xl mx-auto p-8 bg-white rounded-lg shadow-lg'>
              <div className='text-center'>
                <h1 className='text-3xl font-bold text-gray-900 mb-4'>
                  Hi {user.first_name}
                </h1>
                <p className='text-lg text-gray-600 mb-6'>
                  You’ve been invited to take a skill assesemement for the{" "}
                  {job.role} at {job.company?.company_name}, you need to
                  complete the assessment before you move the next stage of the
                  vetting process
                </p>

                <div className='bg-primary/5 border border-primary/20 rounded-lg p-6 mb-8'>
                  <h2 className='text-xl font-semibold text-primary-dark mb-3'>
                    {assessment.title}
                  </h2>
                  <p className='text-primary-dark mb-4'>
                    {assessment.description ||
                      "Complete this assessment to demonstrate your skills and knowledge."}
                  </p>

                  <div className='flex items-center justify-center gap-4 text-sm text-primary'>
                    <span>
                      ⏱️ Duration: {assessment.duration_minutes || 30} minutes
                    </span>
                    <span>
                      📝 Questions: {mcqSection?.mcq_questions?.length || 0}
                    </span>
                    {codingTaskSection && <span>💻 Coding Task: Included</span>}
                  </div>
                </div>

                <div className='space-y-4'>
                  <Link
                    href={`/jobs/${job_id}/assessment/${assessment_id}/details`}
                    className='inline-block w-full bg-primary text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-dark transition-colors'
                  >
                    Start Assessment
                  </Link>
                  <p className='text-sm text-gray-500'>
                    This assessment will help us better understand your skills
                    and qualifications.
                  </p>
                </div>
              </div>
            </div>
          </div> */}
          <div className='h-8' />
        </ScrollArea>
      </div>
    </div>
  );
};

export default JobApplicationAssessmentLandingPage;
