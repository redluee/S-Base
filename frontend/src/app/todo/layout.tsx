import { ModuleShell } from "@/components/module-shell";

export default function TodoLayout({ children }: { children: React.ReactNode }) {
  return <ModuleShell module="todo">{children}</ModuleShell>;
}
