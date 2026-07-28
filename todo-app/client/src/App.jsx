import { useEffect, useState } from "react";

const API = "/api/todos";

function formatTimestamp(sqlUtc) {
  // SQLite datetime('now') is UTC — convert to local time for display
  const date = new Date(sqlUtc.replace(" ", "T") + "Z");
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export default function App() {
  const [todos, setTodos] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadTodos() {
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error("Failed to load todos");
      setTodos(await res.json());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTodos();
  }, []);

  async function createTodo(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmed })
    });
    if (res.ok) {
      const todo = await res.json();
      setTodos((prev) => [todo, ...prev]);
      setText("");
    }
  }

  async function toggleTodo(todo) {
    const res = await fetch(`${API}/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !todo.completed })
    });
    if (res.ok) {
      const updated = await res.json();
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    }
  }

  async function deleteTodo(id) {
    const res = await fetch(`${API}/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTodos((prev) => prev.filter((t) => t.id !== id));
    }
  }

  async function deleteAll() {
    if (todos.length === 0) return;
    if (!window.confirm(`Delete all ${todos.length} todos?`)) return;
    const res = await fetch(API, { method: "DELETE" });
    if (res.ok) setTodos([]);
  }

  const remaining = todos.filter((t) => !t.completed).length;

  return (
    <div className="app">
      <header>
        <h1>📝 SQL Todo</h1>
        <p className="subtitle">React + Express + Node + SQLite</p>
      </header>

      <form className="create-form" onSubmit={createTodo}>
        <input
          type="text"
          value={text}
          placeholder="What needs to be done?"
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        <button type="submit" className="btn btn-create" disabled={!text.trim()}>
          + Create ToDo
        </button>
      </form>

      <div className="toolbar">
        <span className="count">
          {todos.length === 0
            ? "No todos yet"
            : `${remaining} of ${todos.length} remaining`}
        </span>
        <button
          className="btn btn-del-all"
          onClick={deleteAll}
          disabled={todos.length === 0}
        >
          🗑 DEL All
        </button>
      </div>

      {error && <p className="error">⚠️ {error}</p>}
      {loading ? (
        <p className="empty">Loading…</p>
      ) : todos.length === 0 && !error ? (
        <p className="empty">Your list is empty. Add your first todo above!</p>
      ) : (
        <ul className="todo-list">
          {todos.map((todo) => (
            <li key={todo.id} className={todo.completed ? "done" : ""}>
              <label className="todo-main">
                <input
                  type="checkbox"
                  checked={!!todo.completed}
                  onChange={() => toggleTodo(todo)}
                />
                <div className="todo-text">
                  <span className="text">{todo.text}</span>
                  <span className="timestamp">
                    Created {formatTimestamp(todo.created_at)}
                  </span>
                </div>
              </label>
              <button
                className="btn btn-del"
                onClick={() => deleteTodo(todo.id)}
                title="Delete this todo"
              >
                ✕ Del ToDo
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
