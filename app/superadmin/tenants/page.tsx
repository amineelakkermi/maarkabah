"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Users, Shield, Puzzle } from "lucide-react";
import { useAdmin } from "@/contexts/AdminContext";
import { adminTenantService } from "@/lib/api-services";
import { Button, Input, Select, Checkbox, Card, CardBody, CardHeader, CardIcon, CardTitle, CardMeta, useToast } from "@/components/ui";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

export default function SuperAdminTenantsPage() {
  const { dir } = useAdmin();
  const { showToast } = useToast();
  const router = useRouter();
  const ar = dir === "rtl";

  const [form, setForm] = useState({
    name: "",
    subdomain: "",
    commercialRegistrationNumber: "",
    taxNumber: "",
    mobile: "",
    email: "",
    adminFullName: "",
    adminUserName: "",
    adminPassword: "",
    adminIdentityType: "",
    adminNationalId: "",
    adminIdentityExpiryDate: "",
    adminBirthDate: "",
  });
  const [enableTajeer, setEnableTajeer] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdTenantId, setCreatedTenantId] = useState<number | null>(null);
  const [manageId, setManageId] = useState("");

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();

    // Backend rule: admin identity fields are required as a group whenever
    // ElmTajeer is licensed or any single identity field is provided.
    const identityFilled =
      !!form.adminIdentityType || !!form.adminNationalId || !!form.adminIdentityExpiryDate || !!form.adminBirthDate;
    if ((enableTajeer || identityFilled) && !(form.adminIdentityType && form.adminNationalId && form.adminIdentityExpiryDate && form.adminBirthDate)) {
      showToast(
        T(
          "Admin identity fields (type, number, expiry, birth date) are all required when ElmTajeer is enabled.",
          "حقول هوية المشرف (النوع، الرقم، الانتهاء، تاريخ الميلاد) كلها إلزامية عند تفعيل تاجير.",
          ar
        ),
        "error"
      );
      return;
    }

    setCreating(true);
    try {
      const result = await adminTenantService.createTenant({
        ...form,
        adminIdentityType: form.adminIdentityType ? Number(form.adminIdentityType) : undefined,
        adminNationalId: form.adminNationalId.trim() || undefined,
        adminIdentityExpiryDate: form.adminIdentityExpiryDate || undefined,
        adminBirthDate: form.adminBirthDate || undefined,
        enabledFeatures: enableTajeer ? ["ElmTajeer"] : undefined,
      });
      const tenantId = result?.tenantId ?? result?.data?.tenantId;
      if (tenantId) {
        setCreatedTenantId(tenantId);
        showToast(T(`Tenant created with ID ${tenantId}`, `تم إنشاء المستأجر رقم ${tenantId}`, ar));
        setForm({
          name: "",
          subdomain: "",
          commercialRegistrationNumber: "",
          taxNumber: "",
          mobile: "",
          email: "",
          adminFullName: "",
          adminUserName: "",
          adminPassword: "",
          adminIdentityType: "",
          adminNationalId: "",
          adminIdentityExpiryDate: "",
          adminBirthDate: "",
        });
        setEnableTajeer(false);
      } else {
        showToast(T("Tenant created.", "تم إنشاء المستأجر.", ar));
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : T("Failed to create tenant.", "فشل إنشاء المستأجر.", ar));
    } finally {
      setCreating(false);
    }
  }

  function goToUsers() {
    const id = manageId.trim() || (createdTenantId ? String(createdTenantId) : "");
    if (!id) return;
    router.push(`/superadmin/tenants/${id}/users`);
  }

  function goToRoles() {
    const id = manageId.trim() || (createdTenantId ? String(createdTenantId) : "");
    if (!id) return;
    router.push(`/superadmin/tenants/${id}/roles`);
  }

  function goToFeatures() {
    const id = manageId.trim() || (createdTenantId ? String(createdTenantId) : "");
    if (!id) return;
    router.push(`/superadmin/tenants/${id}/features`);
  }

  const field = (key: keyof typeof form, label: [string, string], type = "text") => (
    <Input
      type={type}
      variant="muted"
      label={T(label[0], label[1], ar)}
      value={form[key]}
      onChange={(e) => update(key, e.target.value)}
      className="font-mono text-start"
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="mk-h4 text-mk-ink-900">{T("Tenants", "المستأجرين", ar)}</div>
          <div className="mk-label text-mk-ink-500 mt-1">
            {T("Create and manage tenants on the platform.", "إنشاء وإدارة المستأجرين على المنصة.", ar)}
          </div>
        </div>
      </div>

      <Card hover={false}>
        <CardHeader className="items-start gap-3">
          <CardIcon gradient="blue-violet">
            <Building2 className="w-5 h-5 text-white mx-auto mt-2" />
          </CardIcon>
          <CardTitle>{T("Create tenant", "إنشاء مستأجر", ar)}</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            {field("name", ["Office name", "اسم المكتب"])}
            {field("subdomain", ["Subdomain", "المجال الفرعي"])}
            {field("commercialRegistrationNumber", ["Commercial registration", "السجل التجاري"])}
            {field("taxNumber", ["Tax number", "الرقم الضريبي"])}
            {field("mobile", ["Mobile", "الجوال"])}
            {field("email", ["Email", "البريد الإلكتروني"], "email")}
            {field("adminFullName", ["Admin full name", "اسم المشرف الكامل"])}
            {field("adminUserName", ["Admin username", "اسم مستخدم المشرف"])}
            {field("adminPassword", ["Admin password", "كلمة مرور المشرف"], "password")}

            <div className="md:col-span-2 border-t border-mk-ink-100 pt-4">
              <div className="mk-label text-mk-ink-700 mb-3">
                {T("Admin identity", "هوية المشرف", ar)}
                <span className="mk-caption text-mk-ink-400 ms-2">
                  {T("required when ElmTajeer is enabled", "إلزامية عند تفعيل تاجير", ar)}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  variant="muted"
                  label={T("Identity type", "نوع الهوية", ar)}
                  value={form.adminIdentityType}
                  onChange={(e) => update("adminIdentityType", e.target.value)}
                >
                  <option value="">{T("Select type", "اختر النوع", ar)}</option>
                  <option value="1">{T("Saudi ID", "هوية وطنية", ar)}</option>
                  <option value="2">{T("Iqama", "إقامة", ar)}</option>
                  <option value="3">{T("Passport", "جواز سفر", ar)}</option>
                  <option value="4">{T("GCC ID", "هوية خليجية", ar)}</option>
                </Select>
                {field("adminNationalId", ["Identity number", "رقم الهوية"])}
                {field("adminIdentityExpiryDate", ["Identity expiry", "انتهاء الهوية"], "date")}
                {field("adminBirthDate", ["Birth date", "تاريخ الميلاد"], "date")}
              </div>
            </div>

            <div className="md:col-span-2">
              <Checkbox
                label={T("Enable ElmTajeer", "تفعيل تاجير (علم)", ar)}
                description={T(
                  "License the Tajeer integration module for this tenant. Requires the admin identity fields above.",
                  "ترخيص وحدة تكامل تاجير لهذا المستأجر. يتطلب حقول هوية المشرف أعلاه.",
                  ar
                )}
                checked={enableTajeer}
                onChange={setEnableTajeer}
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" variant="primary" disabled={creating} className="w-full md:w-auto">
                {creating ? T("Creating...", "جاري الإنشاء...", ar) : T("Create tenant", "إنشاء مستأجر", ar)}
              </Button>
            </div>
          </form>
          {createdTenantId && (
            <div className="mt-4 p-3 rounded-lg bg-mk-mint-50 text-mk-mint-700 mk-body-sm">
              {T(`Last created tenant ID: ${createdTenantId}`, `رقم آخر مستأجر تم إنشاؤه: ${createdTenantId}`, ar)}
            </div>
          )}
        </CardBody>
      </Card>

      <Card hover={false}>
        <CardHeader className="items-start gap-3">
          <CardIcon gradient="mint-blue">
            <Users className="w-5 h-5 text-white mx-auto mt-2" />
          </CardIcon>
          <CardTitle>{T("Manage tenant", "إدارة مستأجر", ar)}</CardTitle>
        </CardHeader>
        <CardBody>
          <CardMeta className="mb-3">
            {T("Enter a tenant ID to manage its users or roles.", "أدخل رقم المستأجر لإدارة مستخدميه أو أدواره.", ar)}
          </CardMeta>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              type="number"
              variant="muted"
              label={T("Tenant ID", "رقم المستأجر", ar)}
              value={manageId}
              onChange={(e) => setManageId(e.target.value)}
              className="font-mono text-start sm:w-64"
            />
            <div className="flex items-end gap-2">
              <Button variant="secondary" onClick={goToUsers}>
                <Users size={16} />
                {T("Users", "المستخدمين", ar)}
              </Button>
              <Button variant="secondary" onClick={goToRoles}>
                <Shield size={16} />
                {T("Roles", "الأدوار", ar)}
              </Button>
              <Button variant="secondary" onClick={goToFeatures}>
                <Puzzle size={16} />
                {T("Features", "الميزات", ar)}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
