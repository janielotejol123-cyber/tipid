import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import AppShell from './components/AppShell'
import { UpdateNotice } from './components/VersionInfo'
import { ErrorText, Spinner } from './components/ui'
import { AuthProvider, useAuth } from './lib/auth'
import { HouseholdProvider, useHousehold } from './lib/household'
import { supabase } from './lib/supabase'
import Add from './pages/Add'
import Bills from './pages/Bills'
import Budget from './pages/Budget'
import Family from './pages/Family'
import Goals from './pages/Goals'
import Home from './pages/Home'
import Join from './pages/Join'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Reports from './pages/Reports'
import ResetPassword from './pages/ResetPassword'
import Settings from './pages/Settings'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <UpdateNotice />
        <AuthGate />
      </BrowserRouter>
    </AuthProvider>
  )
}

function AuthGate() {
  const { session, loading, recovering } = useAuth()
  if (loading) return <Spinner />
  if (!session) return <Login />
  if (recovering) return <ResetPassword />
  return (
    <HouseholdProvider>
      <HouseholdGate />
    </HouseholdProvider>
  )
}

function HouseholdGate() {
  const { loading, error, data } = useHousehold()
  if (loading) return <Spinner />
  if (error) {
    return (
      <div className="max-w-md mx-auto p-6 space-y-4">
        <ErrorText>Couldn't load your data: {error}</ErrorText>
        <button className="btn-ghost w-full" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
    )
  }
  if (!data) {
    return (
      <Routes>
        <Route path="/join/:token" element={<Join />} />
        <Route path="*" element={<Onboarding />} />
      </Routes>
    )
  }
  return (
    <Routes>
      <Route path="/add" element={<Add />} />
      <Route path="/join/:token" element={<Join />} />
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="goals" element={<Goals />} />
        <Route path="bills" element={<Bills />} />
        <Route path="family" element={<Family />} />
        <Route path="reports" element={<Reports />} />
        <Route path="budget" element={<Budget />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
