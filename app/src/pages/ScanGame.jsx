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
  const [editedGames, setEditedGames] = useState([]);
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
      setEditedGames(parsed.games.map(g => ({ scoreA: g.scoreA, scoreB: g.scoreB })));
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

    // Extract numbers from each line
    const rawLines = [];
    for (const line of lines) {
      if (!/\d/.test(line)) continue;

      // Normalize dashes to minus sign, clean OCR artifacts
      let cleaned = line.replace(/[–—]/g, '-');
      cleaned = cleaned.replace(/(?<![A-Za-z])O(?![A-Za-z])/g, '0');
      cleaned = cleaned.replace(/(\d)[.,](\d)/g, '$1$2');

      // Extract all number groups with positions
      const numMatches = [...cleaned.matchAll(/-?\s*\d+/g)].map(m => {
        const raw = m[0].replace(/\s+/g, '');
        return { num: parseInt(raw), raw: raw.replace(/^-/, ''), pos: m.index, neg: raw.startsWith('-') };
      }).filter(n => !isNaN(n.num));

      if (numMatches.length > 0) {
        rawLines.push(numMatches);
      }
    }

    // Merge all fragments into 2-number rows
    // Strategy: concatenate fragments on each line to form the expected column values
    const rows = [];
    let i = 0;
    while (i < rawLines.length) {
      const nums = rawLines[i];
      const allRaw = nums.map(n => n.raw).join('');
      const totalDigits = allRaw.length;

      if (nums.length === 2 && nums[0].raw.length >= 2 && nums[1].raw.length >= 1) {
        // Two numbers on the line — use directly (allows small scores like 80, -40)
        rows.push({ rawA: nums[0].raw, rawB: nums[1].raw, negA: nums[0].neg, negB: nums[1].neg });
        i++;
      } else if (nums.length === 1 && nums[0].raw.length >= 5) {
        // Single large number — might be missing the second column
        // Try merging with next line if it's also incomplete
        if (i + 1 < rawLines.length && rawLines[i + 1].length === 1) {
          rows.push({ rawA: nums[0].raw, rawB: rawLines[i + 1][0].raw, negA: nums[0].neg, negB: rawLines[i + 1][0].neg });
          i += 2;
        } else {
          // Skip single-column line (can't make a pair)
          i++;
        }
      } else if (totalDigits >= 8) {
        // Enough digits for two 4-6 digit numbers — split in half
        const mid = Math.ceil(nums.length / 2);
        const leftRaw = nums.slice(0, mid).map(n => n.raw).join('');
        const rightRaw = nums.slice(mid).map(n => n.raw).join('');
        if (leftRaw.length >= 3 && rightRaw.length >= 3) {
          rows.push({ rawA: leftRaw, rawB: rightRaw, negA: nums[0].neg, negB: false });
          i++;
        } else {
          i++;
        }
      } else if (totalDigits < 8 && i + 1 < rawLines.length) {
        // Too few digits — likely a split line, merge with next line
        const nextNums = rawLines[i + 1];
        const combined = [...nums, ...nextNums];
        const combinedRaw = combined.map(n => n.raw).join('');
        if (combinedRaw.length >= 8) {
          const mid = Math.ceil(combined.length / 2);
          const leftRaw = combined.slice(0, mid).map(n => n.raw).join('');
          const rightRaw = combined.slice(mid).map(n => n.raw).join('');
          rows.push({ rawA: leftRaw, rawB: rightRaw, negA: nums[0].neg, negB: false });
          i += 2;
        } else {
          i++;
        }
      } else {
        i++;
      }
    }

    if (rows.length === 0) {
      return { teamAName, teamBName, games: [], runningTotals: [], rawText: text, isRunningTotal: false };
    }

    // Use user-selected mode
    const isRunningTotal = mode === 'runningTotal';

    const games = [];

    if (isRunningTotal) {
      // --- Global column correction for systematic 1/7 OCR confusion ---
      const allLens = rows.map(r => r.rawA.length).concat(rows.map(r => r.rawB.length));
      allLens.sort((a, b) => a - b);
      const expectedLen = allLens[Math.floor(allLens.length / 2)];

      // Use first row to determine expected leading digit
      const firstA = rows[0].rawA;
      const firstB = rows[0].rawB;

      const correctedRows = rows.map(row => {
        let rawA = row.rawA;
        let rawB = row.rawB;

        // Fix leading digit: if first row starts with 1 and this starts with 7, swap
        if (firstA[0] === '1' && rawA[0] === '7') {
          rawA = '1' + rawA.slice(1);
        }
        if (firstB[0] === '1' && rawB[0] === '7') {
          rawB = '1' + rawB.slice(1);
        }

        // Fix wrong digit count: truncate to expected length if too long
        if (rawA.length > expectedLen) {
          rawA = rawA.slice(0, expectedLen);
        }
        if (rawB.length > expectedLen) {
          rawB = rawB.slice(0, expectedLen);
        }

        const numA = parseInt(rawA) || 0;
        const numB = parseInt(rawB) || 0;

        return {
          totalA: roundToCanasta(row.negA ? -numA : numA),
          totalB: roundToCanasta(row.negB ? -numB : numB),
          rawA,
          rawB,
        };
      });

      // Determine starting base
      let baseA = initialA;
      let baseB = initialB;
      let startIdx = 0;

      if (initialA === 0 && initialB === 0 && correctedRows.length > 0) {
        // No manual start → use first row as base if it's too large for a single round
        const fA = correctedRows[0].totalA;
        const fB = correctedRows[0].totalB;
        if (Math.abs(fA) > MAX_ROUND_SCORE || Math.abs(fB) > MAX_ROUND_SCORE) {
          baseA = fA;
          baseB = fB;
          startIdx = 1;
        }
      } else if (initialA !== 0 || initialB !== 0) {
        // Manual start given — skip first row if it matches the start scores (same data)
        if (correctedRows.length > 0) {
          const fA = correctedRows[0].totalA;
          const fB = correctedRows[0].totalB;
          if (Math.abs(fA - initialA) < 100 && Math.abs(fB - initialB) < 100) {
            startIdx = 1; // first OCR row = start scores, skip it
          }
        }
      }

      // Track last known-good values to prevent error cascading
      let lastGoodA = baseA;
      let lastGoodB = baseB;

      for (let i = startIdx; i < correctedRows.length; i++) {
        const curr = correctedRows[i];

        let diffA = curr.totalA - lastGoodA;
        let diffB = curr.totalB - lastGoodB;

        // Try 1/7 fixes at individual positions if diff is bad
        if (Math.abs(diffA) > MAX_ROUND_SCORE && curr.rawA) {
          const variants = fix17Variants(curr.rawA);
          for (const v of variants) {
            const c = roundToCanasta(v);
            const d = c - lastGoodA;
            if (Math.abs(d) <= MAX_ROUND_SCORE) { curr.totalA = c; diffA = d; break; }
          }
        }
        if (Math.abs(diffB) > MAX_ROUND_SCORE && curr.rawB) {
          const variants = fix17Variants(curr.rawB);
          for (const v of variants) {
            const c = roundToCanasta(v);
            const d = c - lastGoodB;
            if (Math.abs(d) <= MAX_ROUND_SCORE) { curr.totalB = c; diffB = d; break; }
          }
        }

        // Only include valid rounds (skip garbage OCR rows)
        const validA = Math.abs(diffA) <= MAX_ROUND_SCORE;
        const validB = Math.abs(diffB) <= MAX_ROUND_SCORE;

        if (validA && validB) {
          diffA = roundToCanasta(diffA);
          diffB = roundToCanasta(diffB);
          games.push({ scoreA: diffA.toString(), scoreB: diffB.toString() });
          // Update last good reference
          lastGoodA = curr.totalA;
          lastGoodB = curr.totalB;
        } else if (validA) {
          // Only A is valid — B is bad OCR, use A and set B to 0
          diffA = roundToCanasta(diffA);
          games.push({ scoreA: diffA.toString(), scoreB: '0' });
          lastGoodA = curr.totalA;
        } else if (validB) {
          // Only B is valid — A is bad OCR
          diffB = roundToCanasta(diffB);
          games.push({ scoreA: '0', scoreB: diffB.toString() });
          lastGoodB = curr.totalB;
        }
        // If both invalid → skip row entirely (bad OCR merge/fragment)
      }
    } else {
      // Values are per-round scores — use directly
      for (const row of rows) {
        const numA = parseInt(row.rawA) || 0;
        const numB = parseInt(row.rawB) || 0;
        let scoreA = roundToCanasta(row.negA ? -numA : numA);
        let scoreB = roundToCanasta(row.negB ? -numB : numB);

        // Always include — user can manually correct later
        games.push({ scoreA: scoreA.toString(), scoreB: scoreB.toString() });
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

  const updateEditedGame = (index, field, value) => {
    setEditedGames(prev => prev.map((g, i) =>
      i === index ? { ...g, [field]: value } : g
    ));
  };

  const removeEditedGame = (index) => {
    setEditedGames(prev => prev.filter((_, i) => i !== index));
  };

  const useResults = () => {
    if (editedGames.length > 0) {
      navigate('/games/new', {
        state: {
          scannedRounds: editedGames.map(g => ({
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

            <h3>{editedGames.length} Spiele erkannt</h3>

            {editedGames.length === 0 ? (
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
                    <span></span>
                  </div>
                  {editedGames.map((g, i) => {
                    const a = parseInt(g.scoreA) || 0;
                    const b = parseInt(g.scoreB) || 0;
                    return (
                      <div key={i} className="scan-round-row">
                        <span className="scan-game-num">{i + 1}</span>
                        <input
                          type="number"
                          value={g.scoreA}
                          onChange={(e) => updateEditedGame(i, 'scoreA', e.target.value)}
                          className={a > b ? 'scan-input winner' : 'scan-input'}
                        />
                        <input
                          type="number"
                          value={g.scoreB}
                          onChange={(e) => updateEditedGame(i, 'scoreB', e.target.value)}
                          className={b > a ? 'scan-input winner' : 'scan-input'}
                        />
                        <button type="button" className="btn-delete-sm" onClick={() => removeEditedGame(i)}>✕</button>
                      </div>
                    );
                  })}
                  <div className="scan-total-row">
                    <span>Σ</span>
                    <span>{editedGames.reduce((s, g) => s + (parseInt(g.scoreA) || 0), 0).toLocaleString('de-DE')}</span>
                    <span>{editedGames.reduce((s, g) => s + (parseInt(g.scoreB) || 0), 0).toLocaleString('de-DE')}</span>
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
