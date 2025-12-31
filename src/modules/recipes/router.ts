import { RecipeService } from ".";

export async function handleRecipeRoutes(
    req: Request,
    RecipeService: RecipeService
): Promise<Response> {

    return new Response("Not Found", { status: 404 });
}