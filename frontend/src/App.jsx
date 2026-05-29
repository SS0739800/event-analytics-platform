import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardPage from './pages/DashboardPage'
import CalendarPage from './pages/CalendarPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
        <Route path="/*"        element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
