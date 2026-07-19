import clientKyInstance from "../utils/client-ky.instance";
import { PagedResource, WalletTransaction } from "../types";

/** Client-side (filter/page-aware) wallet transaction fetch -- the
 * server-rendered billing page only loads page 1/unfiltered on first
 * paint; changing the filter or page happens client-side from here. */
export const getWalletTransactionsClient = async (
  type?: "credit" | "debit" | "free_credit",
  page = 1
): Promise<PagedResource<WalletTransaction> | null> => {
  try {
    const searchParams: Record<string, string | number> = { page };
    if (type) searchParams.type = type;
    return await clientKyInstance
      .get("subscriptions/wallet-transactions/", { searchParams })
      .json<PagedResource<WalletTransaction>>();
  } catch {
    return null;
  }
};

/** Downloads the full (unpaginated) transaction history as a CSV file. */
export const exportWalletTransactionsCsv = async (): Promise<boolean> => {
  try {
    const blob = await clientKyInstance.get("subscriptions/wallet-transactions/export/").blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "wallet_transactions.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
};
