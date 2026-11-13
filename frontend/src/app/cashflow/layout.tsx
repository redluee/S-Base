import { ModuleShell } from "@/components/module-shell";
import { CashflowSubnav } from "./subnav";

export default function CashflowLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleShell module="cashflow" subnav={<CashflowSubnav />}>
      {children}
    </ModuleShell>
  );
}
