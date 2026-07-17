"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import clientKyInstance from "@/app/common/utils/client-ky.instance";

const MarkAllNotificationsReadButton = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await clientKyInstance.post("notifications/mark-all-read/");
      window.dispatchEvent(new Event("notifications:updated"));
      router.refresh();
    } catch {
      toast.error("Couldn't mark all as read. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="text-sm text-primary hover:underline disabled:opacity-60"
    >
      Mark all as read
    </button>
  );
};

export default MarkAllNotificationsReadButton;
