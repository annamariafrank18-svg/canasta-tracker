import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useGameStore from '../store/gameStore';
import Layout from '../components/Layout';

export default function Home() {
  const { games, fetchGames, deleteGame, loading } = useGameStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchGames();
  }, []);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <h1>🃏 Spiele</h1>
          <button className="btn-primary btn-sm" onClick={() => navigate('/games/new')}>
            + Neues Spiel
          </button>
        </div>

        {loading && <p className="loading">Lädt...</p>}

        {!loading && games.length === 0 && (
          <div className="empty-state">
            <p>Noch keine Spiele erfasst.</p>
            <p>Starte dein erstes Spiel!</p>
          </div>
        )}

        <div className="games-list">
          {games.map((game) => (
            <div key={game.id} className="card game-card">
              <div className="game-card-header">
                <span className="game-date">{formatDate(game.date)}</span>
                <button
                  className="btn-delete"
                  onClick={() => { if (confirm('Spiel löschen?')) deleteGame(game.id); }}
                >
                  🗑️
                </button>
              </div>
              <div className="game-teams">
                <div className={`team ${game.teamAScore > game.teamBScore ? 'winner' : ''}`}>
                  <span className="team-label">Team A</span>
                  <span className="team-score">{game.teamAScore}</span>
                  <div className="team-players">
                    {game.players?.filter(tp => tp.team === 'A').map(tp => (
                      <span key={tp.id} className="player-tag">{tp.player?.name}</span>
                    ))}
                  </div>
                </div>
                <div className="vs">VS</div>
                <div className={`team ${game.teamBScore > game.teamAScore ? 'winner' : ''}`}>
                  <span className="team-label">Team B</span>
                  <span className="team-score">{game.teamBScore}</span>
                  <div className="team-players">
                    {game.players?.filter(tp => tp.team === 'B').map(tp => (
                      <span key={tp.id} className="player-tag">{tp.player?.name}</span>
                    ))}
                  </div>
                </div>
              </div>
              {game.rounds?.length > 0 && (
                <div className="game-rounds-summary">
                  {game.rounds.length} Runde{game.rounds.length > 1 ? 'n' : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
