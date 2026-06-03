import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import Login from '@/pages/Login';
import ResetPassword from '@/pages/ResetPassword';
import Pricing from '@/pages/Pricing';
import AdminAudit from '@/pages/AdminAudit';
import AdminDashboard from '@/pages/AdminDashboard';
import AdminObservability from '@/pages/AdminObservability';
import AdminPayments from '@/pages/AdminPayments';
import AdminUsers from '@/pages/AdminUsers';
import Landing from '@/pages/Landing';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Subjects from '@/pages/Subjects';
import SubjectDetail from '@/pages/SubjectDetail';
import NewSubject from '@/pages/NewSubject';
import Documents from '@/pages/Documents';
import DocumentDetail from '@/pages/DocumentDetail';
import Quiz from '@/pages/Quiz';
import Profile from '@/pages/Profile';
import Leaderboard from '@/pages/Leaderboard';
import Competitions from '@/pages/Competitions';
import CompetitionDetail from '@/pages/CompetitionDetail';
import ErrorNotebook from '@/pages/ErrorNotebook';
import { RewardsProvider } from '@/context/RewardsContext';

// Rotas protegidas — redireciona nao autenticados para /login
const ProtectedRoutes = () => {
  const { isLoadingAuth, isAuthenticated } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <RewardsProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/subjects" element={<Subjects />} />
          <Route path="/subjects/new" element={<NewSubject />} />
          <Route path="/subjects/:id" element={<SubjectDetail />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/documents/:id" element={<DocumentDetail />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/competitions" element={<Competitions />} />
          <Route path="/competitions/:id" element={<CompetitionDetail />} />
          <Route path="/error-notebook" element={<ErrorNotebook />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/payments" element={<AdminPayments />} />
          <Route path="/admin/audit" element={<AdminAudit />} />
          <Route path="/admin/observability" element={<AdminObservability />} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </RewardsProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            {/* Sempre pública — landing page independente de auth */}
            <Route path="/" element={<Landing />} />
            {/* Rotas publicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            {/* Rotas protegidas */}
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
