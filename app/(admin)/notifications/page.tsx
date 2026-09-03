"use client";

import { useState, type ReactNode } from "react";
import { Bell, Search, MessageSquare, MessageCircle, Mail, Plus, Pencil, type LucideIcon } from "lucide-react";
import { useAdmin } from "@/contexts/AdminContext";
import { Input, Button, Badge, Table, Tr, Th, Td, Select, Tabs, Toggle, IconButton, Drawer, DrawerHeader, DrawerFooter } from "@/components/ui";
import {
  NOTIFICATION_RULES, NOTIFICATION_LOG, NOTIFICATION_CATEGORY_LABELS,
  type NotificationRule, type NotificationChannel, type NotificationCategory,
} from "@/lib/data";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

const CATEGORY_ORDER: NotificationCategory[] = ["fleet", "contracts", "pickup_return", "disputes", "system"];

// Each channel gets its own tonal color (not one uniform blue) so the row
// reads at a glance — same bg-100/text-600-ish tonal pairing used across
// the design system (KpiCard, Badge, TonalIcon on the Pricing screen).
const CHANNEL_META: Record<NotificationChannel, { icon: LucideIcon; en: string; ar: string; shortEn: string; shortAr: string; activeClass: string }> = {
  in_app: { icon: Bell, en: "In-app", ar: "داخل النظام", shortEn: "App", shortAr: "التطبيق", activeClass: "bg-mk-blue-500/10 text-mk-blue-500" },
  sms: { icon: MessageSquare, en: "SMS", ar: "رسالة نصية", shortEn: "SMS", shortAr: "رسالة", activeClass: "bg-mk-violet-100 text-mk-violet-500" },
  whatsapp: { icon: MessageCircle, en: "WhatsApp", ar: "واتساب", shortEn: "WhatsApp", shortAr: "واتساب", activeClass: "bg-mk-mint-100 text-mk-mint-600" },
  email: { icon: Mail, en: "Email", ar: "بريد إلكتروني", shortEn: "Email", shortAr: "بريد", activeClass: "bg-mk-warning-100 text-mk-warning" },
};
const CHANNEL_ORDER: NotificationChannel[] = ["in_app", "sms", "whatsapp", "email"];

// System alerts are internal (staff/owner), not customer-facing — SMS and
// WhatsApp don't apply, only the app itself and an internal email digest.
const CATEGORY_CHANNELS: Partial<Record<NotificationCategory, NotificationChannel[]>> = {
  system: ["in_app", "email"],
};

// Plain always-expanded section shell (matches Pricing's SectionCard) —
// each category is a flat list of rows here, not a collapsible panel.
// Editing anything about a rule (channels, threshold, message) happens in
// one Drawer opened from the row's pencil icon, same as Pricing's
// edit-policy flow — the row itself stays a simple summary line.
function SectionCard({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-card overflow-hidden mk-surface">
      <div className="p-5 pb-0 mk-h4 text-mk-ink-900">{title}</div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

type RuleForm = {
  category: NotificationCategory;
  label: string;
  description: string;
  channels: NotificationChannel[];
  template: string;
  hasThreshold: boolean;
  thresholdKm: string;
  thresholdDays: string;
};

const emptyForm: RuleForm = {
  category: "fleet",
  label: "",
  description: "",
  channels: ["in_app"],
  template: "",
  hasThreshold: false,
  thresholdKm: "",
  thresholdDays: "",
};

function formFromRule(rule: NotificationRule, ar: boolean): RuleForm {
  return {
    category: rule.category,
    label: ar ? rule.labelAr : rule.labelEn,
    description: ar ? rule.descriptionAr : rule.descriptionEn,
    channels: rule.channels,
    template: ar ? rule.templateAr : rule.templateEn,
    hasThreshold: !!rule.threshold,
    thresholdKm: rule.threshold?.km !== undefined ? String(rule.threshold.km) : "",
    thresholdDays: rule.threshold?.days !== undefined ? String(rule.threshold.days) : "",
  };
}

export default function NotificationsPage() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const [tab, setTab] = useState<"rules" | "log">("rules");
  const [rules, setRules] = useState<NotificationRule[]>(NOTIFICATION_RULES);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);
  const [form, setForm] = useState<RuleForm>(emptyForm);

  const [logSearch, setLogSearch] = useState("");
  const [logStatus, setLogStatus] = useState("all");
  const [mobileLogSearchOpen, setMobileLogSearchOpen] = useState(false);

  function toggleRule(id: string, enabled: boolean) {
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, enabled } : r)));
  }

  // Quick toggle from the row itself — the full edit drawer is for
  // renaming/rewording an alert, not for a one-click channel flip.
  function toggleRuleChannel(id: string, channel: NotificationChannel) {
    setRules((rs) =>
      rs.map((r) => {
        if (r.id !== id) return r;
        const has = r.channels.includes(channel);
        return { ...r, channels: has ? r.channels.filter((c) => c !== channel) : [...r.channels, channel] };
      })
    );
  }

  function openAdd() {
    setEditingRule(null);
    setForm(emptyForm);
    setDrawerOpen(true);
  }

  function openEdit(rule: NotificationRule) {
    setEditingRule(rule);
    setForm(formFromRule(rule, ar));
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingRule(null);
    setForm(emptyForm);
  }

  function toggleFormChannel(channel: NotificationChannel) {
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(channel) ? f.channels.filter((c) => c !== channel) : [...f.channels, channel],
    }));
  }

  function saveForm() {
    if (!form.label.trim()) return;
    const threshold = form.hasThreshold
      ? {
          ...(form.thresholdKm ? { km: Number(form.thresholdKm) } : {}),
          ...(form.thresholdDays ? { days: Number(form.thresholdDays) } : {}),
        }
      : undefined;
    const hasThreshold = threshold && (threshold.km !== undefined || threshold.days !== undefined);

    if (editingRule) {
      setRules((rs) =>
        rs.map((r) =>
          r.id === editingRule.id
            ? {
                ...r,
                category: form.category,
                labelEn: form.label, labelAr: form.label,
                descriptionEn: form.description, descriptionAr: form.description,
                channels: form.channels,
                templateEn: form.template, templateAr: form.template,
                ...(hasThreshold ? { threshold } : { threshold: undefined }),
              }
            : r
        )
      );
    } else {
      setRules((rs) => [
        ...rs,
        {
          id: `custom_${Date.now()}`,
          category: form.category,
          labelEn: form.label, labelAr: form.label,
          descriptionEn: form.description, descriptionAr: form.description,
          enabled: true,
          channels: form.channels,
          templateEn: form.template, templateAr: form.template,
          ...(hasThreshold ? { threshold } : {}),
        },
      ]);
    }
    closeDrawer();
  }

  const filteredLog = NOTIFICATION_LOG.filter((l) => {
    const rule = rules.find((r) => r.id === l.ruleId);
    const q = logSearch.toLowerCase();
    const matchQ =
      !q ||
      l.recipient.toLowerCase().includes(q) ||
      (rule ? (ar ? rule.labelAr : rule.labelEn).toLowerCase().includes(q) : false);
    const matchStatus = logStatus === "all" || l.status === logStatus;
    return matchQ && matchStatus;
  });

  const availableChannelsForForm = CATEGORY_CHANNELS[form.category] ?? CHANNEL_ORDER;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <Tabs
          variant="default"
          rounded="full"
          className="mk-view-toggle--reversed"
          value={tab}
          onChange={(v) => setTab(v as typeof tab)}
          items={[
            { value: "rules", label: T("Alert Settings", "إعدادات التنبيهات", ar) },
            { value: "log", label: T("Log", "السجل", ar) },
          ]}
        />
        {tab === "rules" && (
          <Button variant="outline" size="sm" onClick={openAdd} className="self-start sm:self-auto">
            <Plus size={16} />
            {T("Add alert", "إضافة تنبيه", ar)}
          </Button>
        )}
      </div>

      {tab === "rules" && (
        <div className="flex flex-col gap-4">
          {CATEGORY_ORDER.map((cat) => {
            const catRules = rules.filter((r) => r.category === cat);
            if (catRules.length === 0) return null;
            return (
              <SectionCard key={cat} title={ar ? NOTIFICATION_CATEGORY_LABELS[cat].ar : NOTIFICATION_CATEGORY_LABELS[cat].en}>
                <div className="flex flex-col">
                  {catRules.map((rule) => (
                    <div key={rule.id} className="flex flex-col gap-2 py-3 border-b border-mk-ink-100 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="mk-body-sm text-mk-ink-900">{ar ? rule.labelAr : rule.labelEn}</div>
                          <div className="mk-caption text-mk-ink-500 mt-0.5">{ar ? rule.descriptionAr : rule.descriptionEn}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <IconButton size="sm" variant="ghost" className="bg-mk-blue-50 text-mk-blue-500 hover:bg-mk-blue-100" aria-label={T("Edit alert", "تعديل التنبيه", ar)} onClick={() => openEdit(rule)}>
                            <Pencil size={13} />
                          </IconButton>
                          <Toggle checked={rule.enabled} onChange={(v) => toggleRule(rule.id, v)} />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        {(CATEGORY_CHANNELS[rule.category] ?? CHANNEL_ORDER).map((ch) => {
                          const Icon = CHANNEL_META[ch].icon;
                          const active = rule.channels.includes(ch);
                          return (
                            <button
                              key={ch}
                              type="button"
                              onClick={() => toggleRuleChannel(rule.id, ch)}
                              disabled={!rule.enabled}
                              className={`flex items-center gap-1.5 px-2.5 h-8 rounded-md border-0 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${active ? CHANNEL_META[ch].activeClass : "bg-mk-ink-50 text-mk-ink-300 hover:bg-mk-ink-100"
                                }`}
                            >
                              <Icon size={14} />
                              <span className="mk-overline font-normal! leading-none whitespace-nowrap">{ar ? CHANNEL_META[ch].shortAr : CHANNEL_META[ch].shortEn}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            );
          })}
        </div>
      )}

      {tab === "log" && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="hidden sm:block flex-1 max-w-[400px]">
              <Input
                variant="search"
                icon={<Search size={14} />}
                placeholder={T("Search recipient or alert type…", "ابحث عن مستلم أو نوع تنبيه…", ar)}
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
              />
            </div>
            <IconButton
              size="md"
              className="sm:hidden"
              aria-label={T("Search", "بحث", ar)}
              onClick={() => setMobileLogSearchOpen((o) => !o)}
            >
              <Search size={16} />
            </IconButton>
            <div className="w-[180px]">
              <Select variant="search" value={logStatus} onChange={(e) => setLogStatus(e.target.value)}>
                <option value="all">{T("All statuses", "كل الحالات", ar)}</option>
                <option value="sent">{T("Sent", "تم الإرسال", ar)}</option>
                <option value="failed">{T("Failed", "فشل", ar)}</option>
              </Select>
            </div>
          </div>

          {mobileLogSearchOpen && (
            <div className="sm:hidden mb-3">
              <Input
                variant="search"
                icon={<Search size={14} />}
                placeholder={T("Search recipient or alert type…", "ابحث عن مستلم أو نوع تنبيه…", ar)}
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                autoFocus
              />
            </div>
          )}

          <div className="rounded-card overflow-hidden mk-surface">
            {filteredLog.length === 0 ? (
              <div className="py-16 text-center text-mk-ink-400">
                <Bell size={32} className="mx-auto mb-3 opacity-30" />
                <p className="mk-body-sm">{T("No notifications found", "لا توجد إشعارات", ar)}</p>
              </div>
            ) : (
              <Table className="min-w-[760px]">
                <thead>
                  <Tr>
                    <Th>{T("Alert type", "نوع التنبيه", ar)}</Th>
                    <Th>{T("Date", "التاريخ", ar)}</Th>
                    <Th>{T("Channel", "القناة", ar)}</Th>
                    <Th>{T("Recipient", "المستلم", ar)}</Th>
                    <Th>{T("Message", "الرسالة", ar)}</Th>
                    <Th>{T("Status", "الحالة", ar)}</Th>
                  </Tr>
                </thead>
                <tbody>
                  {filteredLog.map((l) => {
                    const rule = rules.find((r) => r.id === l.ruleId);
                    const ChannelIcon = CHANNEL_META[l.channel].icon;
                    return (
                      <Tr key={l.id} className="cursor-pointer transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50">
                        <Td className="mk-body-sm text-mk-ink-900 whitespace-nowrap">{rule ? (ar ? rule.labelAr : rule.labelEn) : l.ruleId}</Td>
                        <Td className="mk-caption text-mk-ink-500 whitespace-nowrap">{l.dateISO}</Td>
                        <Td>
                          <span className="flex items-center gap-1 mk-caption text-mk-ink-600">
                            <ChannelIcon size={13} className="text-mk-blue-500" />
                            {ar ? CHANNEL_META[l.channel].ar : CHANNEL_META[l.channel].en}
                          </span>
                        </Td>
                        <Td
                          className="mk-caption text-mk-ink-900 whitespace-nowrap"
                          dir={l.recipientType === "customer" ? "ltr" : undefined}
                        >
                          <span className={l.recipientType === "customer" ? "block text-end" : ""}>
                            {l.recipientType === "customer" ? l.recipient : T("System", "النظام", ar)}
                          </span>
                        </Td>
                        <Td className="mk-caption text-mk-ink-500 max-w-[280px] truncate">{ar ? l.previewAr : l.previewEn}</Td>
                        <Td>
                          <Badge variant={l.status === "sent" ? "success" : "danger"} dot>
                            {l.status === "sent" ? T("Sent", "تم الإرسال", ar) : T("Failed", "فشل", ar)}
                          </Badge>
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </div>
        </div>
      )}

      {/* Add / edit alert drawer — same shape either way, editingRule tells
          saveForm() whether to patch an existing rule or push a new one. */}
      <Drawer open={drawerOpen} onClose={closeDrawer}>
        <div className="flex flex-col justify-between h-full w-full">
          <div>
            <DrawerHeader
              title={editingRule ? T("Edit alert", "تعديل التنبيه", ar) : T("Add alert", "إضافة تنبيه", ar)}
              onClose={closeDrawer}
              className="mb-5 pb-4 border-b border-mk-border"
            />
            <div className="flex flex-col gap-4">
              <Select
                label={T("Category", "الفئة", ar)}
                variant="muted"
                value={form.category}
                onChange={(e) => {
                  const category = e.target.value as NotificationCategory;
                  const allowed = CATEGORY_CHANNELS[category] ?? CHANNEL_ORDER;
                  setForm((f) => ({ ...f, category, channels: f.channels.filter((c) => allowed.includes(c)) }));
                }}
              >
                {CATEGORY_ORDER.map((cat) => (
                  <option key={cat} value={cat}>{ar ? NOTIFICATION_CATEGORY_LABELS[cat].ar : NOTIFICATION_CATEGORY_LABELS[cat].en}</option>
                ))}
              </Select>
              <Input
                label={<>{T("Alert name", "اسم التنبيه", ar)} <span className="text-mk-danger">*</span></>}
                variant="muted"
                placeholder={T("e.g. Insurance policy expiring", "مثال: انتهاء وثيقة التأمين", ar)}
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
              <Input
                label={T("Description", "الوصف", ar)}
                variant="muted"
                placeholder={T("When this alert fires", "متى يُطلق هذا التنبيه", ar)}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />

              <div>
                <label className="mk-label-muted mk-field-label">{T("Channels", "القنوات", ar)}</label>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {availableChannelsForForm.map((ch) => {
                    const Icon = CHANNEL_META[ch].icon;
                    const active = form.channels.includes(ch);
                    return (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => toggleFormChannel(ch)}
                        className={`flex items-center gap-1.5 px-3 h-9 rounded-md border-0 cursor-pointer transition-colors ${active ? CHANNEL_META[ch].activeClass : "bg-mk-ink-50 text-mk-ink-300 hover:bg-mk-ink-100"
                          }`}
                      >
                        <Icon size={15} />
                        <span className="mk-overline font-normal! leading-none whitespace-nowrap">{ar ? CHANNEL_META[ch].shortAr : CHANNEL_META[ch].shortEn}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="mk-label-muted mk-field-label">{T("Fires before an event", "يُطلق قبل الموعد", ar)}</label>
                  <Toggle
                    size="sm"
                    checked={form.hasThreshold}
                    onChange={(v) => setForm((f) => ({ ...f, hasThreshold: v }))}
                  />
                </div>
                {form.hasThreshold && (
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      type="number"
                      min={0}
                      variant="muted"
                      placeholder={T("km", "كم", ar)}
                      value={form.thresholdKm}
                      onChange={(e) => setForm((f) => ({ ...f, thresholdKm: e.target.value }))}
                    />
                    <span className="mk-caption text-mk-ink-400 shrink-0">{T("or", "أو", ar)}</span>
                    <Input
                      type="number"
                      min={0}
                      variant="muted"
                      placeholder={T("days", "يوم", ar)}
                      value={form.thresholdDays}
                      onChange={(e) => setForm((f) => ({ ...f, thresholdDays: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="mk-label-muted mk-field-label">{T("Message", "الرسالة", ar)}</label>
                <textarea
                  value={form.template}
                  onChange={(e) => setForm((f) => ({ ...f, template: e.target.value }))}
                  rows={3}
                  placeholder={T("e.g. {car} ({plate}) insurance expires on {date}.", "مثال: تأمين مركبة {car} ({plate}) ينتهي بتاريخ {date}.", ar)}
                  className="w-full mt-1 px-3 py-2 rounded-md mk-body-sm text-mk-ink-900 border border-mk-ink-200 bg-white outline-none focus:border-mk-blue-500 resize-none"
                />
                <p className="mk-caption text-mk-ink-400 mt-1">
                  {T(
                    "Use placeholders like {car}, {plate}, {date} — filled in automatically when sent.",
                    "استخدم متغيرات زي {car} و{plate} و{date} — بتتعوّض تلقائيًا وقت الإرسال.",
                    ar
                  )}
                </p>
              </div>
            </div>
          </div>
          <DrawerFooter className="justify-stretch">
            <Button variant="outline" onClick={closeDrawer}>{T("Cancel", "إلغاء", ar)}</Button>
            <Button variant="primary" disabled={!form.label.trim()} onClick={saveForm} className="flex-1">
              {editingRule ? T("Save changes", "حفظ التعديلات", ar) : T("Add alert", "إضافة تنبيه", ar)}
            </Button>
          </DrawerFooter>
        </div>
      </Drawer>
    </div>
  );
}