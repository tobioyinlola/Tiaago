"use client";

import { createContext, useContext, useState } from "react";

import { AssessmentInviteDetail } from "@/app/common/types";

type InviteFlowContextValue = AssessmentInviteDetail & {
  token: string;
  setCandidateName: (name: string) => void;
  honestyAgreementAccepted: boolean;
  setHonestyAgreementAccepted: (accepted: boolean) => void;
  environmentReady: boolean;
  setEnvironmentReady: (ready: boolean) => void;
  cameraStream: MediaStream | null;
  setCameraStream: (stream: MediaStream | null) => void;
  proctoringSessionId: string | null;
  setProctoringSessionId: (id: string | null) => void;
};

const InviteFlowContext = createContext<InviteFlowContextValue | null>(null);

export const InviteFlowProvider = ({
  token,
  initialData,
  children,
}: {
  token: string;
  initialData: AssessmentInviteDetail;
  children: React.ReactNode;
}) => {
  const [candidateName, setCandidateName] = useState(initialData.candidate_name);
  const [honestyAgreementAccepted, setHonestyAgreementAccepted] = useState(false);
  const [environmentReady, setEnvironmentReady] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [proctoringSessionId, setProctoringSessionId] = useState<string | null>(null);

  return (
    <InviteFlowContext.Provider
      value={{
        ...initialData,
        candidate_name: candidateName,
        token,
        setCandidateName,
        honestyAgreementAccepted,
        setHonestyAgreementAccepted,
        environmentReady,
        setEnvironmentReady,
        cameraStream,
        setCameraStream,
        proctoringSessionId,
        setProctoringSessionId,
      }}
    >
      {children}
    </InviteFlowContext.Provider>
  );
};

export const useInviteFlow = () => {
  const ctx = useContext(InviteFlowContext);
  if (!ctx) {
    throw new Error("useInviteFlow must be used within InviteFlowProvider");
  }
  return ctx;
};
