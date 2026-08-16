"use client";

import { Banknote, FileSignature, ClockAlert, Hourglass, Gauge } from "lucide-react";
import { KpiCard, Spark, Button } from "@/components/ui";
import { REVENUE_28D, REVENUE_BY_CATEGORY, REVENUE_WEEK } from "@/lib/data";

const KPIS = [
  { icon: Banknote, label: "Total Revenue", value: "142,840", sub: "SAR · this month", kind: "default" as const, delta: { dir: "up" as const, value: "+18.4%" } },
  { icon: FileSignature, label: "Active Contracts", value: "6", sub: "of 22 cars", kind: "violet" as const },
  { icon: ClockAlert, label: "Late Returns", value: "2", sub: "0.4% rate", kind: "alert" as const },
  { icon: Hourglass, label: "Avg Duration", value: "3.6 d", sub: "vs 3.2 d last month", kind: "mint" as const, delta: { dir: "up" as const, value: "+12%" } },
  { icon: Gauge, label: "Fleet Utilization", value: "68%", sub: "7-day avg", kind: "warn" as const },
];

const MONTHS = ["Apr 10", "Apr 17", "Apr 24", "May 01", "May 07"];

export default function RevenuePage() {
  const max = Math.max(...REVENUE_28D);

  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {KPIS.map((k) => (
          <KpiCard key={k.label} icon={k.icon} label={k.label} value={k.value} sub={k.sub} kind={k.kind} delta={k.delta} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 mt-4">
        {/* 28-day bar chart */}
        <div className="rounded-xl p-6 mk-surface">
          <div className="flex items-center gap-3 mb-4">
            <div className="mk-h4 flex-1 text-mk-ink-900">Daily revenue · last 28 days</div>
            <Button variant="outline" size="sm" className="normal-case tracking-normal">
              Compare period
            </Button>
          </div>
          <div className="flex items-end gap-2 h-40">
            {REVENUE_28D.map((v, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm transition-opacity hover:opacity-80 min-h-1"
                style={{
                  height: `${(v / max) * 100}%`,
                  background: i < 14
                    ? "var(--color-mk-ink-100)"
                    : `linear-gradient(180deg, var(--color-mk-blue-500), var(--color-mk-blue-600))`,
                  borderRadius: "var(--radius-sm) var(--radius-sm) var(--radius-xs) var(--radius-xs)",
                }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 mk-overline normal-case tracking-normal text-mk-ink-500">
            {MONTHS.map((m) => <span key={m}>{m}</span>)}
          </div>
        </div>

        {/* By category */}
        <div className="rounded-xl p-6 mk-surface">
          <div className="mk-h4 mb-4 text-mk-ink-900">Revenue by category</div>
          {REVENUE_BY_CATEGORY.map((cat) => (
            <div key={cat.name} className="mb-4">
              <div className="flex justify-between mk-label mb-1">
                <span className="text-mk-ink-900">{cat.name}</span>
                <span>
                  <b className="text-mk-ink-900">{cat.value.toLocaleString()}</b>
                  <span className="mk-caption normal-case tracking-normal text-mk-ink-500"> SAR · {cat.pct}%</span>
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden bg-mk-ink-100">
                <div className="h-full rounded-full" style={{ width: `${cat.pct}%`, background: cat.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly sparkline */}
      <div className="rounded-xl p-6 mt-4 mk-surface">
        <div className="flex items-center gap-3 mb-4">
          <div className="mk-h4 flex-1 text-mk-ink-900">Revenue trend · 7 days</div>
          <span className="mk-body-sm text-mk-mint-600">SAR 32,940 total</span>
        </div>
        <Spark data={REVENUE_WEEK.map((d) => d.value)} color="var(--color-mk-blue-500)" />
        <div className="flex justify-between mt-1 mk-overline normal-case tracking-normal text-mk-ink-500">
          {REVENUE_WEEK.map((d) => <span key={d.day}>{d.day}</span>)}
        </div>
      </div>
    </div>
  );
}
