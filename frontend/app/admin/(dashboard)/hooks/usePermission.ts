import { useAdminStore } from "../store";

export function usePermission(permission: string): boolean {
  const profile = useAdminStore(s => s.profile);
  if (!profile) return false;
  if (profile.is_super_admin) return true;
  return profile.permissions.includes(permission);
}

export function useAnyPermission(permissions: string[]): boolean {
  const profile = useAdminStore(s => s.profile);
  if (!profile) return false;
  if (profile.is_super_admin) return true;
  return permissions.some(p => profile.permissions.includes(p));
}

export function useIsSuperAdmin(): boolean {
  const profile = useAdminStore(s => s.profile);
  return !!profile?.is_super_admin;
}
