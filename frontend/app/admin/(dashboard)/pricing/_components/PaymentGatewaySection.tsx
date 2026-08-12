"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import Modal from "@/app/common/components/Modal";
import { PlatformSettingRow, updatePlatformSettingValue } from "@/app/common/services/platform-settings";

type GatewayKey = "bachs" | "paystack" | "stripe";

const GATEWAYS: { key: GatewayKey; label: string; description: string; note: string }[] = [
  {
    key: "bachs",
    label: "Bachs",
    description: "Handles NGN and USD. Recommended — single gateway for every organisation.",
    note: "The default wallet top-up gateway.",
  },
  {
    key: "paystack",
    label: "Paystack",
    description: "NGN only. Nigerian organisations.",
    note: "Existing Paystack integration — preserved and ready to activate.",
  },
  {
    key: "stripe",
    label: "Stripe",
    description: "USD only. International organisations.",
    note: "Existing Stripe integration — preserved and ready to activate.",
  },
];

const PaymentGatewaySection = ({ row, canManage }: { row?: PlatformSettingRow; canManage: boolean }) => {
  const router = useRouter();
  const modalRef = useRef<HTMLDialogElement>(null);
  const [pendingGateway, setPendingGateway] = useState<GatewayKey | null>(null);
  const [saving, setSaving] = useState(false);

  const activeGateway = (row?.value as GatewayKey) || "bachs";

  const openConfirm = (key: GatewayKey) => {
    if (key === activeGateway) return;
    setPendingGateway(key);
    modalRef.current?.showModal();
  };

  const handleConfirm = async () => {
    if (!pendingGateway) return;
    setSaving(true);
    const result = await updatePlatformSettingValue("active_payment_gateway", pendingGateway);
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    const gatewayLabel = GATEWAYS.find(g => g.key === pendingGateway)?.label ?? pendingGateway;
    toast.success(`Payment gateway updated to ${gatewayLabel}`);
    modalRef.current?.close();
    setPendingGateway(null);
    router.refresh();
  };

  const pendingLabel = GATEWAYS.find(g => g.key === pendingGateway)?.label ?? "";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Payment Gateway</h2>
      <p className="text-sm text-gray-500 mb-4">The active gateway processes all new wallet top-up transactions.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {GATEWAYS.map(gateway => {
          const isActive = gateway.key === activeGateway;
          return (
            <div
              key={gateway.key}
              className={`relative rounded-lg border p-4 flex flex-col gap-2 ${
                isActive ? "border-green-500 bg-green-50" : "border-gray-200"
              }`}
            >
              {isActive && (
                <span className="absolute top-3 right-3 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                  Active
                </span>
              )}
              <span className="font-medium text-gray-900">{gateway.label}</span>
              <p className="text-xs text-gray-500">{gateway.description}</p>
              <p className="text-xs text-gray-400 italic">{gateway.note}</p>
              {canManage && !isActive && (
                <button
                  type="button"
                  onClick={() => openConfirm(gateway.key)}
                  className="mt-2 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-dark transition-colors self-start"
                >
                  Select
                </button>
              )}
            </div>
          );
        })}
      </div>

      {row && (
        <p className="text-xs text-gray-400 mt-4">
          Last updated {new Date(row.updated_at).toLocaleString()}
          {row.updated_by ? ` by ${row.updated_by}` : ""}
        </p>
      )}

      <Modal id="payment-gateway-confirm-modal" modalRef={modalRef} autoHeight>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Switch active payment gateway to {pendingLabel}?</h3>
        <p className="text-sm text-gray-600 mb-2">New top-up transactions will use {pendingLabel} immediately.</p>
        <p className="text-sm text-gray-600 mb-6">
          Transactions currently in progress on {GATEWAYS.find(g => g.key === activeGateway)?.label} will complete normally.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className="px-4 py-2 bg-[#1A3C5E] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? "Saving..." : "Confirm"}
          </button>
          <button
            type="button"
            onClick={() => modalRef.current?.close()}
            disabled={saving}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default PaymentGatewaySection;
