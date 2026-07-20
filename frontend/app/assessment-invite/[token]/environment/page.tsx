"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Camera, CheckCircle2, XCircle } from "lucide-react";

import DaisyButton from "@/app/common/components/DaisyButton";
import InviteShell from "../_components/InviteShell";
import { useInviteFlow } from "../_components/InviteFlowProvider";

const TIPS = [
  "Take the assessment in an up-to-date version of Chrome, Safari, Edge, or Firefox.",
  "Ensure you have a reliable, stable internet connection.",
  "Close other apps or browser tabs that may impact performance.",
  "Find a quiet, well-lit space free of interruptions.",
];

type PermissionState = "checking" | "allowed" | "denied";

const EnvironmentPage = () => {
  const router = useRouter();
  const { token, cameraStream, setCameraStream, setEnvironmentReady, proctoring } = useInviteFlow();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [permission, setPermission] = useState<PermissionState>("checking");
  const webcamRequired = !!proctoring?.require_webcam;

  useEffect(() => {
    let cancelled = false;
    let localStream: MediaStream | null = null;

    const requestCamera = async () => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (cancelled) {
          localStream.getTracks().forEach(t => t.stop());
          return;
        }
        setCameraStream(localStream);
        setPermission("allowed");
      } catch {
        if (!cancelled) setPermission("denied");
      }
    };

    if (cameraStream) {
      setPermission("allowed");
    } else {
      requestCamera();
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  const handleContinue = () => {
    setEnvironmentReady(true);
    router.push(`/assessment-invite/${token}/ready`);
  };

  return (
    <InviteShell step={4}>
      <h2 className='text-lg font-bold text-primary-black mb-1'>Environment setup</h2>
      <p className='text-secondary-black text-sm mb-6'>
        {webcamRequired
          ? "This assessment requires camera access. We use it for periodic snapshots for the recruiter to review -- we don't record you continuously."
          : "We use your camera for periodic snapshots for the recruiter to review. We don't record you continuously."}
      </p>

      <div className='grid md:grid-cols-2 gap-6 mb-8'>
        <div>
          <p className='text-sm font-medium text-primary-black mb-2'>Check your camera</p>
          <div className='aspect-video bg-[#F9FAFB] border border-gray-200 rounded-xl overflow-hidden flex items-center justify-center'>
            {permission === "allowed" ? (
              <video ref={videoRef} autoPlay muted playsInline className='w-full h-full object-cover' />
            ) : permission === "checking" ? (
              <p className='text-secondary-black text-sm'>Requesting camera access...</p>
            ) : (
              <div className='text-center px-4'>
                <Camera className='h-8 w-8 text-gray-300 mx-auto mb-2' />
                <p className='text-secondary-black text-sm'>Camera access denied</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <p className='text-sm font-medium text-primary-black mb-2'>Device permissions</p>
          <div className='border border-gray-200 rounded-xl p-4 flex items-center justify-between mb-4'>
            <span className='text-sm text-primary-black'>Camera</span>
            {permission === "allowed" ? (
              <span className='inline-flex items-center gap-1.5 text-xs text-success bg-success/10 px-2.5 py-1 rounded-full font-medium'>
                <CheckCircle2 className='h-3.5 w-3.5' /> Allowed
              </span>
            ) : permission === "denied" ? (
              <span className='inline-flex items-center gap-1.5 text-xs text-error bg-error/10 px-2.5 py-1 rounded-full font-medium'>
                <XCircle className='h-3.5 w-3.5' /> Denied
              </span>
            ) : (
              <span className='text-xs text-secondary-black'>Checking...</span>
            )}
          </div>

          <div className='bg-[#F9FAFB] border border-gray-200 rounded-xl p-4'>
            <p className='text-sm text-primary-black mb-2 font-medium'>For the best experience:</p>
            <ul className='space-y-1.5'>
              {TIPS.map(tip => (
                <li key={tip} className='text-xs text-secondary-black flex gap-2'>
                  <span className='text-gray-400'>&bull;</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {permission === "denied" && (
        <p className='text-xs text-warning bg-warning/10 border border-warning/20 rounded-lg px-3 py-2 mb-6'>
          {webcamRequired
            ? "Camera access is required for this assessment. Please enable camera access in your browser settings and refresh this page to continue."
            : "Camera access was denied. You can still take the assessment -- the recruiter just won't receive periodic snapshots. You can enable camera access in your browser settings and refresh if this was a mistake."}
        </p>
      )}

      <div className='flex justify-between pt-6 border-t border-gray-100'>
        <DaisyButton
          type='button'
          color='ghost'
          onClick={() => router.back()}
          className='border border-gray-200'
        >
          Back
        </DaisyButton>
        <DaisyButton
          type='button'
          color='primary'
          className='text-white gap-2'
          disabled={permission === "checking" || (webcamRequired && permission === "denied")}
          onClick={handleContinue}
        >
          Continue <ArrowRight className='h-4 w-4' />
        </DaisyButton>
      </div>
    </InviteShell>
  );
};

export default EnvironmentPage;
