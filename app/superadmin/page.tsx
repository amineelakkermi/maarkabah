"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Car, Globe, ShieldCheck } from "lucide-react";
import { useAdmin } from "@/contexts/AdminContext";
import { adminInsuranceCompanyService, adminTenantService } from "@/lib/api-services";
import { Card, CardBody, CardHeader, CardIcon, CardTitle, CardMeta, KpiCard } from "@/components/ui";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

function readTotalCount(res: unknown): number | null {
  const r = res as { totalCount?: number; count?: number; data?: { totalCount?: number } | unknown[] } | unknown[] | number | undefined;
  if (typeof r === "number") return r;
  if (Array.isArray(r)) return r.length;
  const total = r?.totalCount ?? r?.count ?? (Array.isArray(r?.data) ? undefined : r?.data?.totalCount);
  return typeof total === "number" ? total : null;
}

export default function SuperAdminDashboardPage() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";

  // undefined = still loading, null = unavailable (endpoint missing/failed)
  const [tenantsCount, setTenantsCount] = useState<number | null>();
  const [insuranceCompaniesCount, setInsuranceCompaniesCount] = useState<number | null>();

  useEffect(() => {
    adminTenantService
      .getTenantCount()
      .then((res) => setTenantsCount(readTotalCount(res)))
      .catch(() => setTenantsCount(null));

    adminInsuranceCompanyService
      .search({ pageNumber: 1, pageSize: 1 })
      .then((res) => setInsuranceCompaniesCount(readTotalCount(res)))
      .catch(() => setInsuranceCompaniesCount(null));
  }, []);

  const statValue = (v: number | null | undefined) => (v === undefined ? "…" : v === null ? "—" : String(v));

  const cards = [
    {
      href: "/superadmin/tenants",
      icon: Building2,
      title: ["Manage tenants", "إدارة الشركات"],
      meta: ["Create a tenant or manage users and roles of an existing tenant.", "إنشاء شركة جديدة أو إدارة المستخدمين والأدوار."],
    },
    {
      href: "/superadmin/customer-warehouse",
      icon: Globe,
      title: ["Customer Warehouse", "مستودع العملاء"],
      meta: ["Global shared-identity warehouse and bulk import.", "مستودع الهويات المشترك والاستيراد بالجملة."],
    },
    {
      href: "/superadmin/vehicle-makes",
      icon: Car,
      title: ["Vehicle Makes", "ماركات المركبات"],
      meta: ["Platform catalog synced to every office.", "القائمة العامة المزامنة مع كل المكاتب."],
    },
    {
      href: "/superadmin/insurance-companies",
      icon: ShieldCheck,
      title: ["Insurance Companies", "شركات التأمين"],
      meta: ["Platform catalog synced to every office.", "القائمة العامة المزامنة مع كل المكاتب."],
    },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="mk-h4 text-mk-ink-900">{T("Welcome, SuperAdmin", "مرحباً، المشرف العام", ar)}</div>
          <div className="mk-label text-mk-ink-500 mt-1">
            {T("Manage the platform and support tenant operations.", "إدارة المنصة ودعم عمليات الشركات.", ar)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <KpiCard
          icon={Building2}
          kind="default"
          label={T("Tenants", "الشركات", ar)}
          value={statValue(tenantsCount)}
        />
        <KpiCard
          icon={ShieldCheck}
          kind="mint"
          label={T("Insurance companies", "شركات التأمين", ar)}
          value={statValue(insuranceCompaniesCount)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="no-underline">
            <Card hover className="h-full">
              <CardHeader className="items-start gap-3">
                <CardIcon gradient="blue-violet">
                  <card.icon className="w-5 h-5 text-white mx-auto mt-2" />
                </CardIcon>
                <CardTitle>{T(card.title[0], card.title[1], ar)}</CardTitle>
              </CardHeader>
              <CardBody>
                <CardMeta>{T(card.meta[0], card.meta[1], ar)}</CardMeta>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
