import { create } from "zustand";
import { showUpgradePlanModal } from "../utils";

export type Alert = {
  title: string;
  message?: string;
  icon: "success" | "error" | "info" | "warning" | "retry";
  buttonText?: string;
  buttonAction?: () => void | Promise<void>;
  buttonLink?: string;
  buttonClassName?: string;
  titleClassName?: string;
  messageClassName?: string;
  secondaryButton?: {
    text: string;
    action?: () => void | Promise<void>;
    className?: string;
  };
};

type AlertStore = {
  upgradePlanReason: string;
  setUpgradePlanReason: (reason: string) => void;
  alert?: Alert;
  setAlert: (alert?: Alert) => void;
};

export const useAlert = create<AlertStore>(set => ({
  alert: undefined,
  upgradePlanReason: "",
  setUpgradePlanReason: reason =>
    set({
      upgradePlanReason: reason,
      alert: {
        title: "This feature requires a plan upgrade",
        message: reason,
        icon: "info",
        buttonText: "Proceed",
        buttonAction: () => {
          set({ upgradePlanReason: "", alert: undefined });
          showUpgradePlanModal();
        },
      },
    }),
  setAlert: alert => set({ alert }),
}));
