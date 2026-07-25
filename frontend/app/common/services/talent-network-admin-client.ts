"use client";

import clientKyInstance from "../utils/client-ky.instance";
import { handleServerApiCallError } from "../utils";
import { TalentNetworkMember, TalentNetworkMemberStatus } from "./talent-network-admin";

export const setTalentNetworkMemberStatus = async (id: number, newStatus: TalentNetworkMemberStatus) => {
  try {
    const data = await clientKyInstance
      .patch(`talent-network/admin/members/${id}/`, { json: { status: newStatus } })
      .json<TalentNetworkMember>();
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const deleteTalentNetworkMember = async (id: number) => {
  try {
    await clientKyInstance.delete(`talent-network/admin/members/${id}/`);
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

/** Downloads the full member list as a CSV file -- same blob-download
 * pattern as exportWalletTransactionsCsv in subscription-client.ts. */
export const exportTalentNetworkMembersCsv = async (): Promise<boolean> => {
  try {
    const blob = await clientKyInstance.get("talent-network/admin/members/export/").blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "talent_network_members.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
};
