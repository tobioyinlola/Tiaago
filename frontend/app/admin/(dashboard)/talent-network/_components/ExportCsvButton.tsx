"use client";

import { useState } from "react";
import { LuDownload } from "react-icons/lu";

import { useAlert } from "@/app/common/store/useAlert";
import { exportTalentNetworkMembersCsv } from "@/app/common/services/talent-network-admin-client";

const ExportCsvButton = () => {
  const setAlert = useAlert(s => s.setAlert);
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    const ok = await exportTalentNetworkMembersCsv();
    setLoading(false);
    if (!ok) {
      setAlert({ title: "Error", message: "Could not export the member list.", icon: "error" });
    }
  };

  return (
    <button type="button" onClick={handleExport} disabled={loading} className="btn btn-sm btn-outline gap-1.5">
      <LuDownload className="w-4 h-4" />
      {loading ? "Exporting..." : "Export CSV"}
    </button>
  );
};

export default ExportCsvButton;
