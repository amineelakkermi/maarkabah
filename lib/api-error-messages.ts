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

  // 2) Known message patterns on the flat backend text
  for (const rule of RULES) {
    if (rule.pattern.test(raw)) return rule.message(ar);
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
