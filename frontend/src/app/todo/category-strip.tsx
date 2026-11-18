"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { todoColorHex } from "@backend/shared/todo";
import type { TodoCategory, TodoProject } from "@backend/types/todo";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "./category-icon";
import { Chip, ChipCount } from "./chip";

const PROJECT_DELAY_MS = 90;
const PROJECT_STAGGER_MS = 35;

function Reveal({ show, delay = 0, children }: { show: boolean; delay?: number; children: ReactNode }) {
  return (
    <div
      aria-hidden={show ? undefined : true}
      inert={!show}
      className={cn(
        "grid shrink-0 transition-[grid-template-columns,opacity] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
        show ? "grid-cols-[1fr] opacity-100" : "grid-cols-[0fr] opacity-0 duration-200",
      )}
      style={show && delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      <div className="-my-2 min-w-0 overflow-hidden py-2">
        <div
          className={cn(
            "flex items-center pr-1.5 transition-[scale] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
            show ? "scale-100" : "scale-90",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export interface CategoryStripProps {
  label: string;
  categories: TodoCategory[];
  projects: TodoProject[];
  categoryId: number | null;
  projectId: number | null;
  onCategory: (category: TodoCategory) => void;
  onProject: (project: TodoProject) => void;
  leading?: ReactNode;
  categoryCount?: (id: number) => number;
  projectCount?: (id: number) => number;
  categoryName?: (category: TodoCategory) => string;
  className?: string;
}

export function CategoryStrip({
  label,
  categories,
  projects,
  categoryId,
  projectId,
  onCategory,
  onProject,
  leading,
  categoryCount,
  projectCount,
  categoryName = (category) => category.name,
  className,
}: CategoryStripProps) {
  const row = useRef<HTMLDivElement>(null);
  const open = categoryId !== null && categories.some((c) => c.id === categoryId);

  useEffect(() => {
    if (open) row.current?.scrollTo({ left: 0, behavior: "smooth" });
  }, [open, categoryId]);

  if (categories.length === 0 && !leading) return null;

  return (
    <div
      ref={row}
      role="group"
      aria-label={label}
      className={cn("-mx-4 flex items-center overflow-x-auto px-4 py-2 [scrollbar-width:none]", className)}
    >
      {leading && <Reveal show={!open}>{leading}</Reveal>}
      {categories.map((category) => {
        const selected = category.id === categoryId;
        const own = projects.filter((p) => p.categoryId === category.id);
        return (
          <div key={category.id} className="contents">
            <Reveal show={!open || selected}>
              <Chip active={selected} onClick={() => onCategory(category)}>
                <CategoryIcon icon={category.icon} color={todoColorHex(category.color)} />
                {categoryName(category)}
                {categoryCount && <ChipCount value={categoryCount(category.id)} active={selected} />}
              </Chip>
            </Reveal>
            {own.length > 0 && (
              <Reveal show={selected} delay={PROJECT_DELAY_MS}>
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" aria-hidden="true" />
              </Reveal>
            )}
            {own.map((project, index) => (
              <Reveal key={project.id} show={selected} delay={PROJECT_DELAY_MS + (index + 1) * PROJECT_STAGGER_MS}>
                <Chip active={project.id === projectId} onClick={() => onProject(project)}>
                  {project.name}
                  {projectCount && <ChipCount value={projectCount(project.id)} active={project.id === projectId} />}
                </Chip>
              </Reveal>
            ))}
          </div>
        );
      })}
    </div>
  );
}
