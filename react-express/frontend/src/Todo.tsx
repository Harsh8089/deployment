import { useState, useEffect, type FC } from "react";

type Todo = {
  id: number;
  title: string;
  description: string;
};

export const Todo: FC<{ setIsAuth: (val: boolean) => void }> = ({ setIsAuth }) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const fetchTodos = async () => {
    const res = await fetch("/api/todos", {
      credentials: "include",
    });
    const data = await res.json();
    setTodos(data.todos);
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const handleCreate = async () => {
    if (!title) return;

    await fetch("/api/todo", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });

    setTitle("");
    setDescription("");
    fetchTodos();
  };

  const handleUpdate = async (id: number) => {
    await fetch(`/api/todo/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle, description: editDescription }),
    });

    setEditId(null);
    fetchTodos();
  };

  const handleLogout = async () => {
    await fetch("/api/logout", {
      method: "POST",
      credentials: "include",
    });
    setIsAuth(false);
  };

  return (
    <div>
      <div>
        <h1>Todos</h1>
        <button onClick={handleLogout}>Logout</button>
      </div>

      {/* Create Form */}
      <div>
        <h2>Add Todo</h2>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button onClick={handleCreate}>Add</button>
      </div>

      {/* Todo List */}
      <div>
        <h2>My Todos</h2>
        {todos.length === 0 && <p>No todos yet</p>}
        {todos.map((todo) => (
          <div key={todo.id}>
            {editId === todo.id ? (
              // Edit Mode
              <div>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
                <button onClick={() => handleUpdate(todo.id)}>Save</button>
                <button onClick={() => setEditId(null)}>Cancel</button>
              </div>
            ) : (
              // View Mode
              <div>
                <h3>{todo.title}</h3>
                <p>{todo.description}</p>
                <button onClick={() => {
                  setEditId(todo.id);
                  setEditTitle(todo.title);
                  setEditDescription(todo.description);
                }}>
                  Edit
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};