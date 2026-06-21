import dynamic from "next/dynamic";
import { notFound } from "next/navigation";

import { getRoom } from "../services";
import EmptyState from "@/app/common/components/dashboard/EmptyState";

const VideoCall = dynamic(() => import("../_components/VideoCall"), {
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  ),
});

export const metadata = {
  title: "Video Call",
};

const VideoCallPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ roomId?: string }>;
  searchParams: Promise<{ token?: string }>;
}) => {
  const { roomId } = await params;
  const { token } = await searchParams;
  if (!roomId || typeof roomId !== "string") notFound();
  if (!token || typeof token !== "string") notFound();

  const room = await getRoom(roomId);
  if (!room)
    return (
      <div className='h-screen flex items-center justify-center gap-5 flex-col'>
        <EmptyState text='Meeting not found' className='gap-3 pb-0' />
      </div>
    );
  return <VideoCall url={room.url} token={token} />;
};

export default VideoCallPage;
