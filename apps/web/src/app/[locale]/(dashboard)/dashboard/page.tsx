"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useAuthStore } from "@/stores/auth-store";

export default function DashboardRedirectPage() {
  const router = useRouter();
  const locale = useLocale();
  const { user } = useAuthStore();

  useEffect(() => {
    const role = user?.role;
    if (role === "SUPER_ADMIN" || role === "ADMIN") {
      router.replace(`/${locale}/admin/dashboard`);
    } else {
      router.replace(`/${locale}/profile`);
    }
  }, [user, router, locale]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
    </div>
  );
}
