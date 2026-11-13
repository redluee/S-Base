import type { ReactNode } from "react";
import { NavHeader } from "@/components/nav-header";
import type { ModuleId } from "@/lib/modules";
import { requireModuleUser } from "@/lib/server-api";

export async function ModuleShell({
  module,
  subnav,
  children,
}: {
  module: ModuleId;
  subnav?: ReactNode;
  children: ReactNode;
}) {
  const user = await requireModuleUser(module);
  return (
    <div className="min-h-screen flex flex-col">
      <NavHeader user={user} />
      {subnav}
      <main id="main-content" className="flex-1 w-full">
        {children}
      </main>
    </div>
  );
}
