import { describe, expect, it } from "bun:test";
import type { TodoTask } from "@backend/types/todo";
import {
  ALL_TASKS,
  filterPreselection,
  filterTasks,
  moveTask,
  positionForMove,
  removeCategoryLocally,
  toggleFilter,
  upsertTask,
  withRecentCompletion,
  type TodoState,
} from "./todo-state";

function task(id: number, position: number, extra: Partial<TodoTask> = {}): TodoTask {
  return {
    id,
    title: `Taak ${id}`,
    categoryId: null,
    projectId: null,
    dueDate: null,
    flagged: false,
    notes: "",
    position,
    createdAt: "2026-11-18T10:00:00.000Z",
    lastEditedAt: "2026-11-18T10:00:00.000Z",
    completedAt: null,
    link: null,
    subtasks: [],
    ...extra,
  };
}

const ids = (tasks: TodoTask[]) => tasks.map((t) => t.id);

describe("filters", () => {
  const tasks = [task(1, 0, { flagged: true }), task(2, 1, { categoryId: 5, projectId: 9 }), task(3, 2, { categoryId: 5 })];

  it("filters flagged, by category and by project", () => {
    expect(ids(filterTasks(tasks, { kind: "flagged" }))).toEqual([1]);
    expect(ids(filterTasks(tasks, { kind: "category", categoryId: 5, projectId: null }))).toEqual([2, 3]);
    expect(ids(filterTasks(tasks, { kind: "category", categoryId: 5, projectId: 9 }))).toEqual([2]);
  });

  it("clears a filter when its chip is tapped again", () => {
    const category = { kind: "category", categoryId: 5, projectId: null } as const;
    expect(toggleFilter({ kind: "flagged" }, { kind: "flagged" })).toEqual(ALL_TASKS);
    expect(toggleFilter(category, category)).toEqual(ALL_TASKS);
    expect(toggleFilter({ ...category, projectId: 9 }, { ...category, projectId: 9 })).toEqual(category);
  });

  it("preselects the active category and project for quick add", () => {
    expect(filterPreselection({ kind: "category", categoryId: 5, projectId: 9 })).toEqual({ categoryId: 5, projectId: 9 });
    expect(filterPreselection({ kind: "flagged" })).toEqual({ categoryId: null, projectId: null });
  });
});

describe("global order", () => {
  const tasks = [task(1, 0), task(2, 1), task(3, 2), task(4, 3)];

  it("moves after a task, keeping hidden tasks in place", () => {
    expect(ids(moveTask(tasks, 1, { afterId: 3, beforeId: null }))).toEqual([2, 3, 1, 4]);
    expect(positionForMove(tasks, 1, { afterId: 3, beforeId: null })).toBe(2.5);
  });

  it("moves before a task and to the top", () => {
    expect(ids(moveTask(tasks, 4, { afterId: null, beforeId: 2 }))).toEqual([1, 4, 2, 3]);
    expect(ids(moveTask(tasks, 3, { afterId: null, beforeId: null }))).toEqual([3, 1, 2, 4]);
  });

  it("rebalances when two neighbours are too close", () => {
    const tight = [task(1, 0), task(2, 1e-12), task(3, 5)];
    const moved = moveTask(tight, 3, { afterId: 1, beforeId: null });
    expect(ids(moved)).toEqual([1, 3, 2]);
    expect(moved.map((t) => t.position)).toEqual([0, 1, 2]);
  });

  it("drops completed tasks from the open list on upsert", () => {
    expect(ids(upsertTask(tasks, task(2, 1, { completedAt: "2026-11-18T11:00:00.000Z" })))).toEqual([1, 3, 4]);
    expect(ids(upsertTask(tasks, task(9, -1)))).toEqual([9, 1, 2, 3, 4]);
  });
});

describe("category removal", () => {
  it("uncategorises its tasks and clears its filter", () => {
    const state: TodoState = {
      tasks: [task(1, 0, { categoryId: 5, projectId: 9 }), task(2, 1, { categoryId: 6 })],
      categories: [
        { id: 5, name: "Werk", color: "sky", sortOrder: 0, isSystem: false },
        { id: 6, name: "Thuis", color: "teal", sortOrder: 1, isSystem: false },
      ],
      projects: [{ id: 9, categoryId: 5, name: "Site", sortOrder: 0, source: null }],
      completedCount: 0,
      recentCompleted: [],
      filter: { kind: "category", categoryId: 5, projectId: null },
    };
    const next = removeCategoryLocally(state, 5);
    expect(next.tasks[0]).toMatchObject({ categoryId: null, projectId: null });
    expect(next.tasks[1].categoryId).toBe(6);
    expect(next.projects).toEqual([]);
    expect(next.filter).toEqual(ALL_TASKS);
  });
});

describe("recent completions", () => {
  it("keeps the three most recent, newest first, with the live category", () => {
    const categories = [{ id: 5, name: "Werk", color: "sky" as const, sortOrder: 0, isSystem: false }];
    const older = [1, 2, 3].map((id) => ({
      ...task(id, id),
      completedAt: "2026-11-17T10:00:00.000Z",
      categoryName: null,
      categoryColor: null,
    }));
    const next = withRecentCompletion(older, task(9, 0, { categoryId: 5 }), categories, "2026-11-18T10:00:00.000Z");
    expect(next.map((t) => t.id)).toEqual([9, 1, 2]);
    expect(next[0]).toMatchObject({ categoryName: "Werk", categoryColor: "sky", completedAt: "2026-11-18T10:00:00.000Z" });
  });
});
