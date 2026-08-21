import { Toaster } from "@/components/ui/toaster"
import { lazy, Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';

const Pricing = lazy(() => import('@/pages/Pricing'));
const Landing = lazy(() => import('@/pages/Landing'));
const Login = lazy(() => import('@/pages/Login'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const AppLayout = lazy(() => import('@/components/layout/AppLayout'));
const RewardsProvider = lazy(() =>
  import('@/context/RewardsContext').then(module => ({ default: module.RewardsProvider }))
);
const AdminAudit = lazy(() => import('@/pages/AdminAudit'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const AdminObservability = lazy(() => import('@/pages/AdminObservability'));
const AdminPayments = lazy(() => import('@/pages/AdminPayments'));
const AdminUsers = lazy(() => import('@/pages/AdminUsers'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Subjects = lazy(() => import('@/pages/Subjects'));
const SubjectDetail = lazy(() => import('@/pages/SubjectDetail'));
const NewSubject = lazy(() => import('@/pages/NewSubject'));
const Documents = lazy(() => import('@/pages/Documents'));
const DocumentDetail = lazy(() => import('@/pages/DocumentDetail'));
const Quiz = lazy(() => import('@/pages/Quiz'));
const Profile = lazy(() => import('@/pages/Profile'));
const Leaderboard = lazy(() => import('@/pages/Leaderboard'));
const Competitions = lazy(() => import('@/pages/Competitions'));
const CompetitionDetail = lazy(() => import('@/pages/CompetitionDetail'));
const ErrorNotebook = lazy(() => import('@/pages/ErrorNotebook'));

const LoadingScreen = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
    <div className="w-8 h-8 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin"></div>
  </div>
);

// Rotas protegidas — redireciona nao autenticados para /login
const ProtectedRoutes = () => {
  const { isLoadingAuth, isAuthenticated } = useAuth();

  if (isLoadingAuth) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
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
    </Suspense>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            {/* Sempre pública — landing page independente de auth */}
            <Route path="/" element={<Suspense fallback={<LoadingScreen />}><Landing /></Suspense>} />
            {/* Rotas publicas */}
            <Route path="/login" element={<Suspense fallback={<LoadingScreen />}><Login /></Suspense>} />
            <Route path="/reset-password" element={<Suspense fallback={<LoadingScreen />}><ResetPassword /></Suspense>} />
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
