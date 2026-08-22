"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/contexts/AdminContext";
import { Input, Button, Modal, IconButton } from "@/components/ui";
import { accountService } from "@/lib/api-services";
import {
  Palette, User, Lock, Eye, EyeOff, Sun, Moon, Languages,
  Users, FileCheck, ChevronRight, ChevronLeft, Sparkles, CheckCircle2, BookOpen, Headphones,
  MapPinned, Gauge, Repeat2, X, Loader2, AlertCircle
} from "lucide-react";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

const SHOWCASE_IMAGES = [
  "/assets/saudi-desert-car.png",
  "/assets/patrol-night-clean.png",
  "/assets/patrol-night-mountains.png",
  "/assets/nissan-patrol-night-suv.png",
  "/assets/saudi-mountains-suv.png",
  "/assets/saudi-night-mountains-suv.png",
];

const ONBOARDING_STEPS = [
  {
    step: 1,
    titleAr: "عقد تأجير في رحلة واحدة",
    titleEn: "One-Journey Contract Flow",
    descAr: "إصدار عقد موثّق عبر منصة تأجير في رحلة واحدة مميزة بخطوات بسيطة.",
    descEn: "Issue a Tajeer-verified rental contract in one streamlined journey, step by step.",
    icon: FileCheck,
    badgeAr: "خطوات مبسطة",
    badgeEn: "Simplified Steps",
    tag: "تأجير · Tajeer API",
    status: "عقد رقمي موثق",
    metric: "خطوة واحدة متكاملة",
    colorActive: "bg-mk-mint-500 text-white border-mk-mint-300 shadow-lg shadow-mk-mint-500/50 scale-105",
    colorInactive: "bg-mk-mint-500/25 text-mk-mint-300 border-mk-mint-500/40 hover:bg-mk-mint-500/35",
  },
  {
    step: 2,
    titleAr: "تتبع الأسطول والتحكم عن بُعد",
    titleEn: "Fleet Tracking & Remote Control",
    descAr: "مراقبة مباشرة للسيارات، التحكم بإغلاق المحرك عن بُعد، وتنبيهات فورية للمستأجر.",
    descEn: "Live fleet monitoring, remote engine cutoff control, and instant renter alerts.",
    icon: MapPinned,
    badgeAr: "تحكم مباشر",
    badgeEn: "Live Control",
    tag: "GPS · تتبع الأسطول",
    status: "مراقبة لحظية",
    metric: "تحكم فوري بالمحرك",
    colorActive: "bg-mk-blue-500 text-white border-mk-blue-300 shadow-lg shadow-mk-blue-500/50 scale-105",
    colorInactive: "bg-mk-blue-500/25 text-mk-blue-300 border-mk-blue-500/40 hover:bg-mk-blue-500/35",
  },
  {
    step: 3,
    titleAr: "قراءة العداد تلقائياً",
    titleEn: "Automatic Odometer Reading",
    descAr: "قراءة عداد الكيلومترات تلقائياً بين كل عملية تسليم واستلام.",
    descEn: "Odometer auto-captured between every handover and return.",
    icon: Gauge,
    badgeAr: "بدون تدخل يدوي",
    badgeEn: "Zero Manual Entry",
    tag: "قراءة تلقائية",
    status: "دقة كاملة",
    metric: "صفر أخطاء بشرية",
    colorActive: "bg-mk-mint-500 text-white border-mk-mint-300 shadow-lg shadow-mk-mint-500/50 scale-105",
    colorInactive: "bg-mk-mint-500/25 text-mk-mint-300 border-mk-mint-500/40 hover:bg-mk-mint-500/35",
  },
  {
    step: 4,
    titleAr: "رحلات التسليم والاسترجاع",
    titleEn: "Pickup, Return & Extensions",
    descAr: "إدارة رحلات التسليم والاسترجاع، تمديد الفترة، والخصومات من مكان واحد.",
    descEn: "Manage pickup and return trips, period extensions, and discounts in one place.",
    icon: Repeat2,
    badgeAr: "مرونة كاملة",
    badgeEn: "Full Flexibility",
    tag: "دورة الإيجار",
    status: "تمديد وخصومات فورية",
    metric: "إدارة دورة الإيجار كاملة",
    colorActive: "bg-mk-blue-500 text-white border-mk-blue-300 shadow-lg shadow-mk-blue-500/50 scale-105",
    colorInactive: "bg-mk-blue-500/25 text-mk-blue-300 border-mk-blue-500/40 hover:bg-mk-blue-500/35",
  },
  {
    step: 5,
    titleAr: "الأدوار والصلاحيات",
    titleEn: "Roles & Permissions",
    descAr: "تحديد صلاحيات دقيقة لكل موظف حسب دوره في المكتب أو الفرع.",
    descEn: "Fine-grained permissions for every employee, by role and branch.",
    icon: Users,
    badgeAr: "إدارة الفروع",
    badgeEn: "Multi-branch",
    tag: "صلاحيات الموظفين",
    status: "موظف استقبال + مدير",
    metric: "تحكم كامل بالأدوار",
    colorActive: "bg-mk-mint-500 text-white border-mk-mint-300 shadow-lg shadow-mk-mint-500/50 scale-105",
    colorInactive: "bg-mk-mint-500/25 text-mk-mint-300 border-mk-mint-500/40 hover:bg-mk-mint-500/35",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoggedIn, isLoading, logout } = useAuth();
  const { dir, toggleDir, isDark, toggleDark } = useAdmin();
  const ar = dir === "rtl";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeStep, setActiveStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      router.push("/dashboard");
    }
  }, [isLoggedIn, router]);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % ONBOARDING_STEPS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError(T("Please enter your username and password", "الرجاء إدخال اسم المستخدم وكلمة المرور", ar));
      return;
    }

    try {
      await login(username.trim(), password);
      router.push("/dashboard");
    } catch (err) {
      let errorMessage = T("Login failed", "فشل تسجيل الدخول", ar);
      if (err instanceof Error) {
        const msg = err.message;
        if (msg.includes("InvalidCredentials")) {
          errorMessage = T("Incorrect username or password", "اسم المستخدم أو كلمة المرور غير صحيحة", ar);
        } else if (msg.includes("AccountLocked")) {
          errorMessage = T("Account is locked due to multiple failed attempts. Please try again later or contact support.", "تم قفل الحساب بسبب محاولات تسجيل دخول متعددة فاشلة. يرجى المحاولة لاحقاً أو الاتصال بالدعم الفني", ar);
        } else if (msg.includes("AccountDisabled")) {
          errorMessage = T("This account is disabled. Please contact support.", "هذا الحساب معطّل. يرجى الاتصال بالدعم الفني", ar);
        } else {
          errorMessage = msg;
        }
      }
      setError(errorMessage);
    }
  }

  function fillDemoOwner() {
    setUsername("abdullah.otaibi");
    setPassword("Maarkbh@123");
    setError(null);
  }

  const handleLogout = () => {
    logout();
    setUsername("");
    setPassword("");
    setError(null);
  };

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(T("Please fill all fields", "الرجاء ملء جميع الحقول", ar));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(T("New passwords do not match", "كلمة المرور الجديدة غير متطابقة", ar));
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError(T("Password must be at least 6 characters", "كلمة المرور يجب أن تكون 6 أحرف على الأقل", ar));
      return;
    }

    try {
      setIsChangingPassword(true);
      await accountService.changePassword({ currentPassword, newPassword });
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setShowChangePassword(false);
        setPasswordSuccess(false);
      }, 2000);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : T("Failed to change password", "فشل تغيير كلمة المرور", ar));
    } finally {
      setIsChangingPassword(false);
    }
  }

  const currentOnboarding = ONBOARDING_STEPS[activeStep];

  return (
    <div className="min-h-screen flex flex-row-reverse bg-mk-bg">
      {/* Brand & Onboarding Showcase Panel */}
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="hidden lg:flex lg:w-[46%] xl:w-[42%] flex-col justify-between p-8 xl:p-10 relative overflow-hidden select-none"
      >
        {SHOWCASE_IMAGES.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt="Nissan Patrol 4x4 SUV on Saudi Desert Mountain Highway at Night"
            fill
            priority={i === 0}
            className={`object-cover object-[center_45%] contrast-[1.06] grayscale transition-opacity duration-[1500ms] ease-in-out ${
              i === activeStep % SHOWCASE_IMAGES.length ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(165deg, var(--color-mk-mint-500) 0%, var(--color-mk-blue-500) 60%, #0A0E20 100%)",
            mixBlendMode: "color",
            opacity: 0.55,
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-[55%] pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(6,9,20,0.75), transparent)" }}
        />

        {/* Bottom Anchored Onboarding Showcase */}
        <div className="relative z-10 mt-auto p-6 rounded-2xl overflow-hidden bg-black/45 border border-white/20 backdrop-blur-md shadow-2xl flex flex-col gap-4">
          <div
            className="absolute inset-x-0 top-0 h-[3px]"
            style={{ background: "linear-gradient(90deg, var(--color-mk-mint-500), var(--color-mk-blue-500))" }}
          />

          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="mk-overline mb-1 flex items-center">
                <span className="text-white/90">{ar ? currentOnboarding.badgeAr : currentOnboarding.badgeEn}</span>
              </div>
              <h1 className="mk-h3 text-white tracking-tight leading-tight mb-1 font-bold">
                {ar ? currentOnboarding.titleAr : currentOnboarding.titleEn}
              </h1>
              <p className="text-white/80 mk-body-sm leading-relaxed max-w-[420px] mb-2.5">
                {ar ? currentOnboarding.descAr : currentOnboarding.descEn}
              </p>
              <div className="flex items-center flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/25 backdrop-blur-md text-white mk-caption text-[11px] font-semibold">
                  <Sparkles size={11} className="text-mk-mint-300" />
                  {currentOnboarding.metric}
                </span>
                <span className="mk-caption text-[11px] text-white/55">{currentOnboarding.tag}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setActiveStep((prev) => (prev === 0 ? ONBOARDING_STEPS.length - 1 : prev - 1))}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/30 border border-white/25 cursor-pointer text-white transition-all backdrop-blur-md shadow-sm"
                aria-label={T("Previous step", "الخطوة السابقة", ar)}
              >
                {ar ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
              </button>
              <button
                type="button"
                onClick={() => setActiveStep((prev) => (prev + 1) % ONBOARDING_STEPS.length)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/30 border border-white/25 cursor-pointer text-white transition-all backdrop-blur-md shadow-sm"
                aria-label={T("Next step", "الخطوة التالية", ar)}
              >
                {ar ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {ONBOARDING_STEPS.map((s, idx) => {
              const Icon = s.icon;
              const isActive = activeStep === idx;
              return (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => setActiveStep(idx)}
                  className={`p-2.5 rounded-xl text-start transition-all cursor-pointer backdrop-blur-xl flex flex-col gap-2 ${
                    isActive
                      ? "bg-white/20 text-white shadow-xl scale-[1.02]"
                      : "bg-black/30 text-white/70 hover:bg-white/15"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all shrink-0 ${
                      isActive ? s.colorActive : s.colorInactive
                    }`}
                  >
                    <Icon size={15} />
                  </div>
                  <div className="mk-caption truncate text-white text-[11px] font-semibold">
                    {ar ? s.titleAr : s.titleEn}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-white/50 mk-caption text-[11px] pt-1 border-t border-white/10">
            <span>{ar ? "مركبة · Maarkbh" : "Maarkbh · مركبة"} © {new Date().getFullYear()}</span>
            <span className="flex items-center gap-1 text-white/70">
              <CheckCircle2 size={12} className="text-mk-mint-300" />
              {T("Government-approved verification", "توثيق حكومي معتمد", ar)}
            </span>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col mk-surface">
        <header className="px-6 md:px-10 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-md flex items-center justify-center shrink-0 p-2 bg-mk-blue-50">
              <Image src="/assets/logo-symbol-v2.png" alt="Maarkbh" width={28} height={12} className="object-contain" />
            </div>
            <div>
              <div className="mk-h4 leading-none text-mk-ink-900 tracking-tight">{ar ? "مركبة" : "Maarkbh"}</div>
              <div className="mk-overline mt-1 text-mk-ink-400 tracking-wide">{ar ? "Maarkbh" : "مركبة"}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowOnboardingModal(true)}
              className="lg:hidden text-mk-blue-600 mk-caption flex items-center gap-1.5 px-3 py-2 rounded-full bg-mk-blue-500/10 border border-mk-blue-500/20"
            >
              <BookOpen size={13} />
              <span>{T("Onboarding Steps", "خطوات الانضمام", ar)}</span>
            </button>
            <Link
              href="/design-system"
              className="hidden sm:flex text-mk-ink-500 hover:text-mk-ink-900 mk-caption items-center gap-2 px-3 py-2 rounded-full mk-surface border border-mk-ink-100 transition-colors hover:bg-mk-ink-50"
            >
              <Palette size={13} />
              <span>{T("Design System (v1.0)", "نظام التصميم (v1.0)", ar)}</span>
            </Link>
            <div className="w-px h-6 bg-mk-ink-100 mx-1 hidden sm:block" />
            <IconButton
              size="md"
              variant="ghost"
              className="mk-surface !border !border-mk-ink-100 text-mk-ink-500 hover:bg-mk-ink-50 hover:text-mk-ink-900"
              onClick={toggleDir}
              title={ar ? "English" : "العربية"}
              aria-label={ar ? "Switch to English" : "التبديل إلى العربية"}
            >
              <Languages size={17} />
            </IconButton>
            <IconButton
              size="md"
              variant="ghost"
              className="mk-surface !border !border-mk-ink-100 text-mk-ink-500 hover:bg-mk-ink-50 hover:text-mk-ink-900"
              onClick={toggleDark}
              title={isDark ? (ar ? "الوضع الفاتح" : "Light mode") : (ar ? "الوضع الليلي" : "Dark mode")}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </IconButton>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <form onSubmit={handleSubmit} className="w-full max-w-[380px] flex flex-col gap-5">
              <div className="mb-4">
                <h2 className="mk-h3 text-mk-ink-900 mb-1">{T("Sign In", "تسجيل الدخول", ar)}</h2>
                <p className="mk-body-sm text-mk-ink-500 leading-relaxed">
                  {T("Enter your Maarkbh account username and password.", "ادخل باسم المستخدم وكلمة المرور الخاصة بحسابك في مركبة.", ar)}
                </p>
              </div>

              <Input
                label={T("Username", "اسم المستخدم", ar)}
                placeholder="abdullah.otaibi"
                dir="ltr"
                variant="muted"
                className="font-mono text-start"
                icon={<User size={15} />}
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(null); }}
                autoFocus
              />

              <Input
                label={T("Password", "كلمة المرور", ar)}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                dir="ltr"
                variant="muted"
                className="font-mono text-start"
                icon={<Lock size={15} />}
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="text-mk-ink-400 hover:text-mk-ink-700 bg-transparent border-0 cursor-pointer flex items-center transition-colors"
                    aria-label={showPassword ? T("Hide password", "إخفاء كلمة المرور", ar) : T("Show password", "إظهار كلمة المرور", ar)}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                error={error ?? undefined}
              />

              <Button type="submit" variant="primary" size="lg" className="w-full mt-1" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={18} className="animate-spin" />
                    <span>{T("Verifying...", "جاري التحقق...", ar)}</span>
                  </span>
                ) : (
                  T("Sign In", "تسجيل الدخول", ar)
                )}
              </Button>

              <div className="flex flex-col gap-2">
                <Button type="button" variant="ghost" size="sm" className="w-full" onClick={fillDemoOwner}>
                  {T("Fill demo credentials (Owner)", "تعبئة بيانات تجريبية (المالك)", ar)}
                </Button>

                <button
                  onClick={() => setShowChangePassword(true)}
                  type="button"
                  className="w-full py-2.5 px-4 rounded-xl border border-mk-ink-200 text-mk-ink-700 mk-surface hover:bg-mk-ink-50 hover:border-mk-blue-400 mk-body-sm font-medium transition-all flex items-center justify-center gap-2 text-decoration-none shadow-xs group"
                >
                  <Lock size={16} className="text-mk-blue-600 group-hover:scale-110 transition-transform" />
                  <span>{T("Change password", "تغيير كلمة المرور", ar)}</span>
                </button>

                <a
                  href="https://wa.me/966500000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl border border-mk-ink-200 text-mk-ink-700 mk-surface hover:bg-mk-ink-50 hover:border-mk-blue-400 mk-body-sm font-medium transition-all flex items-center justify-center gap-2 text-decoration-none shadow-xs group"
                >
                  <Headphones size={16} className="text-mk-blue-600 group-hover:scale-110 transition-transform" />
                  <span>{T("Contact management & support", "التواصل مع الإدارة والدعم الفني", ar)}</span>
                </a>
              </div>

              <p className="mk-caption text-mk-ink-400 leading-relaxed text-center pt-3 border-t border-mk-ink-100">
                {T("Staff login credentials are managed by the owner or an authorized manager from the", "بيانات دخول الموظفين يديرها المالك أو المدير المفوض من شاشة", ar)}{" "}
                <span className="text-mk-ink-600">{T("Team & Roles", "الفريق والأدوار", ar)}</span>{" "}
                {T("screen — including password resets.", "— بما في ذلك إعادة تعيين كلمة المرور.", ar)}
              </p>
            </form>
        </main>
      </div>

      {/* Onboarding Guide Modal */}
      <Modal
        open={showOnboardingModal}
        onClose={() => setShowOnboardingModal(false)}
        title={T("Onboarding & Setup Guide · Maarkbh Platform", "دليل خطوات الانضمام والتهيئة · منصة مركبة", ar)}
        variant="centered"
        size="md"
      >
        <div className="flex flex-col gap-4">
          <p className="mk-body-sm text-mk-ink-500">
            {T("Five simple steps to start managing your fleet and issuing government-certified contracts:", "خمس خطوات بسيطة للبدء في إدارة أسطولك وإصدار العقود الحكومية الموثقة:", ar)}
          </p>

          <div className="flex flex-col gap-3">
            {ONBOARDING_STEPS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.step} className="p-4 rounded-lg bg-mk-ink-50 border border-mk-ink-100 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-md bg-mk-blue-500/10 text-mk-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="mk-label text-mk-ink-900">
                        {ar ? `الخطوة ٠${s.step}: ${s.titleAr}` : `Step 0${s.step}: ${s.titleEn}`}
                      </span>
                      <span className="mk-overline px-2 py-0.5 rounded-full bg-mk-blue-500/10 text-mk-blue-600">{ar ? s.badgeAr : s.badgeEn}</span>
                    </div>
                    <p className="mk-caption text-mk-ink-500 mb-1.5">{ar ? s.descAr : s.descEn}</p>
                    <span className="inline-flex items-center gap-1 mk-caption text-[11px] font-semibold text-mk-blue-600">
                      <Sparkles size={11} />
                      {s.metric}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="primary" size="sm" onClick={() => setShowOnboardingModal(false)}>
              {T("Got it", "حسناً، فهمت", ar)}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        open={showChangePassword}
        onClose={() => {
          setShowChangePassword(false);
          setPasswordError(null);
          setPasswordSuccess(false);
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        }}
        title={T("Change password", "تغيير كلمة المرور", ar)}
        variant="centered"
        size="md"
      >
        <form onSubmit={handleChangePassword} className="flex flex-col gap-4 p-6">
          <Input
            label={T("Current password", "كلمة المرور الحالية", ar)}
            type="password"
            placeholder="••••••••"
            dir="ltr"
            variant="muted"
            value={currentPassword}
            onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(null); }}
          />
          <Input
            label={T("New password", "كلمة المرور الجديدة", ar)}
            type="password"
            placeholder="••••••••"
            dir="ltr"
            variant="muted"
            value={newPassword}
            onChange={(e) => { setNewPassword(e.target.value); setPasswordError(null); }}
          />
          <Input
            label={T("Confirm new password", "تأكيد كلمة المرور الجديدة", ar)}
            type="password"
            placeholder="••••••••"
            dir="ltr"
            variant="muted"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(null); }}
            error={passwordError ?? undefined}
          />

          {passwordSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-mk-success/10 border border-mk-success/25 text-mk-success mk-caption">
              <CheckCircle2 size={14} className="shrink-0" />
              <span>{T("Password changed successfully", "تم تغيير كلمة المرور بنجاح", ar)}</span>
            </div>
          )}

          <div className="flex gap-3 mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                setShowChangePassword(false);
                setPasswordError(null);
                setPasswordSuccess(false);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
              }}
              disabled={isChangingPassword}
            >
              {T("Cancel", "إلغاء", ar)}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="flex-1"
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {T("Changing...", "جاري التغيير...", ar)}
                </>
              ) : (
                T("Change", "تغيير", ar)
              )}
            </Button>
          </div>
        </form>
      </Modal>

      <style jsx global>{`
        @keyframes fi {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.99);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
