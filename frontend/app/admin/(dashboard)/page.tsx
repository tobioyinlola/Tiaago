import { Metadata } from "next";

import { useAdminStore } from "./store";
import { getCurrentUser } from "@/app/common/services/profile";
import { getAdminMetrics } from "@/app/common/services/metrics";
import { cn, getMetricPercentageChange } from "../../common/utils";
import MetricItem from "@/app/common/components/dashboard/MetricItem";
import ChartContainer from "@/app/common/components/dashboard/charts/ChartContainer";

export const metadata: Metadata = {
  title: "Admin Dashboard",
};

const AdminDashboard = async () => {
  let currentUser = useAdminStore.getState().profile;
  if (!currentUser) {
    currentUser = (await getCurrentUser("staff")).currentUser;
    useAdminStore.setState({ profile: currentUser });
  }
  const dashboardMetrics = await getAdminMetrics();
  return (
    <>
      <h1 className='text-2xl font-space-grotesk border-b border-gray-200 pb-1'>
        Welcome,{" "}
        <span className='font-bold'>
          {currentUser.first_name || currentUser.last_name || currentUser.email}
          !👋🏻
        </span>
      </h1>
      <ChartContainer>
        {Object.entries(dashboardMetrics).map(([title, metrics], i) => (
          <div className='mt-8' key={title}>
            <h3 className='text-gray-900 text-lg font-medium'>{title}</h3>
            <div
              className={cn(
                "my-8 gap-6 grid grid-cols-1",
                metrics.length > 1 && "sm:grid-cols-2",
                metrics.length > 2 && "lg:grid-cols-3"
              )}
            >
              {metrics.map(metric => (
                <MetricItem
                  key={metric.title}
                  title={metric.title}
                  currentVal={metric.current_value}
                  data={[metric.value_last_month, metric.value_this_month]}
                  percentChange={getMetricPercentageChange(
                    metric.value_this_month,
                    metric.value_last_month
                  )}
                  valueLastMonth={metric.value_last_month}
                />
              ))}
            </div>
          </div>
        ))}
      </ChartContainer>
    </>
  );
};

export default AdminDashboard;
