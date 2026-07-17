"use client";

import { ReactNode } from "react";

import { usePermission } from "../hooks/usePermission";

const PermissionGuard = ({
  permission,
  fallback = null,
  children,
}: {
  permission: string;
  fallback?: ReactNode;
  children: ReactNode;
}) => {
  const allowed = usePermission(permission);
  return <>{allowed ? children : fallback}</>;
};

export default PermissionGuard;
