import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserProvider } from "@/contexts/UserContext";
import { PermissionsProvider } from "@/contexts/PermissionsContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { UIProvider } from "@/contexts/UIContext";
import { ToastProvider } from "@/components/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maarkbh · مركبة — Portal",
  description:
    "Brand identity and unified SaaS portal for Maarkbh — the KSA car rental platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased">
      <body className="min-h-full">
        <AuthProvider>
          <UserProvider>
            <PermissionsProvider>
              <ThemeProvider>
                <LocaleProvider>
                  <UIProvider>
                    <ToastProvider>
                      {children}
                    </ToastProvider>
                  </UIProvider>
                </LocaleProvider>
              </ThemeProvider>
            </PermissionsProvider>
          </UserProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
