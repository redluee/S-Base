import { ModuleShell } from "@/components/module-shell";
import { ResumeSubnav } from "./subnav";

export default function ResumeLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleShell module="resume" subnav={<ResumeSubnav />}>
      {children}
    </ModuleShell>
  );
}
