import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { Shell } from "./shell/Shell";
import { Login } from "./pages/Login";
import { Forgot } from "./pages/Forgot";
import { Setup } from "./pages/Setup";
import { needsSetup } from "./setup/setupStore";
import { Audit, Journal, Performance, Plan, Reports, Risk, Settings, Trading } from "./pages/Pages";
import { Dashboard } from "./pages/Dashboard";
import type { JSX } from "react";

function Guard({ children }: { children: JSX.Element }) {
  const { token } = useAuth();
  if (needsSetup()) return <Navigate to="/setup" replace />;
  return token ? children : <Navigate to="/login" replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/setup" element={<Setup />} />
      <Route path="/forgot-password" element={<Forgot />} />
      <Route
        path="/"
        element={
          <Guard>
            <Shell />
          </Guard>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="plan" element={<Plan />} />
        <Route path="trading" element={<Trading />} />
        <Route path="journal" element={<Journal />} />
        <Route path="performance" element={<Performance />} />
        <Route path="reports" element={<Reports />} />
        <Route path="risk" element={<Risk />} />
        <Route path="settings" element={<Settings />} />
        <Route path="audit" element={<Audit />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
