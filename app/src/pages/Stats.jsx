import { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import useGameStore from '../store/gameStore';
import Layout from '../components/Layout';

const COLORS = ['#e94560', '#4ecdc4', '#feca57', '#a855f7', '#3b82f6', '#f97316', '#10b981', '#ec4899'];

// Create a stable team key from player names (sorted alphabetically)
function getTeamKey(players) {
  return players.map(p => p.name).sort().join(' & ');
}

export default function Stats() {
  const { stats, funStats, fetchStats, games, fetchGames, loading } = useGameStore();
  const [chartMode, setChartMode] = useState('games'); // 'games' or 'rounds'

  useEffect(() => {
    fetchStats();
    fetchGames();
  }, []);

  // Compute team-based stats
  const teamStats = useMemo(() => {
    if (!games || games.length === 0) return { chartData: [], teams: [], rankings: [], funStats: [] };

    const sorted = [...games].sort((a, b) => new Date(a.date) - new Date(b.date));
    const teamTotals = {}; // cumulative scores
    const teamRecords = {}; // wins/losses

    const chartData = sorted.map((game, idx) => {
      const point = {
        game: idx + 1,
        date: new Date(game.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
      };

      const gamePlayers = game.players || [];
      const teamAPlayers = gamePlayers.filter(tp => tp.team === 'A').map(tp => tp.player).filter(Boolean);
      const teamBPlayers = gamePlayers.filter(tp => tp.team === 'B').map(tp => tp.player).filter(Boolean);

      if (teamAPlayers.length === 0 || teamBPlayers.length === 0) return point;

      const teamAKey = getTeamKey(teamAPlayers);
      const teamBKey = getTeamKey(teamBPlayers);

      // Initialize
      if (!teamTotals[teamAKey]) teamTotals[teamAKey] = 0;
      if (!teamTotals[teamBKey]) teamTotals[teamBKey] = 0;
      if (!teamRecords[teamAKey]) teamRecords[teamAKey] = { wins: 0, losses: 0, points: 0 };
      if (!teamRecords[teamBKey]) teamRecords[teamBKey] = { wins: 0, losses: 0, points: 0 };

      // Add scores
      teamTotals[teamAKey] += (game.teamAScore || 0);
      teamTotals[teamBKey] += (game.teamBScore || 0);
      teamRecords[teamAKey].points += (game.teamAScore || 0);
      teamRecords[teamBKey].points += (game.teamBScore || 0);

      // Win/Loss
      if ((game.teamAScore || 0) > (game.teamBScore || 0)) {
        teamRecords[teamAKey].wins++;
        teamRecords[teamBKey].losses++;
      } else if ((game.teamBScore || 0) > (game.teamAScore || 0)) {
        teamRecords[teamBKey].wins++;
        teamRecords[teamAKey].losses++;
      }

      // Add all teams to chart point
      Object.keys(teamTotals).forEach(key => {
        point[key] = teamTotals[key];
      });

      return point;
    });

    const teams = Object.keys(teamTotals);
    const rankings = Object.entries(teamRecords)
      .map(([name, record]) => ({ name, ...record }))
      .sort((a, b) => b.wins - a.wins || a.losses - b.losses);

    // Fun Stats (computed from games)
    const funStats = [];

    if (sorted.length > 0) {
      // Highest single-game score
      let highScore = 0, highScoreTeam = '';
      sorted.forEach(game => {
        const gamePlayers = game.players || [];
        const teamAP = gamePlayers.filter(tp => tp.team === 'A').map(tp => tp.player?.name).filter(Boolean);
        const teamBP = gamePlayers.filter(tp => tp.team === 'B').map(tp => tp.player?.name).filter(Boolean);
        if ((game.teamAScore || 0) > highScore) {
          highScore = game.teamAScore;
          highScoreTeam = teamAP.sort().join(' & ');
        }
        if ((game.teamBScore || 0) > highScore) {
          highScore = game.teamBScore;
          highScoreTeam = teamBP.sort().join(' & ');
        }
      });
      if (highScore > 0) {
        funStats.push({ icon: '🚀', label: 'Höchste Punktzahl', value: `${highScore.toLocaleString('de-DE')} (${highScoreTeam})` });
      }

      // Closest game (smallest difference)
      let closestDiff = Infinity, closestDate = '';
      sorted.forEach(game => {
        const diff = Math.abs((game.teamAScore || 0) - (game.teamBScore || 0));
        if (diff < closestDiff && diff > 0) {
          closestDiff = diff;
          closestDate = new Date(game.date).toLocaleDateString('de-DE');
        }
      });
      if (closestDiff < Infinity) {
        funStats.push({ icon: '😰', label: 'Knappstes Spiel', value: `${closestDiff} Pkt. Unterschied (${closestDate})` });
      }

      // Biggest blowout
      let biggestDiff = 0, biggestWinner = '';
      sorted.forEach(game => {
        const diff = Math.abs((game.teamAScore || 0) - (game.teamBScore || 0));
        if (diff > biggestDiff) {
          biggestDiff = diff;
          const gamePlayers = game.players || [];
          const winner = (game.teamAScore || 0) > (game.teamBScore || 0) ? 'A' : 'B';
          const winnerPlayers = gamePlayers.filter(tp => tp.team === winner).map(tp => tp.player?.name).filter(Boolean);
          biggestWinner = winnerPlayers.sort().join(' & ');
        }
      });
      if (biggestDiff > 0) {
        funStats.push({ icon: '💥', label: 'Größter Sieg', value: `+${biggestDiff.toLocaleString('de-DE')} Pkt. (${biggestWinner})` });
      }

      // Longest game (most rounds)
      let maxRounds = 0, maxRoundsDate = '';
      sorted.forEach(game => {
        const rounds = game.rounds?.length || 0;
        if (rounds > maxRounds) {
          maxRounds = rounds;
          maxRoundsDate = new Date(game.date).toLocaleDateString('de-DE');
        }
      });
      if (maxRounds > 0) {
        funStats.push({ icon: '⏱️', label: 'Längstes Spiel', value: `${maxRounds} Runden (${maxRoundsDate})` });
      }

      // Win streak per team
      let bestStreak = 0, bestStreakTeam = '';
      const teamStreaks = {};
      sorted.forEach(game => {
        const gamePlayers = game.players || [];
        const teamAP = gamePlayers.filter(tp => tp.team === 'A').map(tp => tp.player?.name).filter(Boolean).sort().join(' & ');
        const teamBP = gamePlayers.filter(tp => tp.team === 'B').map(tp => tp.player?.name).filter(Boolean).sort().join(' & ');
        const winnerKey = (game.teamAScore || 0) > (game.teamBScore || 0) ? teamAP : teamBP;
        const loserKey = (game.teamAScore || 0) > (game.teamBScore || 0) ? teamBP : teamAP;

        if (winnerKey) {
          teamStreaks[winnerKey] = (teamStreaks[winnerKey] || 0) + 1;
          if (teamStreaks[winnerKey] > bestStreak) {
            bestStreak = teamStreaks[winnerKey];
            bestStreakTeam = winnerKey;
          }
        }
        if (loserKey) teamStreaks[loserKey] = 0;
      });
      if (bestStreak >= 2) {
        funStats.push({ icon: '🔥', label: 'Längste Siegesserie', value: `${bestStreak} Spiele (${bestStreakTeam})` });
      }
    }

    return { chartData, teams, rankings, funStats };
  }, [games]);

  // Round-by-round chart data
  const roundChartData = useMemo(() => {
    if (!games || games.length === 0) return { data: [], teams: [] };
    const sorted = [...games].sort((a, b) => new Date(a.date) - new Date(b.date));
    const data = [];
    const teamSet = new Set();
    let roundIdx = 0;

    sorted.forEach((game, gIdx) => {
      const gamePlayers = game.players || [];
      const teamAPlayers = gamePlayers.filter(tp => tp.team === 'A').map(tp => tp.player).filter(Boolean);
      const teamBPlayers = gamePlayers.filter(tp => tp.team === 'B').map(tp => tp.player).filter(Boolean);
      if (teamAPlayers.length === 0 || teamBPlayers.length === 0) return;

      const teamAKey = getTeamKey(teamAPlayers);
      const teamBKey = getTeamKey(teamBPlayers);
      teamSet.add(teamAKey);
      teamSet.add(teamBKey);

      const rounds = game.rounds || [];
      if (rounds.length === 0) {
        // No round data, show game total as single point
        roundIdx++;
        const point = { round: roundIdx, label: `S${gIdx + 1}` };
        point[teamAKey] = game.teamAScore || 0;
        point[teamBKey] = game.teamBScore || 0;
        data.push(point);
      } else {
        rounds.forEach((r, rIdx) => {
          roundIdx++;
          const point = { round: roundIdx, label: `S${gIdx + 1}R${rIdx + 1}` };
          point[teamAKey] = r.teamAScore || 0;
          point[teamBKey] = r.teamBScore || 0;
          data.push(point);
        });
      }
    });

    return { data, teams: [...teamSet] };
  }, [games]);

  // Per-game total scores (non-cumulative)
  const gameScoresData = useMemo(() => {
    if (!games || games.length === 0) return { data: [], teams: [] };
    const sorted = [...games].sort((a, b) => new Date(a.date) - new Date(b.date));
    const teamSet = new Set();
    const data = sorted.map((game, idx) => {
      const point = {
        game: idx + 1,
        date: new Date(game.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
      };
      const gamePlayers = game.players || [];
      const teamAPlayers = gamePlayers.filter(tp => tp.team === 'A').map(tp => tp.player).filter(Boolean);
      const teamBPlayers = gamePlayers.filter(tp => tp.team === 'B').map(tp => tp.player).filter(Boolean);
      if (teamAPlayers.length === 0 || teamBPlayers.length === 0) return point;

      const teamAKey = getTeamKey(teamAPlayers);
      const teamBKey = getTeamKey(teamBPlayers);
      teamSet.add(teamAKey);
      teamSet.add(teamBKey);

      point[teamAKey] = game.teamAScore || 0;
      point[teamBKey] = game.teamBScore || 0;
      return point;
    });
    return { data, teams: [...teamSet] };
  }, [games]);

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
              <span className="stat-value">{teamStats.teams.length}</span>
              <span className="stat-label">Teams</span>
            </div>
          </div>
        )}

        {(teamStats.chartData.length > 1 || roundChartData.data.length > 0) && (
          <div className="section">
            <h2>📈 Punkteverlauf</h2>
            <div className="chart-toggle">
              <button
                className={`toggle-btn ${chartMode === 'games' ? 'toggle-active' : ''}`}
                onClick={() => setChartMode('games')}
              >
                Kumulativ
              </button>
              <button
                className={`toggle-btn ${chartMode === 'totals' ? 'toggle-active' : ''}`}
                onClick={() => setChartMode('totals')}
              >
                Pro Spiel
              </button>
              <button
                className={`toggle-btn ${chartMode === 'rounds' ? 'toggle-active' : ''}`}
                onClick={() => setChartMode('rounds')}
              >
                Pro Runde
              </button>
            </div>
            <div className="chart-container">
              {chartMode === 'games' ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={teamStats.chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip
                      contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }}
                      labelStyle={{ color: 'var(--text)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {teamStats.teams.map((team, i) => (
                      <Line
                        key={team}
                        type="monotone"
                        dataKey={team}
                        name={team}
                        stroke={COLORS[i % COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : chartMode === 'totals' ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={gameScoresData.data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip
                      contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }}
                      labelStyle={{ color: 'var(--text)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {gameScoresData.teams.map((team, i) => (
                      <Bar
                        key={team}
                        dataKey={team}
                        name={team}
                        fill={COLORS[i % COLORS.length]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={roundChartData.data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip
                      contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }}
                      labelStyle={{ color: 'var(--text)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {roundChartData.teams.map((team, i) => (
                      <Line
                        key={team}
                        type="monotone"
                        dataKey={team}
                        name={team}
                        stroke={COLORS[i % COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {teamStats.rankings.length > 0 && (
          <div className="section">
            <h2>🏆 Team-Rangliste</h2>
            <div className="rankings-list">
              {teamStats.rankings.map((team, index) => (
                <div key={team.name} className="card ranking-card">
                  <span className="rank">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </span>
                  <div className="ranking-team-info">
                    <span className="ranking-name">{team.name}</span>
                    <span className="ranking-points">{team.points.toLocaleString('de-DE')} Pkt.</span>
                  </div>
                  <div className="ranking-stats">
                    <span className="wins">{team.wins}S</span>
                    <span className="losses">{team.losses}N</span>
                    <span className="winrate">
                      {team.wins + team.losses > 0
                        ? Math.round((team.wins / (team.wins + team.losses)) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {teamStats.funStats.length > 0 && (
          <div className="section">
            <h2>🎉 Fun Stats</h2>
            <div className="fun-stats">
              {teamStats.funStats.map((stat, i) => (
                <div key={i} className="card fun-card">
                  <span className="fun-icon">{stat.icon}</span>
                  <span className="fun-text">{stat.label}: <strong>{stat.value}</strong></span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && games.length === 0 && (
          <div className="empty-state">
            <p>Noch keine Statistiken vorhanden.</p>
            <p>Spiele ein paar Runden Canasta!</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
