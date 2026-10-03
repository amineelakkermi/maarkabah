// ─────────────────────────────────────────────────────────────
//  describeApiError — turns backend error payloads into clear,
//  localized messages that point at the offending field.
//
//  The ApiError.message already carries the backend text (from
//  errorData.message / title / error); this helper translates the
//  known patterns into Arabic/English and falls back to the raw
//  backend message — always better than a generic "فشل" toast.
// ─────────────────────────────────────────────────────────────

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

// PascalCase field names → localized labels, used for ASP.NET-style
// "The X field is required" and `errors: { Field: [...] }` payloads.
const FIELD_LABELS: Record<string, [string, string]> = {
  PhoneNumber: ["Phone number", "رقم الهاتف"],
  BeneficiaryIdNumber: ["ID number", "رقم الهوية"],
  NationalId: ["ID number", "رقم الهوية"],
  IdentityNumber: ["ID number", "رقم الهوية"],
  PassportNumber: ["Passport number", "رقم الجواز"],
  BorderNumber: ["Border number", "رقم الحدود"],
  LicenseNumber: ["License number", "رقم الرخصة"],
  LicenseExpiryDate: ["License expiry date", "تاريخ انتهاء الرخصة"],
  LicenseIssuePlace: ["License issue place", "مكان إصدار الرخصة"],
  IdentityExpiryDate: ["ID expiry date", "تاريخ انتهاء الهوية"],
  IdentityCopyNumber: ["ID copy number", "رقم نسخة الهوية"],
  BirthDate: ["Birth date", "تاريخ الميلاد"],
  HijriBirthDate: ["Birth date (Hijri)", "تاريخ الميلاد (هجري)"],
  FullNameAr: ["Full name (Arabic)", "الاسم الكامل (عربي)"],
  FullNameEn: ["Full name (English)", "الاسم الكامل (إنجليزي)"],
  Email: ["Email", "البريد الإلكتروني"],
  Address: ["Address", "العنوان"],
  CountryId: ["Country", "الدولة"],
  UserName: ["Username", "اسم المستخدم"],
  Vin: ["VIN", "رقم الهيكل"],
  PlateNumber: ["Plate number", "رقم اللوحة"],
  RentPolicyId: ["Rent policy", "سياسة الإيجار"],
  CancellationPolicyId: ["Cancellation policy", "سياسة الإلغاء"],
  ExtendedCoverageId: ["Extended coverage", "التغطية الإضافية"],
  VehicleId: ["Vehicle", "المركبة"],
  CustomerId: ["Customer", "العميل"],
  WorkingBranchId: ["Branch", "الفرع"],
};

const fieldLabel = (name: string, ar: boolean) => {
  const hit = FIELD_LABELS[name];
  return hit ? T(hit[0], hit[1], ar) : name;
};

// Ordered pattern → localized message rules. First match wins.
const RULES: { pattern: RegExp; message: (ar: boolean) => string }[] = [
  {
    pattern: /plate.*(exist|already|taken|used|duplicate)|duplicate.*plate|Vehicle\.DuplicatePlate/i,
    message: (ar) => T(
      "A vehicle with this plate number and letters already exists — change the plate.",
      "توجد مركبة مسجّلة بنفس رقم وحروف اللوحة — قم بتغيير اللوحة.",
      ar,
    ),
  },
  {
    pattern: /phone.*(exist|already|taken|used|duplicate)/i,
    message: (ar) => T(
      "A user with this phone number already exists — change the phone number.",
      "يوجد مستخدم بنفس رقم الهاتف — قم بتغيير رقم الهاتف.",
      ar,
    ),
  },
  {
    pattern: /(identity|id.?number|beneficiary|iqama|national.?id|document).*(exist|already|taken|used|duplicate)/i,
    message: (ar) => T(
      "A user with this identity number already exists — change the ID number.",
      "يوجد مستخدم بنفس رقم الهوية — قم بتغيير رقم الهوية.",
      ar,
    ),
  },
  {
    pattern: /license.*(exist|already|taken|used|duplicate)/i,
    message: (ar) => T(
      "This license number is already registered — change the license number.",
      "رقم الرخصة مسجّل مسبقًا — قم بتغيير رقم الرخصة.",
      ar,
    ),
  },
  {
    pattern: /email.*(exist|already|taken|used|duplicate)/i,
    message: (ar) => T(
      "This email is already registered — change the email.",
      "البريد الإلكتروني مسجّل مسبقًا — قم بتغيير البريد الإلكتروني.",
      ar,
    ),
  },
  {
    pattern: /user.?name.*(exist|already|taken|used|duplicate)/i,
    message: (ar) => T(
      "This username is already taken — choose another username.",
      "اسم المستخدم محجوز — اختر اسم مستخدم آخر.",
      ar,
    ),
  },
  {
    pattern: /BranchChangeRequiresTransfer|branch.*requires.*transfer/i,
    message: (ar) => T(
      "Branch changes go through the Transfer action — use the نقل button on the vehicle page.",
      "تغيير الفرع يتم عبر عملية النقل — استخدم زر «نقل» في صفحة المركبة.",
      ar,
    ),
  },
  {
    pattern: /StatusLockedByContract|status.*locked.*contract/i,
    message: (ar) => T(
      "Vehicle status is locked by an active contract — it can't be changed until the contract ends.",
      "حالة المركبة مرتبطة بعقد نشط — لا يمكن تغييرها حتى انتهاء العقد.",
      ar,
    ),
  },
  {
    pattern: /Customer\.InUse|customer.*linked to other/i,
    message: (ar) => T(
      "Cannot delete this customer — contracts or drivers still reference it. Remove the linked records first.",
      "لا يمكن حذف العميل لأنه مرتبط بعقود أو سائقين — احذف السجلات المرتبطة أولاً.",
      ar,
    ),
  },
  {
    pattern: /Driver\.InUse|driver.*linked to other/i,
    message: (ar) => T(
      "Cannot delete this driver — contracts still reference it as authorized or extra driver.",
      "لا يمكن حذف السائق لأنه مرتبط بعقود كسائق مفوّض أو إضافي.",
      ar,
    ),
  },
  {
    pattern: /Branch\.InUse|branch.*(linked|in.?use)/i,
    message: (ar) => T(
      "Cannot delete this branch — vehicles, contracts, staff or services still reference it.",
      "لا يمكن حذف الفرع لأنه مرتبط بمركبات أو عقود أو موظفين أو خدمات.",
      ar,
    ),
  },
  {
    pattern: /linked to other records/i,
    message: (ar) => T(
      "Cannot delete — the record is linked to other records.",
      "لا يمكن الحذف — السجل مرتبط بسجلات أخرى.",
      ar,
    ),
  },
  {
    pattern: /Vehicle\.InUse|vehicle.*in.?use/i,
    message: (ar) => T(
      "The vehicle is still referenced by contracts — it can't be deleted or transferred.",
      "المركبة مرتبطة بعقود — لا يمكن حذفها أو نقلها.",
      ar,
    ),
  },
  {
    pattern: /TajeerNotConfigured|tajeer.*(not configured|inactive)/i,
    message: (ar) => T(
      "The Tajeer integration isn't configured for this tenant.",
      "تكامل تاجير غير مفعّل لهذا الحساب.",
      ar,
    ),
  },
  {
    pattern: /general tajeer error|Tajeer\.General|Tajeer\.Error/i,
    message: (ar) => T(
      "Tajeer rejected the request — check the vehicle/contract data on the Tajeer portal, then retry.",
      "رفض تاجير الطلب — تحقق من بيانات المركبة/العقد على بوابة تاجير ثم أعد المحاولة.",
      ar,
    ),
  },
  {
    pattern: /TajeerRequired|requires tajeer/i,
    message: (ar) => T(
      "This tenant issues contracts through Tajeer — the contract must be submitted to Tajeer.",
      "هذا الحساب يصدر العقود عبر تاجير — يجب إرسال العقد إلى تاجير.",
      ar,
    ),
  },
  {
    pattern: /branches must have a tajeer external id/i,
    message: (ar) => T(
      "The selected branches aren't synced with Tajeer — run the branch sync in Settings → Tajeer.",
      "الفروع المحددة غير مزامنة مع تاجير — قم بمزامنة الفروع من الإعدادات ← تاجير.",
      ar,
    ),
  },
  {
    pattern: /operator.*national identity|contract operator/i,
    message: (ar) => T(
      "The contract operator's staff profile is missing a national identity number.",
      "فشل الإرسال — ملف الموظف المنشئ للعقد لا يحتوي على رقم هوية وطنية.",
      ar,
    ),
  },
  {
    pattern: /saved tajeer contract already exists/i,
    message: (ar) => T(
      "This vehicle already has an unsigned saved contract on Tajeer — issue or delete it there first.",
      "لدى هذه المركبة عقد محفوظ غير موقّع على تاجير — أصدره أو احذفه من بوابة تاجير أولاً.",
      ar,
    ),
  },
  {
    pattern: /tenant administrator cannot be modified/i,
    message: (ar) => T(
      "The tenant administrator account can't be modified.",
      "لا يمكن تعديل حساب مدير الحساب الرئيسي.",
      ar,
    ),
  },
  {
    pattern: /tajeer.?synced rent policy|rent policy.*tajeer/i,
    message: (ar) => T(
      "The selected rent policy isn't synced with Tajeer — pick a synced policy or sync policies from the Pricing page.",
      "سياسة التأجير المحددة غير مزامنة مع تاجير — اختر سياسة متزامنة أو زامن السياسات من صفحة الأسعار.",
      ar,
    ),
  },
  {
    pattern: /PaidExceedsTotal|paid amount cannot exceed/i,
    message: (ar) => T(
      "The paid amount cannot exceed the contract total — lower the payment or check the totals.",
      "المبلغ المدفوع لا يمكن أن يتجاوز إجمالي العقد — خفّض الدفعة أو تحقق من الإجماليات.",
      ar,
    ),
  },
  {
    pattern: /active or pending contract/i,
    message: (ar) => T(
      "The vehicle already has an active or pending contract.",
      "لدى المركبة عقد نشط أو معلّق بالفعل.",
      ar,
    ),
  },
];

/**
 * Best-effort localized description of an API error.
 * @param err the thrown error (ApiError or anything)
 * @param ar  true when the UI is in Arabic
 * @param fallback generic message used when nothing can be extracted
 */
export function describeApiError(err: unknown, ar: boolean, fallback?: string): string {
  const raw = err instanceof Error ? err.message : "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response: any = (err as any)?.response;

  // 1) ASP.NET-style field validation object: { errors: { PhoneNumber: ["..."] } }
  const fieldErrors = response?.errors;
  if (fieldErrors && typeof fieldErrors === "object") {
    const rawField = Object.keys(fieldErrors)[0];
    const firstField = rawField?.includes(".") ? rawField.split(".").pop() : rawField;
    if (firstField) {
      const detail = Array.isArray(fieldErrors[rawField]) ? fieldErrors[rawField][0] : "";
      for (const rule of RULES) {
        if (rule.pattern.test(detail)) return rule.message(ar);
      }
      if (/required/i.test(detail)) {
        return T(
          `The field "${fieldLabel(firstField, false)}" is required.`,
          `الحقل "${fieldLabel(firstField, true)}" مطلوب.`,
          ar,
        );
      }
      if (detail) {
        return T(
          `${fieldLabel(firstField, false)}: ${detail}`,
          `${fieldLabel(firstField, true)}: ${detail}`,
          ar,
        );
      }
    }
  }

  // 2) Known message patterns on the flat backend text or the error code
  const code = String(response?.code ?? response?.details?.code ?? "");
  for (const rule of RULES) {
    if (rule.pattern.test(raw) || (code && rule.pattern.test(code))) return rule.message(ar);
  }

  // 3) "The X field is required" — translate the field name
  const requiredMatch = raw.match(/^The (\w+) field is required/i);
  if (requiredMatch) {
    return T(
      `The field "${fieldLabel(requiredMatch[1], false)}" is required.`,
      `الحقل "${fieldLabel(requiredMatch[1], true)}" مطلوب.`,
      ar,
    );
  }

  // 4) Raw backend message — still far more useful than a generic toast
  if (raw) return raw;

  return fallback ?? T("Request failed", "فشل الطلب", ar);
}
