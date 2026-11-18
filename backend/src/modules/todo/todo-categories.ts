import type { TodoColor } from "../../shared/todo";
import type { TodoCategory, TodoCategoryRemoval, TodoProject } from "../../types/todo";
import { ensureSystemCategory, listCategories, listProjects } from "./todo-records";
import { notImplemented } from "./todo-stub";

export class TodoCategories {
  list(userId: number): TodoCategory[] {
    return listCategories(userId);
  }

  listProjects(userId: number): TodoProject[] {
    return listProjects(userId);
  }

  ensureSystem(userId: number): TodoCategory {
    return ensureSystemCategory(userId).category;
  }

  create(_userId: number, _input: { name: string; color: TodoColor }): TodoCategory {
    return notImplemented();
  }

  update(_userId: number, _id: number, _patch: { name?: string; color?: TodoColor }): TodoCategory {
    return notImplemented();
  }

  reorder(_userId: number, _ids: number[]): TodoCategory[] {
    return notImplemented();
  }

  remove(_userId: number, _id: number): TodoCategoryRemoval {
    return notImplemented();
  }

  createProject(_userId: number, _input: { categoryId: number; name: string }): TodoProject {
    return notImplemented();
  }

  updateProject(_userId: number, _id: number, _patch: { name: string }): TodoProject {
    return notImplemented();
  }

  reorderProjects(_userId: number, _categoryId: number, _ids: number[]): TodoProject[] {
    return notImplemented();
  }

  removeProject(_userId: number, _id: number): { success: true } {
    return notImplemented();
  }
}
