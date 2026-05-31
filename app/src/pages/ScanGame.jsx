import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import Layout from '../components/Layout';

export default function ScanGame() {
  const [image, setImage] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const takePhoto = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });
      setImage(`data:image/${photo.format};base64,${photo.base64String}`);
      processImage(photo.base64String);
    } catch (err) {
      if (err.message !== 'User cancelled photos app') {
        setError('Kamera konnte nicht geöffnet werden');
      }
    }
  };

  const pickFromGallery = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
      });
      setImage(`data:image/${photo.format};base64,${photo.base64String}`);
      processImage(photo.base64String);
    } catch (err) {
      if (err.message !== 'User cancelled photos app') {
        setError('Galerie konnte nicht geöffnet werden');
      }
    }
  };

  const processImage = async (base64) => {
    setParsing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('base64Image', `data:image/jpeg;base64,${base64}`);
      formData.append('language', 'ger');
      formData.append('isOverlayRequired', 'false');
      formData.append('OCREngine', '2');
      formData.append('isTable', 'true');

      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        headers: {
          'apikey': 'K85553388788957',
        },
        body: formData,
      });

      const data = await response.json();

      if (data.IsErroredOnProcessing) {
        setError('Texterkennung fehlgeschlagen. Bitte nochmal versuchen.');
        setParsing(false);
        return;
      }

      const text = data.ParsedResults?.[0]?.ParsedText || '';
      const parsed = parseScoreTable(text);
      setResults(parsed);
    } catch (err) {
      setError('Fehler bei der Texterkennung. Prüfe deine Internetverbindung.');
    }
    setParsing(false);
  };

  // Parse a Canasta score table with running totals
  const parseScoreTable = (text) => {
    const lines = text.split('\n').filter(l => l.trim());

    // Try to detect team names from header line
    let teamAName = 'Team A';
    let teamBName = 'Team B';

    // Look for header with letter combinations (e.g., "AL FK" or "AL  FK  AL  FK")
    const headerLine = lines.find(l => /[A-Za-z]{1,4}\s+[A-Za-z]{1,4}/.test(l) && !/\d{4}/.test(l));
    if (headerLine) {
      const names = headerLine.match(/[A-Za-zÄÖÜäöü]{1,10}/g);
      if (names && names.length >= 2) {
        teamAName = names[0];
        teamBName = names[1];
      }
    }

    // Extract all number pairs from lines (running totals)
    const runningTotals = [];
    for (const line of lines) {
      // Skip header lines (only letters, no long numbers)
      if (!/\d{3}/.test(line)) continue;

      // Extract all numbers from this line
      const numbers = line.match(/\d+/g);
      if (!numbers) continue;

      // Parse numbers, filter out very small ones (likely noise)
      const parsed = numbers.map(n => parseInt(n)).filter(n => n >= 100);

      // We expect pairs: first two numbers are the first column pair
      if (parsed.length >= 2) {
        // Take first two numbers as our pair for this row
        runningTotals.push({ totalA: parsed[0], totalB: parsed[1] });
      }
    }

    // Convert running totals to per-game scores (differences)
    const games = [];
    for (let i = 0; i < runningTotals.length; i++) {
      const curr = runningTotals[i];
      const prev = i > 0 ? runningTotals[i - 1] : { totalA: 0, totalB: 0 };

      let diffA = curr.totalA - prev.totalA;
      let diffB = curr.totalB - prev.totalB;

      // If differences are negative or unreasonably large, the totals might have reset
      // (new section on the page) — treat as absolute score
      if (diffA < -50000 || diffB < -50000) {
        // Likely a new column/section start — skip or treat first row as base
        continue;
      }

      // For the very first entry, if values are already large (>50000),
      // it's a continuation — we can only track from here
      if (i === 0 && (curr.totalA > 50000 || curr.totalB > 50000)) {
        // This is a running total sheet — we start tracking from row 1
        continue;
      }

      if (diffA !== 0 || diffB !== 0) {
        games.push({
          scoreA: diffA.toString(),
          scoreB: diffB.toString(),
          runningA: curr.totalA,
          runningB: curr.totalB,
        });
      }
    }

    return {
      teamAName,
      teamBName,
      games,
      runningTotals,
      rawText: text,
      isRunningTotal: runningTotals.length > 0 && runningTotals[0].totalA > 1000,
    };
  };

  const useResults = () => {
    if (results?.games?.length > 0) {
      // Navigate to NewGame with each game as a separate entry
      // For now, take the last game (most recent)
      navigate('/games/new', {
        state: {
          scannedRounds: results.games.map(g => ({
            scoreA: g.scoreA,
            scoreB: g.scoreB,
          })),
          teamNames: { a: results.teamAName, b: results.teamBName },
        }
      });
    }
  };

  const importAllGames = () => {
    if (results?.games?.length > 0) {
      navigate('/games/import', {
        state: {
          games: results.games,
          teamAName: results.teamAName,
          teamBName: results.teamBName,
        }
      });
    }
  };

  return (
    <Layout>
      <div className="page">
        <h1>📷 Tabelle scannen</h1>
        <p className="scan-description">
          Fotografiere eure Spieltabelle mit den laufenden Gesamtständen. Die App erkennt die Spalten und berechnet die Einzelergebnisse.
        </p>

        <div className="scan-buttons">
          <button className="btn-primary" onClick={takePhoto}>
            📸 Foto aufnehmen
          </button>
          <button className="btn-secondary btn-full" onClick={pickFromGallery}>
            🖼️ Aus Galerie wählen
          </button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        {parsing && (
          <div className="scan-loading">
            <p>🔍 Erkennt Tabelle...</p>
            <p className="scan-loading-hint">Kann einige Sekunden dauern</p>
          </div>
        )}

        {image && !parsing && (
          <div className="scan-preview">
            <img src={image} alt="Spieltabelle" />
          </div>
        )}

        {results && (
          <div className="scan-results">
            <div className="scan-teams-header">
              <span className="scan-team-badge team-a">{results.teamAName}</span>
              <span>vs</span>
              <span className="scan-team-badge team-b">{results.teamBName}</span>
            </div>

            <h3>{results.games.length} Spiele erkannt</h3>

            {results.games.length === 0 ? (
              <p className="scan-no-results">
                Keine Zahlen erkannt. Versuche ein schärferes Foto mit guter Beleuchtung.
              </p>
            ) : (
              <>
                <div className="scan-rounds">
                  <div className="scan-round-header">
                    <span>#</span>
                    <span>{results.teamAName}</span>
                    <span>{results.teamBName}</span>
                    <span>Sieger</span>
                  </div>
                  {results.games.map((g, i) => {
                    const a = parseInt(g.scoreA);
                    const b = parseInt(g.scoreB);
                    return (
                      <div key={i} className="scan-round-row">
                        <span className="scan-game-num">{i + 1}</span>
                        <span className={a > b ? 'scan-winner' : ''}>{a.toLocaleString('de-DE')}</span>
                        <span className={b > a ? 'scan-winner' : ''}>{b.toLocaleString('de-DE')}</span>
                        <span>{a > b ? '🅰️' : b > a ? '🅱️' : '🤝'}</span>
                      </div>
                    );
                  })}
                  <div className="scan-total-row">
                    <span>Σ</span>
                    <span>{results.games.reduce((s, g) => s + parseInt(g.scoreA), 0).toLocaleString('de-DE')}</span>
                    <span>{results.games.reduce((s, g) => s + parseInt(g.scoreB), 0).toLocaleString('de-DE')}</span>
                    <span></span>
                  </div>
                </div>

                <button className="btn-primary" onClick={useResults}>
                  ✅ Als Runden in neues Spiel übernehmen
                </button>
              </>
            )}

            <details className="scan-raw">
              <summary>Erkannter Rohtext</summary>
              <pre>{results.rawText}</pre>
            </details>
          </div>
        )}
      </div>
    </Layout>
  );
}
