import { ModuleShell } from "@/components/module-shell";

export default function RecipesLayout({ children }: { children: React.ReactNode }) {
  return <ModuleShell module="recipes">{children}</ModuleShell>;
}
