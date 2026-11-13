import { ModuleShell } from "@/components/module-shell";
import { RecipeSearchBar } from "./recipe-search";

export default function RecipesLayout({ children }: { children: React.ReactNode }) {
  return <ModuleShell module="recipes" search={<RecipeSearchBar />}>{children}</ModuleShell>;
}
