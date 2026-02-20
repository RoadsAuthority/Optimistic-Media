
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

import Index from "./pages/Index";
import Login from "./pages/Login";
import LeaveRequest from "./pages/LeaveRequest";

import MyLeaves from "./pages/MyLeaves";
import Calendar from "./pages/Calendar";
import Approvals from "./pages/Approvals";
import Team from "./pages/Team";
import AuditLog from "./pages/AuditLog";
import Employees from "./pages/Employees";
import LeaveTypes from "./pages/LeaveTypes";
import Reports from "./pages/Reports";
import AcceptInvitePage from "./pages/AcceptInvite";

import NotFound from "./pages/NotFound";
import AdminPage from "./pages/Admin";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

import { queryClient } from "@/lib/queryClient";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/accept-invite" element={<AcceptInvitePage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Index />} />
              <Route path="/request" element={<LeaveRequest />} />
              <Route path="/my-leaves" element={<MyLeaves />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/approvals" element={<Approvals />} />
              <Route path="/team" element={<Team />} />
              <Route path="/audit-log" element={<AuditLog />} />

              <Route path="/employees" element={<Employees />} />
              <Route path="/leave-types" element={<LeaveTypes />} />
              <Route path="/reports" element={<Reports />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
