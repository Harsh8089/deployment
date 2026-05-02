import express, { type NextFunction } from "express";
import cors from "cors";
import jwt, { type JwtPayload } from "jsonwebtoken";
import cookieParser from "cookie-parser";

const JWT_SECRET = "secret123#";

const app = express();

app.use(express.json());
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(cookieParser());

const users: { id: number; username: string; password: string; }[] = [];

const todos: { id: number; title: string; description: string; userId: number; }[] = [];

const auth = (req: any, res: any, next: NextFunction) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: "Missing jwt token" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    const userDb = users.find(u => u.id === decoded.id);
    if (!userDb) {
      res.clearCookie('token');
      return res.status(401).json({ message: "User no longer exists" });
    }

    req.user = decoded; 
    next();             
  } catch (err) {
    return res.status(401).json({ message: "Invalid jwt token" });
  }
};

app.get("/health-check", (req, res) => {
  return res.status(200).send("OK");
});

app.get("/auth/me", auth, (req, res) => {
  res.json((req as any).user);
})

app.post("/register", (req, res) => {
  const { username, password } = req.body as { username: string, password: string };

  if(!username || !password) {
    return res.status(404).json({
      message: "Missing username / password"
    });
  }

  const userDb = users.find(u => u.username === username);
  if(userDb) {
    return res.status(404).json({
      message: "Username already exists"
    });
  }

  users.push({ id: users.length, username, password });

  return res.status(200).json({
    username,
    message: "Register successful"
  })
});

app.post("/login", (req, res) => {
  const { username, password } = req.body as { username: string, password: string };

  if(!username || !password) {
    return res.status(404).json({
      message: "Missing username / password"
    });
  }

  const userDb = users.find(u => u.username === username && u.password === password);
  if(!userDb) {
    return res.status(404).json({
      message: "User doesn't exist"
    });
  }

  const jwtToken = jwt.sign({ id: userDb.id, username: userDb.username }, JWT_SECRET);
  
  res.cookie("token", jwtToken, { maxAge: 5 * 60 * 1000, httpOnly: true, sameSite: "strict" });

  return res.status(200).json({
    message: "Login successful",
  });
});

app.post("/todo", auth, (req: any, res: any) => {
  const user = req.user;

  if(!user) {
    return res.status(400).json({
      message: "You need to login"
    });
  };

  const userDb = users.find(u => u.id === user.id);
  if(!userDb) {
    return res.status(404).json({
      message: "No user found"
    });
  }
  
  const { title, description } = req.body as { title: string, description: string };
  if(!title) {
    return res.status(404).json({
      message: "Missing title"
    });
  }

  const todo = { id: todos.length, title, description, userId: userDb.id };

  todos.push(todo);

  return res.status(200).json({
    message: "Todo published",
    todo,
  })
});

app.get("/todos", auth, (req, res) => {
  const user = (req as any).user;

  if(!user) {
    return res.status(400).json({
      message: "You need to login"
    });
  };

  const userDb = users.find(u => u.id === user.id);
  if(!userDb) {
    return res.status(404).json({
      message: "No user found"
    });
  }

  const todosDb = todos.filter(t => t.userId === userDb.id);
  
  return res.status(200).json({
    todos: todosDb
  });
});

app.patch("/todo/:id", auth, (req, res) => {
  const user = (req as any).user;

  if(!user) {
    return res.status(400).json({
      message: "You need to login"
    });
  };

  const userDb = users.find(u => u.id === user.id);
  if(!userDb) {
    return res.status(404).json({
      message: "No user found"
    });
  };

  const id = parseInt(req.params?.id);

  if(!id) {
    return res.status(404).json({
      message: "Todo Id missing for update"
    })
  }

  const { title, description } = req.body as { title: string, description: string };
  if(!title || !description) {
    return res.status(404).json({
      message: "Missing title or description"
    });
  }

  const todoDb = todos.find(t => t.id === id);

  if(!todoDb) {
    return res.status(404).json({
      message: "Incorrect todo Id for update"
    })
  }

  const todo = {
  ...todoDb,
  ...(title !== undefined && { title }),
  ...(description !== undefined && { description }),
};

  todos[id] = todo;
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server activated on port ${PORT}`);
});