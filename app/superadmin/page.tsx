"use client";

import Link from "next/link";
import { Building2, Globe, Shield, Users } from "lucide-react";
import { useAdmin } from "@/contexts/AdminContext";
import { Card, CardBody, CardHeader, CardIcon, CardTitle, CardMeta, Button } from "@/components/ui";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

export default function SuperAdminDashboardPage() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";

  const cards = [
    {
      href: "/superadmin/tenants",
      icon: Building2,
      title: ["Manage tenants", "إدارة المستأجرين"],
      meta: ["Create a tenant or manage users and roles of an existing tenant.", "إنشاء مستأجر جديد أو إدارة المستخدمين والأدوار."],
    },
    {
      href: "/superadmin/customer-warehouse",
      icon: Globe,
      title: ["Customer Warehouse", "مستودع العملاء"],
      meta: ["Global shared-identity warehouse and bulk import.", "مستودع الهويات المشترك والاستيراد بالجملة."],
    },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="mk-h4 text-mk-ink-900">{T("Welcome, SuperAdmin", "مرحباً، المشرف العام", ar)}</div>
          <div className="mk-label text-mk-ink-500 mt-1">
            {T("Manage the platform and support tenant operations.", "إدارة المنصة ودعم عمليات المستأجرين.", ar)}
          </div>
        </div>
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
