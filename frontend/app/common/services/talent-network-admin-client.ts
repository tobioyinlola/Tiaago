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

// ── Platform-wide Gmail SMTP config (Admin > Settings > Email Integration) ──
// Same shape/flow as sourcing.ts's per-company SmtpConfig, just scoped to
// the whole platform instead of one recruiter's company -- see
// talent_network.mailer for how this is used to send confirmation and
// job-match emails.

export type TalentNetworkSmtpConfig = {
  id: number;
  gmail_address: string;
  is_verified: boolean;
  verified_at: string | null;
  last_used_at: string | null;
  created_at: string;
};

export const getTalentNetworkSmtpConfig = async () => {
  try {
    const responseData = await clientKyInstance.get("talent-network/admin/smtp-config/").json<any>();
    return { success: true as const, data: responseData.data as TalentNetworkSmtpConfig | null };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const saveTalentNetworkSmtpConfig = async (data: { gmail_address: string; app_password: string }) => {
  try {
    const responseData = await clientKyInstance
      .post("talent-network/admin/smtp-config/", { json: data })
      .json<any>();
    return { success: true as const, data: responseData.data as TalentNetworkSmtpConfig };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const verifyTalentNetworkSmtpConfig = async () => {
  try {
    const responseData = await clientKyInstance.post("talent-network/admin/smtp-config/verify/").json<any>();
    return { success: true as const, message: responseData.message as string };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};

export const deleteTalentNetworkSmtpConfig = async () => {
  try {
    await clientKyInstance.delete("talent-network/admin/smtp-config/").json();
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: await handleServerApiCallError(error) };
  }
};
