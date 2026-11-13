import { notFoundOn404, serverApi } from "@/lib/server-api";

import { RecipeDetail } from "../recipe-detail";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = await notFoundOn404(serverApi.recipes.get(Number(id)));

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <RecipeDetail recipe={recipe} />
      </div>
  );
}
