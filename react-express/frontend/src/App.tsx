import { useState, useEffect, type FC } from "react";
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import { Login } from "./Login";
import { Register } from "./Register";
import { Todo } from "./Todo";

const PublicRoute: FC<{ isAuth: boolean }> = ({ isAuth }) =>
  isAuth ? <Navigate to="/todo" /> : <Outlet />;

const PrivateRoute: FC<{ isAuth: boolean }> = ({ isAuth }) =>
  isAuth ? <Outlet /> : <Navigate to="/login" />;


export const App = () => {
  const [isAuth, setIsAuth] = useState<"loading" | "ok" | "fail">("loading");

  useEffect(() => {
    fetch("http://localhost:3000/api/auth/me", {
      credentials: "include",
    })
      .then((res) => {
        if (res.ok) setIsAuth("ok");
        else setIsAuth("fail");
      })
      .catch(() => setIsAuth("fail"));
  }, []);

  if (isAuth === "loading") {
    return <div>Loading...</div>; 
  }

  const authenticated = isAuth === "ok";

  const setAuth = (val: boolean) => setIsAuth(val ? "ok" : "fail");

  const router = createBrowserRouter([
    {
      element: <PublicRoute isAuth={authenticated} />,
      children: [
        { path: "/login", element: <Login setIsAuth={setAuth} /> },
        { path: "/register", element: <Register /> },
      ],
    },
    {
      element: <PrivateRoute isAuth={authenticated} />,
      children: [
        { path: "/todo", element: <Todo setIsAuth={setAuth} /> },
      ],
    },
    { path: "/", element: <Navigate to="/todo" /> },
  ]);

  return <RouterProvider router={router} />;
};