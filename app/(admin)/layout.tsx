"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Sidebar } from "@/components/admin/Sidebar";
import { Topbar } from "@/components/admin/Topbar";
import { useAdmin } from "@/contexts/AdminContext";
import { useAuth } from "@/contexts/AuthContext";
import { RoutePermissionGuard } from "@/components/shared/RoutePermissionGuard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, setSidebarOpen } = useAdmin();
  const { isLoggedIn, isInitialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized && !isLoggedIn) {
      router.replace("/");
    }
  }, [isInitialized, isLoggedIn, router]);

  if (!isInitialized || !isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mk-ink-50">
        <Loader2 className="animate-spin text-mk-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-mk-ink-50 lg:grid lg:items-start lg:p-5 lg:gap-5 lg:grid-cols-[auto_1fr]"
    >
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar />

      <div className="min-w-0 p-4 pt-0 lg:p-0">
        <Topbar />
        <main>
          <RoutePermissionGuard>{children}</RoutePermissionGuard>
        </main>
      </div>
    </div>
  );
}
