"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getFlag } from "@/lib/kitchens";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const statusColors: Record<string, string> = {
	"to try": "bg-muted text-black",
	success: "bg-brand/20 text-brand",
	"needs tweak": "bg-amber-900/30 text-amber-400",
	failure: "bg-destructive/10 text-destructive",
	archived: "bg-zinc-800 text-zinc-400",
};

const activeStatusColors: Record<string, string> = {
	"to try": "bg-muted text-black",
	success: "bg-brand text-zinc-900",
	"needs tweak": "bg-amber-600 text-black",
	failure: "bg-destructive text-white",
	archived: "bg-zinc-800 text-zinc-400",
};

const unitLabels: Record<string, string> = {
	g: "g",
	kg: "kg",
	ml: "ml",
	l: "l",
	pcs: t("pcs"),
	tsp: t("tsp"),
	tbsp: t("tbsp"),
	pinch: t("pinch"),
};

export function RecipeDetail({ recipe }: { recipe: any }) {
	const router = useRouter();

	async function handleDelete() {
		if (!confirm(t("Delete this recipe?"))) return;
		await api.recipes.delete(recipe.recipeId);
		router.push("/recipes");
		router.refresh();
	}

	async function handleStatusChange(status: string) {
		await api.recipes.updateStatus(recipe.recipeId, status);
		router.refresh();
	}

	async function handleRatingChange(rating: number) {
		await api.recipes.updateRating(recipe.recipeId, rating);
		router.refresh();
	}

	return (
		<div>
			<Link
				href="/recipes"
				className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group"
			>
				<ArrowLeft className="size-4 transition-transform duration-150 ease-out group-hover:-translate-x-0.5" />
				{t("Taste tracker")}
			</Link>

			<div className="flex items-start justify-between gap-4 mb-6">
				<div>
					<h1 className="font-display text-3xl text-foreground mb-2">
						{recipe.name}
					</h1>
					<div className="flex items-center gap-3 text-sm text-muted-foreground">
						<Badge className={statusColors[recipe.status]}>
							{t(recipe.status)}
						</Badge>
						{recipe.cookingTime && (
							<span className="inline-flex items-center gap-1">
								<svg
									className="size-3.5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									strokeWidth={1.5}
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
									/>
								</svg>
								{recipe.cookingTime} min
							</span>
						)}
						{recipe.kitchen && (
							<span className="inline-flex items-center gap-1">
								<span className="text-lg">{getFlag(recipe.kitchen)}</span>
								{recipe.kitchen}
							</span>
						)}
					</div>
				</div>
				<div className="flex gap-2 shrink-0">
					<Link href={`/recipes/${recipe.recipeId}/edit`}>
						<Button variant="outline" size="sm">
							{t("Edit")}
						</Button>
					</Link>
					<Button
						variant="outline"
						size="sm"
						onClick={handleDelete}
						className="border-destructive text-destructive hover:bg-destructive/10"
					>
						{t("Delete")}
					</Button>
				</div>
			</div>

			{recipe.description && (
				<p className="text-foreground mb-8 leading-relaxed max-w-prose">
					{recipe.description}
				</p>
			)}

			<section className="mb-8">
				<h2 className="text-sm font-medium text-muted-foreground mb-3">
					{t("Rating")}
				</h2>
				<div className="flex gap-1">
					{Array.from({ length: 10 }, (_, i) => {
						const val = i + 1;
						return (
							<button
								key={val}
								onClick={() => handleRatingChange(val)}
								className={`size-8 inline-flex items-center justify-center rounded-lg text-xs font-bold leading-none transition-all active:scale-[0.92] ${
									recipe.rating != null && val <= recipe.rating
										? "bg-brand text-zinc-900"
										: "bg-zinc-800/60 border border-zinc-700 text-foreground hover:bg-zinc-700/60 hover:border-zinc-600"
								}`}
							>
								{val}
							</button>
						);
					})}
				</div>
			</section>

			<section className="mb-8">
				<h2 className="text-sm font-medium text-muted-foreground mb-3">
					{t("Status")}
				</h2>
				<div className="flex gap-2 flex-wrap">
					{["to try", "success", "needs tweak", "failure", "archived"].map(
						(s) => (
							<button
								key={s}
								onClick={() => handleStatusChange(s)}
								className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all active:scale-[0.97] ${
									recipe.status === s
										? activeStatusColors[s]
										: "bg-zinc-800/60 border border-zinc-700 text-foreground hover:bg-zinc-700/60 hover:border-zinc-600"
								}`}
							>
								{t(s)}
							</button>
						),
					)}
				</div>
			</section>

			<section className="mb-8">
				<h2 className="text-sm font-medium text-muted-foreground mb-3">
					{t("Ingredients")}
				</h2>
				{recipe.ingredients?.length > 0 ? (
					<div className="rounded-xl border border-border overflow-hidden">
						<table className="w-full text-sm">
							<thead>
								<tr className="bg-muted/50 border-b border-border">
									<th className="text-left p-3 text-muted-foreground font-normal">
										{t("Ingredient")}
									</th>
									<th className="text-right p-3 text-muted-foreground font-normal">
										{t("Quantity")}
									</th>
									<th className="text-right p-3 text-muted-foreground font-normal">
										{t("Unit")}
									</th>
								</tr>
							</thead>
							<tbody>
								{recipe.ingredients.map((ing: any, i: number) => (
									<tr
										key={i}
										className="border-b border-border/50 last:border-0"
									>
										<td className="p-3 text-foreground">{ing.name}</td>
										<td className="p-3 text-right text-foreground">
											{ing.quantity}
										</td>
										<td className="p-3 text-right text-muted-foreground">
											{unitLabels[ing.unit] ?? ing.unit}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<p className="text-muted-foreground text-sm">
						{t("No ingredients listed.")}
					</p>
				)}
			</section>

			{recipe.steps?.length > 0 && (
				<section className="mb-8">
					<h2 className="text-sm font-medium text-muted-foreground mb-3">
						{t("Steps")}
					</h2>
					<div className="flex flex-col gap-3">
						{recipe.steps.map((step: any) => (
							<div key={step.stepId} className="flex items-start gap-3">
								<div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-brand text-brand text-sm font-bold shrink-0">
									{step.stepNumber}
								</div>
								<p className="text-foreground leading-relaxed pt-1">
									{step.description}
								</p>
							</div>
						))}
					</div>
				</section>
			)}
		</div>
	);
}
