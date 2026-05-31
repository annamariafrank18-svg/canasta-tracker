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

    // --- Canasta score correction helpers ---

    // All Canasta scores end in 0 or 5
    const roundToCanasta = (n) => {
      const sign = n < 0 ? -1 : 1;
      const abs = Math.abs(n);
      const lastDigit = abs % 10;
      if (lastDigit === 0 || lastDigit === 5) return n;
      const rounded = lastDigit < 3 ? abs - lastDigit
        : lastDigit < 8 ? abs - lastDigit + 5
        : abs - lastDigit + 10;
      return sign * rounded;
    };

    // Try fixing 1/7 OCR confusion — returns all number variants
    const fix17Variants = (numStr) => {
      const variants = new Set([parseInt(numStr)]);
      for (let i = 0; i < numStr.length; i++) {
        if (numStr[i] === '1') {
          variants.add(parseInt(numStr.slice(0, i) + '7' + numStr.slice(i + 1)));
        } else if (numStr[i] === '7') {
          variants.add(parseInt(numStr.slice(0, i) + '1' + numStr.slice(i + 1)));
        }
      }
      return [...variants];
    };

    const MAX_ROUND_SCORE = 5000;

    // Extract all number pairs from lines (running totals)
    const runningTotals = [];
    for (const line of lines) {
      if (!/\d{3}/.test(line)) continue;
      const numbers = line.match(/\d+/g);
      if (!numbers) continue;
      const parsed = numbers.map(n => parseInt(n)).filter(n => n >= 100);
      if (parsed.length >= 2) {
        runningTotals.push({ totalA: parsed[0], totalB: parsed[1], rawA: numbers[0], rawB: numbers[1] });
      }
    }

    // Apply Canasta rounding to running totals
    const correctedTotals = runningTotals.map(row => ({
      totalA: roundToCanasta(row.totalA),
      totalB: roundToCanasta(row.totalB),
      rawA: row.rawA,
      rawB: row.rawB,
    }));

    // Convert running totals to per-round scores (differences)
    const games = [];
    for (let i = 0; i < correctedTotals.length; i++) {
      const curr = correctedTotals[i];
      const prev = i > 0 ? correctedTotals[i - 1] : { totalA: 0, totalB: 0 };

      let diffA = curr.totalA - prev.totalA;
      let diffB = curr.totalB - prev.totalB;

      if (diffA < -50000 || diffB < -50000) continue;
      if (i === 0 && (curr.totalA > 50000 || curr.totalB > 50000)) continue;

      // Fix 1/7 OCR confusion: if diff exceeds max, try swapping 1<->7
      if (Math.abs(diffA) > MAX_ROUND_SCORE && correctedTotals[i].rawA) {
        const variants = fix17Variants(correctedTotals[i].rawA);
        for (const v of variants) {
          const corrected = roundToCanasta(v);
          const testDiff = corrected - prev.totalA;
          if (testDiff >= 0 && testDiff <= MAX_ROUND_SCORE) {
            curr.totalA = corrected;
            diffA = testDiff;
            break;
          }
        }
      }

      if (Math.abs(diffB) > MAX_ROUND_SCORE && correctedTotals[i].rawB) {
        const variants = fix17Variants(correctedTotals[i].rawB);
        for (const v of variants) {
          const corrected = roundToCanasta(v);
          const testDiff = corrected - prev.totalB;
          if (testDiff >= 0 && testDiff <= MAX_ROUND_SCORE) {
            curr.totalB = corrected;
            diffB = testDiff;
            break;
          }
        }
      }

      // Ensure diffs are valid Canasta scores (end in 0 or 5)
      diffA = roundToCanasta(diffA);
      diffB = roundToCanasta(diffB);

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
