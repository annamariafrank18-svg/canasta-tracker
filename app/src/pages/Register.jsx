import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { register, loading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await register(name, email, password);
    if (success) navigate('/');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">🃏 Canasta Tracker</h1>
        <p className="auth-subtitle">Erstelle ein Konto</p>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Passwort (min. 6 Zeichen)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Lädt...' : 'Registrieren'}
          </button>
        </form>
        <p className="auth-link">
          Bereits ein Konto? <Link to="/login">Anmelden</Link>
        </p>
      </div>
    </div>
  );
}
