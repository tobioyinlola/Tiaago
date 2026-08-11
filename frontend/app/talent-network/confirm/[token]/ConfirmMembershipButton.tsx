"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { useAlert } from "@/app/common/store/useAlert";
import { confirmTalentNetworkMembership } from "@/app/common/services/talent-network";

const ConfirmMembershipButton = ({ token }: { token: string }) => {
  const setAlert = useAlert(s => s.setAlert);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  if (confirmed) {
    return (
      <div className="flex flex-col items-center gap-2">
        <CheckCircle2 className="w-8 h-8 text-badge-green-text" />
        <p className="text-sm font-medium text-primaryBlack">
          You&apos;re officially part of the TIAAGO Talent Network.
        </p>
        <p className="text-xs text-secondary-black max-w-sm text-center">
          Job opportunity emails will come from TIAAGO -- add us to your contacts and check your spam or junk
          folder occasionally so you never miss an update.
        </p>
      </div>
    );
  }

  const handleConfirm = async () => {
    setLoading(true);
    const res = await confirmTalentNetworkMembership(token);
    setLoading(false);
    if (!res.success) {
      setAlert({ title: "Error", message: res.error, icon: "error" });
      return;
    }
    setConfirmed(true);
  };

  return (
    <button
      type="button"
      onClick={handleConfirm}
      disabled={loading}
      className="btn btn-primary text-white w-full"
    >
      {loading ? "Confirming..." : "Confirm My Spot"}
    </button>
  );
};

export default ConfirmMembershipButton;
