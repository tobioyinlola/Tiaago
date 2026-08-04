"use client";

import { use } from "react";
import dynamic from "next/dynamic";

const SessionLoader = () => (
  <div className='fixed inset-0 bg-white flex items-center justify-center'>
    <span className='loading loading-dots loading-lg text-primary' />
  </div>
);

// livekit-client touches browser globals (RTCPeerConnection, navigator) on
// import -- keep it out of SSR and out of the pre-join screen's bundle,
// same reasoning as daily-js in app/interview/join/[token].
const AIInterviewLiveSession = dynamic(() => import("./_components/AIInterviewLiveSession"), {
  ssr: false,
  loading: () => <SessionLoader />,
});

type Props = { params: Promise<{ token: string }> };

const AIInterviewSessionPage = ({ params }: Props) => {
  const { token } = use(params);
  return <AIInterviewLiveSession token={token} />;
};

export default AIInterviewSessionPage;
