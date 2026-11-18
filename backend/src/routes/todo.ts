import { Elysia, t } from "elysia";
import { todo, todoAuth } from "../context";
import { TODO_COLORS } from "../shared/todo";

const idParams = t.Object({ id: t.Numeric() });
const nullableId = t.Nullable(t.Integer({ minimum: 1 }));
const dueDate = t.Nullable(t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }));
const color = t.Union(TODO_COLORS.map((c) => t.Literal(c)));
const move = t.Object({ afterId: nullableId, beforeId: nullableId });
const optionalId = t.Optional(t.Numeric({ minimum: 1 }));

export const todoRoutes = new Elysia().group("/api/todo", (app) =>
  app
    .use(todoAuth)
    .get("/", ({ userId }) => todo.tasks.snapshot(userId))
    .get("/count", ({ userId }) => ({ open: todo.tasks.openCount(userId) }))
    .get("/tasks/:id", ({ userId, params: { id } }) => todo.tasks.get(userId, id), { params: idParams })
    .post("/tasks", ({ userId, body }) => todo.tasks.create(userId, body), {
      body: t.Object({
        title: t.String(),
        categoryId: t.Optional(nullableId),
        projectId: t.Optional(nullableId),
        dueDate: t.Optional(dueDate),
      }),
    })
    .patch("/tasks/:id", ({ userId, params: { id }, body }) => todo.tasks.update(userId, id, body), {
      params: idParams,
      body: t.Object({
        title: t.Optional(t.String()),
        categoryId: t.Optional(nullableId),
        projectId: t.Optional(nullableId),
        dueDate: t.Optional(dueDate),
        flagged: t.Optional(t.Boolean()),
        notes: t.Optional(t.String()),
      }),
    })
    .post("/tasks/:id/move", ({ userId, params: { id }, body }) => todo.tasks.move(userId, id, body), {
      params: idParams,
      body: move,
    })
    .post("/tasks/:id/complete", ({ userId, params: { id } }) => todo.completion.complete(userId, id), {
      params: idParams,
    })
    .post("/tasks/:id/uncomplete", ({ userId, params: { id } }) => todo.completion.uncomplete(userId, id), {
      params: idParams,
    })
    .delete("/tasks/:id", ({ userId, params: { id } }) => todo.completion.remove(userId, id), { params: idParams })
    .post("/tasks/:id/undelete", ({ userId, params: { id } }) => todo.completion.undelete(userId, id), {
      params: idParams,
    })
    .post("/tasks/:id/restore", ({ userId, params: { id } }) => todo.history.restore(userId, id), {
      params: idParams,
    })
    .post("/tasks/:id/subtasks", ({ userId, params: { id }, body }) => todo.subtasks.create(userId, id, body), {
      params: idParams,
      body: t.Object({ title: t.String(), afterId: t.Optional(nullableId) }),
    })
    .patch("/subtasks/:id", ({ userId, params: { id }, body }) => todo.subtasks.update(userId, id, body), {
      params: idParams,
      body: t.Object({ title: t.Optional(t.String()), done: t.Optional(t.Boolean()) }),
    })
    .post("/subtasks/:id/move", ({ userId, params: { id }, body }) => todo.subtasks.move(userId, id, body), {
      params: idParams,
      body: move,
    })
    .delete("/subtasks/:id", ({ userId, params: { id } }) => todo.subtasks.remove(userId, id), { params: idParams })
    .post("/categories", ({ userId, body }) => todo.categories.create(userId, body), {
      body: t.Object({ name: t.String(), color }),
    })
    .patch("/categories/:id", ({ userId, params: { id }, body }) => todo.categories.update(userId, id, body), {
      params: idParams,
      body: t.Object({ name: t.Optional(t.String()), color: t.Optional(color) }),
    })
    .post("/categories/reorder", ({ userId, body }) => todo.categories.reorder(userId, body.ids), {
      body: t.Object({ ids: t.Array(t.Integer({ minimum: 1 })) }),
    })
    .delete("/categories/:id", ({ userId, params: { id } }) => todo.categories.remove(userId, id), {
      params: idParams,
    })
    .post("/projects", ({ userId, body }) => todo.categories.createProject(userId, body), {
      body: t.Object({ categoryId: t.Integer({ minimum: 1 }), name: t.String() }),
    })
    .patch("/projects/:id", ({ userId, params: { id }, body }) => todo.categories.updateProject(userId, id, body), {
      params: idParams,
      body: t.Object({ name: t.String() }),
    })
    .post(
      "/categories/:id/projects/reorder",
      ({ userId, params: { id }, body }) => todo.categories.reorderProjects(userId, id, body.ids),
      { params: idParams, body: t.Object({ ids: t.Array(t.Integer({ minimum: 1 })) }) },
    )
    .delete("/projects/:id", ({ userId, params: { id } }) => todo.categories.removeProject(userId, id), {
      params: idParams,
    })
    .get("/history", ({ userId, query }) => todo.history.list(userId, query), {
      query: t.Object({
        q: t.Optional(t.String()),
        categoryId: optionalId,
        projectId: optionalId,
        cursor: t.Optional(t.String()),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
      }),
    })
    .get("/history/pulse", ({ userId, query }) => todo.history.pulse(userId, query), {
      query: t.Object({ categoryId: optionalId, projectId: optionalId }),
    }),
);
