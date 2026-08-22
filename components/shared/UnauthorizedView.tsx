"use client";

import { ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, CardHeader, CardIcon, CardTitle, CardMeta } from "@/components/ui";
import { useLocale } from "@/contexts/LocaleContext";

interface UnauthorizedViewProps {
  homeHref?: string;
}

export function UnauthorizedView({ homeHref = "/dashboard" }: UnauthorizedViewProps) {
  const router = useRouter();
  const { dir } = useLocale();
  const isRtl = dir === "rtl";

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader className="flex-col items-center gap-3">
          <CardIcon gradient="blue-violet">
            <ShieldAlert className="w-5 h-5 text-white mx-auto mt-2" />
          </CardIcon>
          <CardTitle>{isRtl ? "وصول مرفوض" : "Unauthorized"}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <CardMeta>
            {isRtl
              ? "ليس لديك الصلاحية للوصول إلى هذه الصفحة."
              : "You do not have permission to access this page."}
          </CardMeta>
          <Button variant="primary" onClick={() => router.replace(homeHref)}>
            {isRtl ? "العودة إلى الرئيسية" : "Back to home"}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
