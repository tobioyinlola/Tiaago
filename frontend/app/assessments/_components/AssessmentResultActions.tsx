"use client";

import Link from "next/link";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { useState } from "react";
import html2canvas from "html2canvas-pro";

import { ID } from "@/app/common/types";
import { cn, handleFormSubmissionError } from "@/app/common/utils";
import {
  createOrGetAssessmentCert,
  uploadAssessmentCert,
} from "@/app/common/services/assessment";
import { useAlert } from "@/app/common/store/useAlert";
import { assessmentCertHtml } from "./assessment_cert.template";
import { Talent } from "@/app/common/types";

const AssessmentResultActions = ({
  assessment_id,
  isLastSection,
  passed,
  currentUser,
  mode = "talent-verification",
  jobId,
  onComplete,
}: {
  assessment_id: ID;
  isLastSection: boolean;
  passed: boolean;
  currentUser: Talent;
  mode?: "talent-verification" | "job-application";
  jobId?: string;
  onComplete?: () => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [hasGeneratedCert, setHasGeneratedCert] = useState(false);
  const setAlert = useAlert(s => s.setAlert);

  const showGenerateCertButton =
    isLastSection &&
    passed &&
    !hasGeneratedCert &&
    mode === "talent-verification";

  const handleJobApplicationComplete = () => {
    if (onComplete) {
      onComplete();
    } else {
      // Default behavior for job application completion
      window.location.href = `/jobs/${jobId}/application-complete`;
    }
  };

  const generateCertificate = async () => {
    // Create a temporary div to render the HTML string
    const tempDiv = document.createElement("div");
    try {
      if (loading) return;
      setLoading(true);
      toast.dismiss();
      toast.loading("Generating certificate...", { duration: Infinity });
      const res = await createOrGetAssessmentCert(assessment_id);
      if (res.success) {
        console.log(res);
        if (res.data?.certificate_url) {
          setLoading(false);
          toast.dismiss();
          setHasGeneratedCert(true);
          toast.success("Your Certificate is now available in your dashboard");
          return;
        }
        const htmlString = assessmentCertHtml(
          res.data!,
          [currentUser.first_name, currentUser.last_name].join(" ")
        );
        tempDiv.style.position = "absolute"; // Hide it from view
        tempDiv.style.left = "-9999px";
        tempDiv.innerHTML = htmlString;
        document.body.appendChild(tempDiv);
        const canvas = await html2canvas(tempDiv, {
          scale: 2,
        });
        const imgData = canvas.toDataURL("image/png");
        // console.log(imgData);
        const doc = new jsPDF({
          format: [870, 616],
          unit: "px",
          orientation: "portrait",
          compress: true,
        });
        doc.addImage(imgData, "PNG", 0, 0, 616, 870);
        const blob = doc.output("blob");
        // console.log({ blob });
        const formData = new FormData();
        formData.append(
          "certificate_url",
          blob,
          `${res.data?.recipient.full_name} ${res.data?.assessment.title} Certificate.pdf`
        );
        toast.dismiss();
        toast.loading("Uploading certificate...", { duration: Infinity });
        const finalRes = await uploadAssessmentCert(res.data!.id, formData);
        // console.log(finalRes);
        if (finalRes.success) {
          setLoading(false);
          toast.dismiss();
          toast.success("Your Certificate is now available in your dashboard");
          setHasGeneratedCert(true);
        } else {
          setLoading(false);
          toast.dismiss();
          handleFormSubmissionError(finalRes.error, undefined, setAlert);
        }
      } else {
        setLoading(false);
        toast.dismiss();
        handleFormSubmissionError(res.error, undefined, setAlert);
      }
    } catch (error) {
      setLoading(false);
      toast.dismiss();
      handleFormSubmissionError(error, undefined, setAlert);
    } finally {
      try {
        document.body.removeChild(tempDiv);
      } catch (error) {}
    }
  };

  return (
    <div className='border-[#EAECF0] border-t-2 flex items-center justify-between pt-5 w-full md:container mx-auto mt-auto'>
      {!!(isLastSection && !showGenerateCertButton) && <div />}
      {!isLastSection && mode === "job-application" && <div />}

      {mode === "job-application" ? (
        <button
          onClick={handleJobApplicationComplete}
          className={cn(
            "btn btn-primary max-md:btn-sm",
            !isLastSection && "hidden"
          )}
        >
          Complete Application
        </button>
      ) : (
        <Link
          href={passed ? "/talents/dashboard" : "/talents/assessments"}
          className={cn(
            "btn btn-primary max-md:btn-sm",
            !isLastSection || showGenerateCertButton
              ? "btn-outline"
              : "self-end"
          )}
        >
          {passed ? "Return to Dashboard" : "Go to Assessments"}
        </Link>
      )}

      {showGenerateCertButton && (
        <button
          onClick={generateCertificate}
          className='btn btn-primary max-md:btn-sm'
        >
          Generate Certificate
        </button>
      )}

      {!isLastSection && mode === "talent-verification" && (
        <Link
          href={`/assessments/${assessment_id}/coding-task`}
          className='btn btn-primary max-md:btn-sm'
        >
          Proceed to Next Section
        </Link>
      )}
      {!isLastSection && mode === "job-application" && (
        <Link
          href={`/jobs/${jobId}/assessment/${assessment_id}/coding-task`}
          className='btn btn-primary max-md:btn-sm'
        >
          Proceed to Next Section
        </Link>
      )}
    </div>
  );
};

export default AssessmentResultActions;
