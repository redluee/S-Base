"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { Button } from "@/components/ui/button";

export function NavHeader({ username }: { username: string }) {
  const router = useRouter();

  async function handleLogout() {
    await api.logout();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border">
      <a href="/dashboard" className="font-display text-xl text-brand">
        S-Base
      </a>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">{username}</span>
        <Button variant="outline" size="sm" onClick={handleLogout} className="border-border text-xs">
          {t("Logout")}
        </Button>
      </div>
    </header>
  );
}
