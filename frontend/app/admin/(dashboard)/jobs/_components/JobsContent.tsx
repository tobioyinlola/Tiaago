"use client";

import { Job } from "@/app/common/types";
import ClientTabs from "@/app/common/components/ClientTabs";
import JobsTable from "../../components/JobsTable";

const tabs = [
  { name: "pending" as const, label: "Pending Review" },
  { name: "approved" as const, label: "Approved Jobs" },
];

type JobsContentProps = {
  pendingJobs: Job[];
  approvedJobs: Job[];
};

const JobsContent = ({ pendingJobs, approvedJobs }: JobsContentProps) => {
  return (
    <ClientTabs tabs={tabs} defaultTab='pending'>
      {activeTab => (
        <JobsTable
          dataType={activeTab as "pending" | "approved"}
          jobs={activeTab === "pending" ? pendingJobs : approvedJobs}
        />
      )}
    </ClientTabs>
  );
};

export default JobsContent;
