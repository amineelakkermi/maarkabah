"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Branches now live under Settings → Branches. Kept as a redirect so old
// links/bookmarks keep working. The panel itself is
// components/admin/BranchesPanel.tsx.
export default function BranchesPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/settings?tab=branches"); }, [router]);
  return null;
}
