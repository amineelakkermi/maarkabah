"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/contexts/AdminContext";
import { EmployeeSidebar } from "@/components/employee/Sidebar";
import { EmployeeTopbar } from "@/components/employee/Topbar";
import { RoutePermissionGuard } from "@/components/shared/RoutePermissionGuard";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isInitialized } = useAuth();
  const { sidebarOpen, setSidebarOpen } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized && !isLoggedIn) {
      router.replace("/");
    }
  }, [isInitialized, isLoggedIn, router]);

  if (!isInitialized || !isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mk-ink-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-mk-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="mk-label text-mk-ink-500">جاري التحقق من الصلاحيات...</span>
        </div>
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

      <EmployeeSidebar />

      <div className="min-w-0 p-4 pt-0 lg:p-0">
        <EmployeeTopbar />
        <main>
          <RoutePermissionGuard>{children}</RoutePermissionGuard>
        </main>
      </div>
    </div>
  );
}
