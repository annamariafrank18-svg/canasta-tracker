import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Players from './pages/Players';
import NewGame from './pages/NewGame';
import ScanGame from './pages/ScanGame';
import Stats from './pages/Stats';

function PrivateRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  return token ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/players" element={<PrivateRoute><Players /></PrivateRoute>} />
        <Route path="/games/new" element={<PrivateRoute><NewGame /></PrivateRoute>} />
        <Route path="/games/scan" element={<PrivateRoute><ScanGame /></PrivateRoute>} />
        <Route path="/stats" element={<PrivateRoute><Stats /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
