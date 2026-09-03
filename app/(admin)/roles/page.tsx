"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Roles now live under Settings → Roles & Permissions. Kept as a redirect so
// old links/bookmarks keep working. The panel itself is
// components/admin/RolesPermissionsPanel.tsx.
export default function RolesPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/settings?tab=roles"); }, [router]);
  return null;
}
