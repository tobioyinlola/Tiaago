import Link from "next/link";
import { format } from "date-fns";
import { LuExternalLink } from "react-icons/lu";

import { cn } from "@/app/common/utils";
import { PASS_THRESHOLD } from "@/app/common/constants";
import ScrollArea from "@/app/common/components/ScrollArea";
import StatusBadge from "@/app/common/components/StatusBadge";
import { QuizAttempt, SkillAssessment } from "@/app/common/types";
import EmptyState from "@/app/common/components/dashboard/EmptyState";

const PreviousAssessments = ({
  quizAttempts = [],
  skillAssessments = [],
  role,
}: {
  quizAttempts: QuizAttempt[];
  skillAssessments: SkillAssessment[];
  role: string;
}) => {
  return (
    <div>
      <div className='w-full rounded-t-lg pl-6 pr-2 h-20 bg-[#F5F5F5] flex items-center justify-between border border-b-0'>
        <h2 className='text-base font-semibold'>Recent Assessments</h2>
        <div className='border-l flex items-center'>
          <button
            className='btn btn-sm btn-ghost bg-white mx-[14px]'
            aria-label='change sort order'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='20'
              height='20'
              viewBox='0 0 20 20'
              fill='none'
            >
              <path
                fillRule='evenodd'
                clipRule='evenodd'
                d='M10.2928 7.70659C10.1053 7.51906 10 7.26476 10 6.99959C10 6.73443 10.1053 6.48012 10.2928 6.29259L13.2928 3.29259C13.385 3.19708 13.4954 3.1209 13.6174 3.06849C13.7394 3.01608 13.8706 2.9885 14.0034 2.98734C14.1362 2.98619 14.2678 3.01149 14.3907 3.06177C14.5136 3.11205 14.6253 3.18631 14.7192 3.2802C14.8131 3.37409 14.8873 3.48574 14.9376 3.60864C14.9879 3.73154 15.0132 3.86321 15.012 3.99599C15.0109 4.12877 14.9833 4.25999 14.9309 4.382C14.8785 4.504 14.8023 4.61435 14.7068 4.70659L11.7068 7.70659C11.5193 7.89406 11.265 7.99938 10.9998 7.99938C10.7346 7.99938 10.4803 7.89406 10.2928 7.70659Z'
                fill='#344054'
              />
              <path
                fillRule='evenodd'
                clipRule='evenodd'
                d='M17.7064 7.70643C17.5189 7.8939 17.2646 7.99922 16.9994 7.99922C16.7343 7.99922 16.48 7.8939 16.2924 7.70643L13.2924 4.70643C13.1103 4.51783 13.0095 4.26523 13.0118 4.00303C13.014 3.74083 13.1192 3.49002 13.3046 3.30461C13.49 3.1192 13.7408 3.01403 14.003 3.01176C14.2652 3.00948 14.5178 3.11027 14.7064 3.29243L17.7064 6.29243C17.8939 6.47996 17.9992 6.73427 17.9992 6.99943C17.9992 7.2646 17.8939 7.5189 17.7064 7.70643Z'
                fill='#344054'
              />
              <path
                fillRule='evenodd'
                clipRule='evenodd'
                d='M13.9994 5C14.2646 5 14.519 5.10536 14.7065 5.29289C14.8941 5.48043 14.9994 5.73478 14.9994 6V14C14.9994 14.2652 14.8941 14.5196 14.7065 14.7071C14.519 14.8946 14.2646 15 13.9994 15C13.7342 15 13.4799 14.8946 13.2923 14.7071C13.1048 14.5196 12.9994 14.2652 12.9994 14V6C12.9994 5.73478 13.1048 5.48043 13.2923 5.29289C13.4799 5.10536 13.7342 5 13.9994 5ZM9.70643 12.293C9.8939 12.4805 9.99922 12.7348 9.99922 13C9.99922 13.2652 9.8939 13.5195 9.70643 13.707L6.70643 16.707C6.51783 16.8892 6.26523 16.99 6.00303 16.9877C5.74083 16.9854 5.49002 16.8802 5.30461 16.6948C5.1192 16.5094 5.01403 16.2586 5.01176 15.9964C5.00948 15.7342 5.11027 15.4816 5.29243 15.293L8.29243 12.293C8.47996 12.1055 8.73427 12.0002 8.99943 12.0002C9.2646 12.0002 9.5189 12.1055 9.70643 12.293Z'
                fill='#344054'
              />
              <path
                fillRule='evenodd'
                clipRule='evenodd'
                d='M2.29279 12.2928C2.48031 12.1053 2.73462 12 2.99979 12C3.26495 12 3.51926 12.1053 3.70679 12.2928L6.70679 15.2928C6.8023 15.385 6.87848 15.4954 6.93089 15.6174C6.9833 15.7394 7.01088 15.8706 7.01204 16.0034C7.01319 16.1362 6.98789 16.2678 6.93761 16.3907C6.88733 16.5136 6.81307 16.6253 6.71918 16.7192C6.62529 16.8131 6.51364 16.8873 6.39074 16.9376C6.26784 16.9879 6.13616 17.0132 6.00339 17.012C5.87061 17.0109 5.73939 16.9833 5.61738 16.9309C5.49538 16.8785 5.38503 16.8023 5.29279 16.7068L2.29279 13.7068C2.10532 13.5193 2 13.265 2 12.9998C2 12.7346 2.10532 12.4803 2.29279 12.2928Z'
                fill='#344054'
              />
              <path
                fillRule='evenodd'
                clipRule='evenodd'
                d='M6 15C5.73478 15 5.48043 14.8946 5.29289 14.7071C5.10536 14.5196 5 14.2652 5 14V6C5 5.73478 5.10536 5.48043 5.29289 5.29289C5.48043 5.10536 5.73478 5 6 5C6.26522 5 6.51957 5.10536 6.70711 5.29289C6.89464 5.48043 7 5.73478 7 6V14C7 14.2652 6.89464 14.5196 6.70711 14.7071C6.51957 14.8946 6.26522 15 6 15Z'
                fill='#344054'
              />
            </svg>
          </button>
          <button className='btn btn-ghost bg-white text-gray-700'>
            View All
          </button>
        </div>
      </div>
      <ScrollArea className='border border-t-0 rounded-b-lg mb-8 dashboard-content-constraint'>
        <table className='table table-zebra'>
          {/* head */}
          <thead>
            <tr>
              <th className='max-md:hidden'>S/N</th>
              <th>Date of test</th>
              <th className='max-md:hidden'>Skill Assessed</th>
              <th>Score Achieved</th>
              <th className='max-md:hidden'>Feedback</th>
              <th className='max-md:hidden'>Case Study Project</th>
              <th>Overall Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {skillAssessments.length ? (
              skillAssessments.map((item, index) => {
                const quizAttempt = quizAttempts.find(
                  attempt => attempt.id === item.quiz_id
                );
                const percentage =
                  ((quizAttempt?.correct_answers || 0) /
                    (quizAttempt?.no_of_questions || 0)) *
                  100;
                const dateOfTest = quizAttempt?.created
                  ? new Date(quizAttempt?.created)
                  : undefined;
                return (
                  <tr key={item.id}>
                    <td className='max-md:hidden'>{index + 1}</td>
                    <td>
                      <div className='font-medium w-fit'>
                        <h6>
                          {!dateOfTest
                            ? "-"
                            : format(dateOfTest, "MMM dd, yyyy")}
                        </h6>
                        <p className='text-[#667085]'>
                          {!dateOfTest ? "-" : format(dateOfTest, "hh:mm a")}
                        </p>
                      </div>
                    </td>
                    <td className='max-md:hidden capitalize'>{role}</td>
                    <td>
                      <span
                        className={cn(
                          "text-green-800 font-medium",
                          percentage < PASS_THRESHOLD && "text-red-800"
                        )}
                      >
                        {percentage.toFixed(2)}%
                      </span>
                    </td>
                    <td className='max-md:hidden'>-</td>
                    <td className='max-md:hidden flex items-center gap-1'>
                      {item.project_name ?? "-"}
                      {!!item.project_id && (
                        <Link
                          href={`/talents/skill-assessment/case-study-project/select?id=${item.project_id}`}
                        >
                          <LuExternalLink className='text-base text-[#7F7F7F]' />
                        </Link>
                      )}
                    </td>
                    <td>
                      <StatusBadge
                        status={item.has_passed ? "completed" : "pending"}
                      />
                    </td>
                    <td>
                      <Link
                        href={`/talents/skill-assessment/results/${item.id}`}
                      >
                        <LuExternalLink className='text-base text-[#7F7F7F]' />
                      </Link>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8}>
                  <EmptyState text='You have no recent skill assessments...' />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  );
};

export default PreviousAssessments;
