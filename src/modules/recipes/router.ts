import { join } from "path";
import { RecipeService } from ".";

const PUBLIC_PATH = join(process.cwd(), "public");
const WIP_HTML = await Bun.file(join(PUBLIC_PATH, "wip.html")).bytes();

export async function handleRecipeRoutes(
    req: Request,
    RecipeService: RecipeService
): Promise<Response> {

    return new Response(WIP_HTML, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
    });
    
}