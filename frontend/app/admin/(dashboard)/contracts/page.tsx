import { Metadata } from "next";

import { cn } from "@/app/common/utils";
import ContractsTable from "../components/ContractsTable";
import { getContractMetrics } from "../constants/dashboard";
import { getContracts } from "@/app/common/services/contract";
import MetricItem from "@/app/common/components/dashboard/MetricItem";
import ChartContainer from "@/app/common/components/dashboard/charts/ChartContainer";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";

export const metadata: Metadata = {
  title: "Contracts",
};

const ContractsPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const contractsRes = await getContracts().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get contracts error (admin contracts page): ", error);
    errors.push({
      message: error,
      title: "Error getting contracts",
    });
    return [];
  });
  const contracts = Array.isArray(contractsRes)
    ? contractsRes
    : (contractsRes as any)?.results || [];
  const contractMetrics = getContractMetrics(contracts);
  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>
          Contracts
        </h1>
        <h4 className='text-gray-900 text-sm md:text-base'>
          Kindly go through your contracts
        </h4>
      </div>
      <div className='mt-8'>
        {/* <h3 className='text-gray-900 text-lg font-medium'>Contracts</h3> */}
        <div
          className={cn(
            "mb-8 gap-6 grid grid-cols-1",
            contractMetrics.length > 1 && "sm:grid-cols-2",
            contractMetrics.length > 2 && "lg:grid-cols-3"
          )}
        >
          <ChartContainer>
            {contractMetrics.map(metric => (
              <MetricItem key={metric.title} {...metric} />
            ))}
          </ChartContainer>
        </div>
      </div>
      <ContractsTable data={contracts} />
    </>
  );
};

export default ContractsPage;
