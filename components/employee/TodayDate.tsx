"use client";

import { useEffect, useState } from "react";

/** Today's full date under a panel title ("Saturday, 15 October 2026").
    Rendered after mount so server and client markup match. */
export function TodayDate({ ar }: { ar: boolean }) {
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => { setToday(new Date()); }, []);
  const locale = ar ? "ar-SA-u-ca-gregory-nu-latn" : "en-US";
  return (
    <div className="mk-caption text-mk-ink-500">
      {today ? today.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "\u00A0"}
    </div>
  );
}
