import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Analytics from './pages/Analytics.jsx';

function useAuth() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  return { token, user };
}

function Protected({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function Navbar() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  if (!token) return null;

  function logout() {
    localStorage.clear();
    navigate('/login');
  }

  return (
    <div className="navbar">
      <div>
        <Link to="/dashboard">Dashboard</Link>
        {(user?.role === 'approver' || user?.role === 'admin') && <Link to="/analytics">Analytics</Link>}
      </div>
      <div>
        <span style={{ marginRight: 12, fontSize: 13 }}>{user?.name} ({user?.role})</span>
        <button onClick={logout}>Logout</button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/analytics" element={<Protected><Analytics /></Protected>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}
