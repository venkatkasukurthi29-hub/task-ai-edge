import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { z } from "zod";

type Env = {
  task_db: D1Database;
};

const app = new Hono<{ Bindings: Env }>();

app.use("*", secureHeaders());
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173"],
    allowHeaders: ["Content-Type"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE"],
  })
);

// Health
app.get("/api/health", (c) => c.json({ ok: true }));

// Schema
const CreateTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

// GET all tasks
app.get("/api/tasks", async (c) => {
  const res = await c.env.task_db
    .prepare(
      `SELECT id, title, description, status, tags, created_at, updated_at
       FROM tasks
       ORDER BY created_at DESC`
    )
    .all();

  return c.json(
    res.results?.map((t: any) => ({
      ...t,
      tags: JSON.parse(t.tags),
    })) ?? []
  );
});

// CREATE task
app.post("/api/tasks", async (c) => {
  const body = await c.req.json();
  const parsed = CreateTaskSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.task_db
    .prepare(
      `INSERT INTO tasks (id, title, description, status, tags, created_at, updated_at)
       VALUES (?, ?, ?, 'open', '[]', ?, ?)`
    )
    .bind(id, parsed.data.title, parsed.data.description, now, now)
    .run();

  return c.json({ id }, 201);
});

// UPDATE task
app.patch("/api/tasks/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  await c.env.task_db
    .prepare(
      `UPDATE tasks
       SET status = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(body.status ?? "open", new Date().toISOString(), id)
    .run();

  return c.json({ ok: true });
});

// DELETE task
app.delete("/api/tasks/:id", async (c) => {
  const id = c.req.param("id");

  await c.env.task_db
    .prepare(`DELETE FROM tasks WHERE id = ?`)
    .bind(id)
    .run();

  return c.json({ ok: true });
});

export default app;
