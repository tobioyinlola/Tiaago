"use client";

import { useState } from "react";

import { confirmUnsubscribe } from "@/app/common/services/unsubscribe";

const UnsubscribeConfirm = ({ token, email, campaignName }: { token: string; email: string; campaignName: string }) => {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    const result = await confirmUnsubscribe(token, reason.trim() || undefined);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="text-center">
        <h1 className="text-xl font-bold mb-2">You&apos;re unsubscribed</h1>
        <p className="text-sm text-muted-foreground">
          {email} will no longer receive marketing emails from Tiaago.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-2 text-center">Unsubscribe from Tiaago emails</h1>
      <p className="text-sm text-muted-foreground text-center mb-6">
        Confirm you want to unsubscribe <strong>{email}</strong> from marketing emails like &quot;{campaignName}&quot;.
      </p>
      <textarea
        className="textarea textarea-bordered w-full mb-4"
        placeholder="Let us know why (optional)"
        rows={3}
        value={reason}
        onChange={e => setReason(e.target.value)}
      />
      {error && <p className="text-sm text-destructive mb-3">{error}</p>}
      <button type="button" className="btn btn-primary w-full" disabled={submitting} onClick={handleConfirm}>
        {submitting ? "Unsubscribing..." : "Confirm unsubscribe"}
      </button>
    </div>
  );
};

export default UnsubscribeConfirm;
