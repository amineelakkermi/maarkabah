"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Staff now lives under Settings → Staff. Kept as a redirect so old
// links/bookmarks keep working. The panel itself is
// components/admin/StaffRolesPanel.tsx.
export default function StaffPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/settings?tab=staff"); }, [router]);
  return null;
}
