import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Camera } from "lucide-react";

import { getSubmissionSnapshots } from "@/app/common/services/assessment";
import { EmptyStateV3 } from "@/app/common/components/dashboard/EmptyState";

export const metadata = {
  title: "Proctoring Snapshots",
};

type Props = {
  params: Promise<{ submission_id: string }>;
};

const SubmissionSnapshotsPage = async ({ params }: Props) => {
  const { submission_id } = await params;
  const snapshots = await getSubmissionSnapshots(submission_id);

  return (
    <>
      <div className='flex items-center gap-3 mb-6'>
        <Link href='/recruiter/dashboard/pipeline' className='text-gray-500 hover:text-gray-800'>
          <ArrowLeft className='h-5 w-5' />
        </Link>
        <div className='flex items-center gap-2'>
          <Camera className='h-6 w-6 text-primary' />
          <h1 className='text-2xl font-bold font-space-grotesk'>Proctoring Snapshots</h1>
        </div>
      </div>
      <p className='text-gray-500 text-sm mb-8'>
        Periodic camera captures taken during this candidate&apos;s assessment attempt.
      </p>

      {!snapshots.length ? (
        <EmptyStateV3
          text='No snapshots captured'
          subText='The candidate may not have granted camera access during this attempt.'
        />
      ) : (
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'>
          {snapshots.map(snapshot => (
            <div key={snapshot.id} className='border border-gray-200 rounded-lg overflow-hidden'>
              <div className='relative aspect-video bg-gray-100'>
                <Image
                  src={snapshot.image}
                  alt={`Snapshot at ${new Date(snapshot.created_at).toLocaleTimeString()}`}
                  fill
                  className='object-cover'
                />
              </div>
              <p className='text-xs text-gray-500 px-2 py-1.5'>
                {new Date(snapshot.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default SubmissionSnapshotsPage;
