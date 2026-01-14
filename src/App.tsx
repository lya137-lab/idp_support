import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import EmployeeDashboard from "./pages/employee/Dashboard";
import NewApplication from "./pages/employee/NewApplication";
import ApplicationList from "./pages/employee/ApplicationList";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ApprovalManagement from "./pages/admin/ApprovalManagement";
import SupportCriteria from "./pages/admin/SupportCriteria";
import IDPStatistics from "./pages/admin/IDPStatistics";
import Reports from "./pages/admin/Reports";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/" element={<Navigate to="/login" replace />} />

              {/* Employee Routes */}
              <Route path="/dashboard" element={<EmployeeDashboard />} />
              <Route path="/applications" element={<ApplicationList />} />
              <Route path="/applications/new" element={<NewApplication />} />

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/approvals" element={<ApprovalManagement />} />
              <Route path="/admin/criteria" element={<SupportCriteria />} />
              <Route path="/admin/statistics" element={<IDPStatistics />} />
              <Route path="/admin/reports" element={<Reports />} />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
