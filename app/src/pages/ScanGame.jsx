import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import Layout from '../components/Layout';

export default function ScanGame() {
  const [image, setImage] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [tableMode, setTableMode] = useState('perRound'); // 'perRound' or 'runningTotal'
  const [startA, setStartA] = useState('');
  const [startB, setStartB] = useState('');
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
      const parsed = parseScoreTable(text, tableMode, parseInt(startA) || 0, parseInt(startB) || 0);
      setResults(parsed);
    } catch (err) {
      setError('Fehler bei der Texterkennung. Prüfe deine Internetverbindung.');
    }
    setParsing(false);
  };

  // Parse a Canasta score table
  const parseScoreTable = (text, mode, initialA = 0, initialB = 0) => {
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

    // Extract exactly 2 numbers per line (one per team)
    // Handles negative numbers (minus sign or em-dash before digits)
    const rows = [];
    for (const line of lines) {
      if (!/\d/.test(line)) continue;

      // Normalize dashes to minus sign, clean OCR artifacts
      let cleaned = line.replace(/[–—]/g, '-');
      // Only replace standalone O (not inside words) with 0
      cleaned = cleaned.replace(/(?<![A-Za-z])O(?![A-Za-z])/g, '0');
      // Remove dots/commas that might be thousand separators
      cleaned = cleaned.replace(/(\d)[.,](\d)/g, '$1$2');

      // Extract all numbers including negative ones
      const numMatches = [...cleaned.matchAll(/-?\s*\d+/g)].map(m => {
        const raw = m[0].replace(/\s+/g, '');
        return { num: parseInt(raw), raw: raw.replace('-', ''), pos: m.index };
      }).filter(n => !isNaN(n.num));

      if (numMatches.length === 2) {
        rows.push({
          valA: numMatches[0].num,
          valB: numMatches[1].num,
          rawA: numMatches[0].raw,
          rawB: numMatches[1].raw,
        });
      } else if (numMatches.length === 4) {
        // Likely 2 numbers split by space each (e.g., "170 980  141 945" → 170980, 141945)
        const mergedA = parseInt(numMatches[0].raw + numMatches[1].raw);
        const mergedB = parseInt(numMatches[2].raw + numMatches[3].raw);
        rows.push({
          valA: mergedA,
          valB: mergedB,
          rawA: numMatches[0].raw + numMatches[1].raw,
          rawB: numMatches[2].raw + numMatches[3].raw,
        });
      } else if (numMatches.length === 3) {
        // One number might be split: try both split options
        // Option A: first two merge, third standalone
        const mergeAB = parseInt(numMatches[0].raw + numMatches[1].raw);
        // Option B: first standalone, last two merge
        const mergeBC = parseInt(numMatches[1].raw + numMatches[2].raw);
        // Use gap between numbers to decide: larger gap = column separator
        const gap1 = numMatches[1].pos - (numMatches[0].pos + numMatches[0].raw.length);
        const gap2 = numMatches[2].pos - (numMatches[1].pos + numMatches[1].raw.length);
        if (gap1 < gap2) {
          // gap between 1&2 is smaller → they belong together
          rows.push({ valA: mergeAB, valB: numMatches[2].num, rawA: numMatches[0].raw + numMatches[1].raw, rawB: numMatches[2].raw });
        } else {
          // gap between 2&3 is smaller → they belong together
          rows.push({ valA: numMatches[0].num, valB: mergeBC, rawA: numMatches[0].raw, rawB: numMatches[1].raw + numMatches[2].raw });
        }
      } else if (numMatches.length > 4) {
        // Many fragments — try to split into 2 halves and merge each
        const mid = Math.floor(numMatches.length / 2);
        const leftRaw = numMatches.slice(0, mid).map(n => n.raw).join('');
        const rightRaw = numMatches.slice(mid).map(n => n.raw).join('');
        const leftNum = parseInt(leftRaw);
        const rightNum = parseInt(rightRaw);
        if (!isNaN(leftNum) && !isNaN(rightNum)) {
          rows.push({ valA: leftNum, valB: rightNum, rawA: leftRaw, rawB: rightRaw });
        }
      }
    }

    if (rows.length === 0) {
      return { teamAName, teamBName, games: [], runningTotals: [], rawText: text, isRunningTotal: false };
    }

    // Use user-selected mode
    const isRunningTotal = mode === 'runningTotal';

    const games = [];

    if (isRunningTotal) {
      // Values are cumulative — compute differences
      const corrected = rows.map(row => ({
        totalA: roundToCanasta(row.valA),
        totalB: roundToCanasta(row.valB),
        rawA: row.rawA,
        rawB: row.rawB,
      }));

      // Auto-detect starting base: if no manual start was given and first row
      // is already way above MAX_ROUND_SCORE, use first row as baseline
      let baseA = initialA;
      let baseB = initialB;
      let startIdx = 0;

      if (initialA === 0 && initialB === 0 && corrected.length > 0) {
        const firstA = corrected[0].totalA;
        const firstB = corrected[0].totalB;
        if (firstA > MAX_ROUND_SCORE || firstB > MAX_ROUND_SCORE) {
          // First row is the starting score, actual rounds start from row 2
          baseA = firstA;
          baseB = firstB;
          startIdx = 1;
        }
      }

      for (let i = startIdx; i < corrected.length; i++) {
        const curr = corrected[i];
        const prev = i > startIdx ? corrected[i - 1] : { totalA: baseA, totalB: baseB };

        let diffA = curr.totalA - prev.totalA;
        let diffB = curr.totalB - prev.totalB;

        // Fix 1/7 OCR confusion
        if ((diffA < 0 || diffA > MAX_ROUND_SCORE) && curr.rawA) {
          const variants = fix17Variants(curr.rawA);
          for (const v of variants) {
            const c = roundToCanasta(v);
            const d = c - prev.totalA;
            if (d >= 0 && d <= MAX_ROUND_SCORE) { curr.totalA = c; diffA = d; break; }
          }
        }
        if ((diffB < 0 || diffB > MAX_ROUND_SCORE) && curr.rawB) {
          const variants = fix17Variants(curr.rawB);
          for (const v of variants) {
            const c = roundToCanasta(v);
            const d = c - prev.totalB;
            if (d >= 0 && d <= MAX_ROUND_SCORE) { curr.totalB = c; diffB = d; break; }
          }
        }

        // Skip impossible rows
        if (Math.abs(diffA) > MAX_ROUND_SCORE || Math.abs(diffB) > MAX_ROUND_SCORE) continue;

        diffA = roundToCanasta(diffA);
        diffB = roundToCanasta(diffB);

        if (diffA !== 0 || diffB !== 0) {
          games.push({ scoreA: diffA.toString(), scoreB: diffB.toString() });
        }
      }
    } else {
      // Values are per-round scores — use directly
      for (const row of rows) {
        let scoreA = roundToCanasta(row.valA);
        let scoreB = roundToCanasta(row.valB);

        // Skip impossible single-round scores
        if (Math.abs(scoreA) > MAX_ROUND_SCORE || Math.abs(scoreB) > MAX_ROUND_SCORE) continue;

        if (scoreA !== 0 || scoreB !== 0) {
          games.push({ scoreA: scoreA.toString(), scoreB: scoreB.toString() });
        }
      }
    }

    return {
      teamAName,
      teamBName,
      games,
      runningTotals: rows,
      rawText: text,
      isRunningTotal,
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
          Fotografiere eure Spieltabelle. Wähle vorher den Tabellentyp.
        </p>

        <div className="chart-toggle" style={{ marginBottom: '1rem' }}>
          <button
            className={`toggle-btn ${tableMode === 'perRound' ? 'toggle-active' : ''}`}
            onClick={() => setTableMode('perRound')}
          >
            Pro Runde
          </button>
          <button
            className={`toggle-btn ${tableMode === 'runningTotal' ? 'toggle-active' : ''}`}
            onClick={() => setTableMode('runningTotal')}
          >
            Laufende Summe
          </button>
        </div>

        {tableMode === 'runningTotal' && (
          <div className="start-scores" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>Vorstand Team A</label>
              <input
                type="number"
                placeholder="0"
                value={startA}
                onChange={(e) => setStartA(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>Vorstand Team B</label>
              <input
                type="number"
                placeholder="0"
                value={startB}
                onChange={(e) => setStartB(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        )}

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
