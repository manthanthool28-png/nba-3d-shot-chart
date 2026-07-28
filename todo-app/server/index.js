import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, "todos.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const app = express();
app.use(cors());
app.use(express.json());

// List all todos, newest first
app.get("/api/todos", (req, res) => {
  const todos = db
    .prepare("SELECT * FROM todos ORDER BY id DESC")
    .all();
  res.json(todos);
});

// Create a todo
app.post("/api/todos", (req, res) => {
  const text = (req.body.text ?? "").trim();
  if (!text) {
    return res.status(400).json({ error: "Todo text is required" });
  }
  const info = db.prepare("INSERT INTO todos (text) VALUES (?)").run(text);
  const todo = db
    .prepare("SELECT * FROM todos WHERE id = ?")
    .get(info.lastInsertRowid);
  res.status(201).json(todo);
});

// Toggle completed
app.patch("/api/todos/:id", (req, res) => {
  const { id } = req.params;
  const todo = db.prepare("SELECT * FROM todos WHERE id = ?").get(id);
  if (!todo) return res.status(404).json({ error: "Todo not found" });
  const completed = req.body.completed ? 1 : 0;
  db.prepare("UPDATE todos SET completed = ? WHERE id = ?").run(completed, id);
  res.json({ ...todo, completed });
});

// Delete one todo
app.delete("/api/todos/:id", (req, res) => {
  const info = db.prepare("DELETE FROM todos WHERE id = ?").run(req.params.id);
  if (info.changes === 0) {
    return res.status(404).json({ error: "Todo not found" });
  }
  res.json({ deleted: Number(req.params.id) });
});

// Delete all todos
app.delete("/api/todos", (req, res) => {
  const info = db.prepare("DELETE FROM todos").run();
  res.json({ deletedCount: info.changes });
});

const PORT = process.env.TODO_API_PORT || 4000;
app.listen(PORT, () => {
  console.log(`SQL todo server running on http://localhost:${PORT}`);
});
