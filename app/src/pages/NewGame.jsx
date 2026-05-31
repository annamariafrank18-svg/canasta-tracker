import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useGameStore from '../store/gameStore';
import Layout from '../components/Layout';

export default function NewGame() {
  const { players, fetchPlayers, createGame, draft, updateDraft, resetDraft } = useGameStore();
  const navigate = useNavigate();
  const location = useLocation();

  const scannedRounds = location.state?.scannedRounds;
  const teamNames = location.state?.teamNames;

  const [submitting, setSubmitting] = useState(false);

  // Load scanned rounds into draft when navigating from scan page
  useEffect(() => {
    if (scannedRounds && scannedRounds.length > 0) {
      updateDraft({ rounds: scannedRounds });
      // Clear location state so it doesn't re-apply on re-render
      window.history.replaceState({}, '');
    }
  }, [scannedRounds]);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const teamA = draft.teamA;
  const teamB = draft.teamB;
  const rounds = draft.rounds;
  const date = draft.date;

  const setTeamA = (val) => updateDraft({ teamA: val });
  const setTeamB = (val) => updateDraft({ teamB: val });
  const setRounds = (val) => updateDraft({ rounds: val });
  const setDate = (val) => updateDraft({ date: val });

  const togglePlayer = (playerId, team) => {
    if (team === 'A') {
      if (teamA.includes(playerId)) {
        setTeamA(teamA.filter(id => id !== playerId));
      } else {
        setTeamB(teamB.filter(id => id !== playerId));
        setTeamA([...teamA, playerId]);
      }
    } else {
      if (teamB.includes(playerId)) {
        setTeamB(teamB.filter(id => id !== playerId));
      } else {
        setTeamA(teamA.filter(id => id !== playerId));
        setTeamB([...teamB, playerId]);
      }
    }
  };

  const addRound = () => {
    setRounds([...rounds, { scoreA: '', scoreB: '' }]);
  };

  const removeRound = (index) => {
    if (rounds.length > 1) {
      setRounds(rounds.filter((_, i) => i !== index));
    }
  };

  const updateRound = (index, field, value) => {
    const updated = [...rounds];
    updated[index][field] = value;
    setRounds(updated);
  };

  const totalA = rounds.reduce((sum, r) => sum + (parseInt(r.scoreA) || 0), 0);
  const totalB = rounds.reduce((sum, r) => sum + (parseInt(r.scoreB) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (teamA.length === 0 || teamB.length === 0) {
      alert('Beide Teams brauchen mindestens einen Spieler!');
      return;
    }

    setSubmitting(true);
    const gameData = {
      date: new Date(date).toISOString(),
      teamAScore: totalA,
      teamBScore: totalB,
      teamAPlayers: teamA,
      teamBPlayers: teamB,
      rounds: rounds
        .filter(r => r.scoreA !== '' || r.scoreB !== '')
        .map((r, i) => ({
          teamAScore: parseInt(r.scoreA) || 0,
          teamBScore: parseInt(r.scoreB) || 0,
        })),
    };

    const success = await createGame(gameData);
    setSubmitting(false);
    if (success) {
      resetDraft();
      navigate('/');
    }
  };

  return (
    <Layout>
      <div className="page">
        <h1>➕ Neues Spiel</h1>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Datum</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="teams-selection">
            <div className="team-section">
              <h3>Team A</h3>
              <div className="player-chips">
                {players.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    className={`chip ${teamA.includes(p.id) ? 'chip-active-a' : ''}`}
                    onClick={() => togglePlayer(p.id, 'A')}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="team-section">
              <h3>Team B</h3>
              <div className="player-chips">
                {players.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    className={`chip ${teamB.includes(p.id) ? 'chip-active-b' : ''}`}
                    onClick={() => togglePlayer(p.id, 'B')}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounds-section">
            <div className="rounds-header">
              <h3>Runden ({rounds.length})</h3>
              <button type="button" className="btn-secondary btn-sm" onClick={addRound}>
                + Runde
              </button>
            </div>

            {rounds.map((round, i) => (
              <div key={i} className="round-row">
                <span className="round-label">R{i + 1}</span>
                <input
                  type="number"
                  placeholder="Team A"
                  value={round.scoreA}
                  onChange={(e) => updateRound(i, 'scoreA', e.target.value)}
                />
                <span className="round-separator">:</span>
                <input
                  type="number"
                  placeholder="Team B"
                  value={round.scoreB}
                  onChange={(e) => updateRound(i, 'scoreB', e.target.value)}
                />
                {rounds.length > 1 && (
                  <button type="button" className="btn-delete-sm" onClick={() => removeRound(i)}>✕</button>
                )}
              </div>
            ))}

            <div className="total-row">
              <span>Gesamt:</span>
              <span className="total-score">{totalA} : {totalB}</span>
            </div>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary btn-lg">
            {submitting ? 'Speichert...' : 'Spiel speichern'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
