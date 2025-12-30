import { useEffect, useState } from "react";
import "./App.css";

type Task = {
  id: string;
  title: string;
  description: string;
  status: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};

const API_BASE = import.meta.env.VITE_API_BASE;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  async function load() {
    const data = await api<Task[]>("/api/tasks");
    setTasks(data);
  }

  async function createTask() {
    await api<{ id: string }>("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title, description }),
    });
    setTitle("");
    setDescription("");
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1>Tasks</h1>

      <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          rows={4}
        />
        <button onClick={createTask} disabled={!title.trim() || !description.trim()}>
          Create Task
        </button>
      </div>

      <h2>All Tasks</h2>
      <div style={{ display: "grid", gap: 10 }}>
        {tasks.map((t) => (
          <div key={t.id} style={{ border: "1px solid #333", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 700 }}>{t.title}</div>
            <div style={{ opacity: 0.85, marginTop: 6 }}>{t.description}</div>
            <div style={{ opacity: 0.6, marginTop: 10, fontSize: 12 }}>
              {t.status} • {new Date(t.created_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
