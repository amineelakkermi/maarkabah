"use client";

import { useState } from "react";
import { Phone, Mail } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge, Button, Input } from "@/components/ui";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

const RESEND_LIMIT = 3;

function OtpChannel({ ar, icon: Icon, label, destination, verified, onVerified }: {
  ar: boolean;
  icon: LucideIcon;
  label: string;
  destination?: string;
  verified: boolean;
  onVerified: () => void;
}) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [code, setCode] = useState("");
  const [resends, setResends] = useState(0);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState(false);

  const disabled = !destination;

  function sendOtp() {
    if (locked || disabled) return;
    setSending(true);
    setError(false);
    setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 800);
  }

  function resend() {
    if (locked) return;
    if (resends + 1 >= RESEND_LIMIT) {
      setResends(RESEND_LIMIT);
      setLocked(true);
      return;
    }
    setResends((r) => r + 1);
    setCode("");
    sendOtp();
  }

  function verifyCode() {
    if (code.trim().length < 4) {
      setError(true);
      return;
    }
    setError(false);
    onVerified();
  }

  return (
    <div className="rounded-lg p-4 border"
      style={{
        background: verified
          ? "linear-gradient(135deg, rgba(63,182,172,0.04) 0%, rgba(63,182,172,0.08) 100%)"
          : "linear-gradient(135deg, rgba(65,113,226,0.03) 0%, rgba(65,113,226,0.06) 100%)",
        borderColor: verified ? "rgba(63,182,172,0.25)" : "rgba(65,113,226,0.18)",
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Icon size={15} className={verified ? "text-mk-mint-600" : "text-mk-blue-600"} />
          <span className="mk-caption text-mk-ink-800">{label}</span>
        </div>
        {verified ? (
          <Badge variant="success">{T("Verified", "متحقق", ar)}</Badge>
        ) : disabled ? (
          <Badge variant="neutral">{T("Not provided", "غير مسجل", ar)}</Badge>
        ) : (
          <Badge variant="warning">{T("Unverified", "غير موثّق", ar)}</Badge>
        )}
      </div>

      <div className="mk-caption text-mk-ink-500 mb-2 font-mono" dir="ltr">{destination || "—"}</div>

      {verified ? null : disabled ? (
        <div className="mk-overline text-mk-ink-400">{T("Add this to the profile to verify it.", "أضف هذه البيانات للملف لتتمكن من توثيقها.", ar)}</div>
      ) : locked ? (
        <div className="flex items-center gap-2 mk-overline text-mk-danger">
          <span>⏱️</span>{T("Too many attempts · try again in 15 minutes", "محاولات كثيرة · حاول بعد 15 دقيقة", ar)}
        </div>
      ) : !sent ? (
        <Button variant="primary" className="w-full justify-center" disabled={sending} onClick={sendOtp}>
          {sending ? (
            <><span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />{T("Sending code...", "جاري الإرسال...", ar)}</>
          ) : (
            T("Send verification code", "إرسال رمز التحقق", ar)
          )}
        </Button>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setError(false); }}
              placeholder={T("6-digit code", "الرمز المكوّن من 6 أرقام", ar)}
              className="flex-1 text-center tracking-[4px]"
              dir="ltr"
            />
            <Button variant="primary" size="sm" onClick={verifyCode} className="shrink-0">
              {T("Verify", "تحقق", ar)}
            </Button>
          </div>
          {error && <div className="mk-overline text-mk-danger">{T("Enter the code sent to you", "أدخل الرمز المرسل إليك", ar)}</div>}
          <Button variant="ghost" size="sm" onClick={resend} className="self-start px-0">
            {T(`Resend code (${RESEND_LIMIT - 1 - resends} left)`, `إعادة إرسال الرمز (متبقي ${RESEND_LIMIT - 1 - resends})`, ar)}
          </Button>
        </div>
      )}
    </div>
  );
}

export function OtpVerificationPanel({ ar, phone, email, phoneVerified, emailVerified, onVerifyPhone, onVerifyEmail }: {
  ar: boolean;
  phone: string;
  email?: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  onVerifyPhone: () => void;
  onVerifyEmail: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 mt-4">
      <div className="mk-overline uppercase tracking-wider text-mk-ink-500">{T("Identity Verification (OTP)", "التحقق من الهوية (OTP)", ar)}</div>
      <OtpChannel ar={ar} icon={Phone} label={T("Mobile phone", "رقم الجوال", ar)} destination={phone} verified={phoneVerified} onVerified={onVerifyPhone} />
      <OtpChannel ar={ar} icon={Mail} label={T("Email address", "البريد الإلكتروني", ar)} destination={email} verified={emailVerified} onVerified={onVerifyEmail} />
    </div>
  );
}
