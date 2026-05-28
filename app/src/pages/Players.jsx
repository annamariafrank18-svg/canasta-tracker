import { useEffect, useState } from 'react';
import useGameStore from '../store/gameStore';
import Layout from '../components/Layout';

export default function Players() {
  const { players, fetchPlayers, addPlayer, deletePlayer } = useGameStore();
  const [name, setName] = useState('');

  useEffect(() => {
    fetchPlayers();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const success = await addPlayer(name.trim());
    if (success) setName('');
  };

  return (
    <Layout>
      <div className="page">
        <h1>👥 Spieler</h1>

        <form onSubmit={handleAdd} className="add-form">
          <input
            type="text"
            placeholder="Neuer Spieler..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="btn-primary btn-sm">+</button>
        </form>

        <div className="players-list">
          {players.map((player) => (
            <div key={player.id} className="card player-card">
              <span className="player-name">{player.name}</span>
              <button
                className="btn-delete"
                onClick={() => { if (confirm(`${player.name} löschen?`)) deletePlayer(player.id); }}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>

        {players.length === 0 && (
          <div className="empty-state">
            <p>Noch keine Spieler angelegt.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
