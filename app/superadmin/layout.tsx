"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/contexts/AdminContext";
import { SuperAdminSidebar } from "@/components/superadmin/Sidebar";
import { SuperAdminTopbar } from "@/components/superadmin/Topbar";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, setSidebarOpen } = useAdmin();
  const { isLoggedIn, isInitialized, decodedToken } = useAuth();
  const router = useRouter();

  const isSuperAdmin = !!(decodedToken && !(decodedToken.tenant_id ?? decodedToken.tenantId));

  useEffect(() => {
    if (!isInitialized) return;
    if (!isLoggedIn) {
      router.replace("/");
    } else if (!isSuperAdmin) {
      router.replace("/dashboard");
    }
  }, [isInitialized, isLoggedIn, isSuperAdmin, router]);

  if (!isInitialized || !isLoggedIn || !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mk-ink-50">
        <Loader2 className="animate-spin text-mk-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mk-ink-50 lg:grid lg:items-start lg:p-5 lg:gap-5 lg:grid-cols-[auto_1fr]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <SuperAdminSidebar />

      <div className="min-w-0 p-4 pt-0 lg:p-0">
        <SuperAdminTopbar />
        <main>{children}</main>
      </div>
    </div>
  );
}
