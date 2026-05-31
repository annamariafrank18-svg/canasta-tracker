import { NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function Layout({ children }) {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-container">
      <main className="app-main">{children}</main>
      <nav className="bottom-nav">
        <NavLink to="/" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <span className="nav-icon">🏠</span>
          <span>Home</span>
        </NavLink>
        <NavLink to="/games/new" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <span className="nav-icon">➕</span>
          <span>Manuell</span>
        </NavLink>
        <NavLink to="/games/scan" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <span className="nav-icon">📷</span>
          <span>Scannen</span>
        </NavLink>
        <NavLink to="/players" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <span className="nav-icon">👥</span>
          <span>Spieler</span>
        </NavLink>
        <NavLink to="/stats" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <span className="nav-icon">📊</span>
          <span>Statistik</span>
        </NavLink>
        <button onClick={handleLogout} className="nav-item nav-logout">
          <span className="nav-icon">🚪</span>
          <span>Logout</span>
        </button>
      </nav>
    </div>
  );
}
