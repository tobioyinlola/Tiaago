// LoginUpgradeModal.tsx
"use client";

import { useState } from "react";
import UpgradeModal from "@/app/common/components/UpgradeModal";

export default function LoginUpgradeModal() {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  return (
    <UpgradeModal
      isOpen={showUpgradeModal}
      onClose={() => setShowUpgradeModal(false)}
    />
  );
}