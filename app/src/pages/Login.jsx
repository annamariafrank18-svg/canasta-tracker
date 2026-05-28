import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [slowHint, setSlowHint] = useState(false);
  const { login, loading, error } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setSlowHint(true), 4000);
      return () => clearTimeout(timer);
    }
    setSlowHint(false);
  }, [loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) navigate('/');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">🃏 Canasta Tracker</h1>
        <p className="auth-subtitle">Melde dich an</p>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Verbindet...' : 'Anmelden'}
          </button>
          {slowHint && (
            <p className="slow-hint">Server wacht auf... kann bis zu 30s dauern ☕</p>
          )}
        </form>
        <p className="auth-link">
          Noch kein Konto? <Link to="/register">Registrieren</Link>
        </p>
      </div>
    </div>
  );
}
