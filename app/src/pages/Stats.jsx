import { useEffect } from 'react';
import useGameStore from '../store/gameStore';
import Layout from '../components/Layout';

export default function Stats() {
  const { stats, rankings, funStats, fetchStats, loading } = useGameStore();

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <Layout>
      <div className="page">
        <h1>📊 Statistik</h1>

        {loading && <p className="loading">Lädt...</p>}

        {stats && (
          <div className="stats-overview">
            <div className="stat-card">
              <span className="stat-value">{stats.totalGames || 0}</span>
              <span className="stat-label">Spiele</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.totalRounds || 0}</span>
              <span className="stat-label">Runden</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.totalPlayers || 0}</span>
              <span className="stat-label">Spieler</span>
            </div>
          </div>
        )}

        {rankings.length > 0 && (
          <div className="section">
            <h2>🏆 Rangliste</h2>
            <div className="rankings-list">
              {rankings.map((player, index) => (
                <div key={player.id} className="card ranking-card">
                  <span className="rank">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </span>
                  <span className="ranking-name">{player.name}</span>
                  <div className="ranking-stats">
                    <span className="wins">{player.wins}W</span>
                    <span className="losses">{player.losses}L</span>
                    <span className="winrate">
                      {player.wins + player.losses > 0
                        ? Math.round((player.wins / (player.wins + player.losses)) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {funStats && (
          <div className="section">
            <h2>🎉 Fun Stats</h2>
            <div className="fun-stats">
              {funStats.highestScore && (
                <div className="card fun-card">
                  <span className="fun-icon">🚀</span>
                  <span className="fun-text">
                    Höchste Punktzahl: <strong>{funStats.highestScore.score}</strong>
                    {funStats.highestScore.player && ` (${funStats.highestScore.player})`}
                  </span>
                </div>
              )}
              {funStats.longestGame && (
                <div className="card fun-card">
                  <span className="fun-icon">⏱️</span>
                  <span className="fun-text">
                    Längstes Spiel: <strong>{funStats.longestGame.rounds} Runden</strong>
                  </span>
                </div>
              )}
              {funStats.winStreak && (
                <div className="card fun-card">
                  <span className="fun-icon">🔥</span>
                  <span className="fun-text">
                    Längste Siegesserie: <strong>{funStats.winStreak.count}</strong>
                    {funStats.winStreak.player && ` (${funStats.winStreak.player})`}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && !stats && (
          <div className="empty-state">
            <p>Noch keine Statistiken vorhanden.</p>
            <p>Spiele ein paar Runden Canasta!</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
