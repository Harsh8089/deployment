import "dotenv/config";
import express, { type NextFunction } from "express";
import cors from "cors";
import jwt, { type JwtPayload } from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { PrismaClient } from "./generated/prisma/client.js";

const JWT_SECRET = process.env.JWT_SECRET!;

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const prisma = new PrismaClient();

const auth = async (req: any, res: any, next: NextFunction) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: "Missing jwt token" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    const userDb = await prisma.user.findUnique({
      where: {
        id: decoded.id
      }
    })

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

const router = express.Router();

router.get("/health-check", (_, res) => {
  return res.status(200).send("OK");
});

router.get("/auth/me", auth, (req, res) => {
  res.json((req as any).user);
})

router.post("/register", async (req, res) => {
  const { username, password } = req.body as { username: string, password: string };

  if(!username || !password) {
    return res.status(404).json({
      message: "Missing username / password"
    });
  }

  const userDb = await prisma.user.findUnique({
    where: {
      username
    }
  })

  if(userDb) {
    return res.status(404).json({
      message: "Username already exists"
    });
  }

  await prisma.user.create({
    data: { username, password }
  });

  return res.status(200).json({
    username,
    message: "Register successful"
  })
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body as { username: string, password: string };

  if(!username || !password) {
    return res.status(404).json({
      message: "Missing username / password"
    });
  }

  const userDb = await prisma.user.findFirst({
    where: { username, password }
  });

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

router.post("/todo", auth, async (req: any, res: any) => {
  const user = req.user;
  const { title, description } = req.body as { title: string, description: string };
  if(!title) {
    return res.status(404).json({
      message: "Missing title"
    });
  }

  const todo = await prisma.todo.create({
    data: {
      title,
      description,
      userId: user.id
    }
  });

  return res.status(200).json({
    message: "Todo published",
    todo,
  })
});

router.get("/todos", auth, async (req: any, res) => {
  const user = req.user;

  const todos = await prisma.todo.findMany({
    where: { userId: user.id }
  });

  res.json({ todos });
});

router.patch("/todo/:id", auth, async (req: any, res) => {
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

  const todoDb = await prisma.todo.findUnique({
    where: { id }
  });

  if(!todoDb) {
    return res.status(404).json({
      message: "Incorrect todo Id for update"
    })
  }

  const updated = await prisma.todo.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description })
    }
  });

  res.json({
    message: "Todo updated",
    todo: updated
  });
});

app.use("/api", router);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server activated on port ${PORT}`);
});