import { useState, useEffect } from 'react';
import { DepthReveal } from '../components/DepthReveal';
import { CharacterCounter } from '../components/CharacterCounter';

const API_BASE = (): string =>
  typeof window !== 'undefined' && window.kylosTraining?.apiBase
    ? window.kylosTraining.apiBase
    : (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__kylosApiBase as string) || '';

type Depth = 'surface' | 'developing' | 'deep';

interface Question { id: string; text: string; hint: string | null; }
interface Result    { depth: Depth; reflection: string; }

const QUESTIONS: Question[] = [
  { id: 'q1', text: 'What is the structural difference between being busy and being productive?', hint: 'Consider what each optimizes for, and who benefits from the confusion between them.' },
  { id: 'q2', text: 'Why does the person with the most control over their attention tend to produce asymmetric value — not just more output, but disproportionately more?', hint: 'Think about how insight compounds differently than effort.' },
  { id: 'q3', text: 'What makes a deadline generative — one that produces better work — rather than merely pressuring?', hint: 'Consider what a generative deadline closes off, not just when it falls.' },
  { id: 'q4', text: 'What does it mean to protect your attention at the level of a system rather than at the level of individual decisions?', hint: null },
];

const DEPTH_COLOR: Record<Depth, string> = { surface: '#F43F5E', developing: '#F97316', deep: '#3FF4D5' };
const DEPTH_LABEL: Record<Depth, string> = { surface: 'SURFACE', developing: 'DEVELOPING', deep: 'DEEP' };
const PILLAR_COLOR = '#8B5CF6';

export default function Module6() {
  const [index,   setIndex]   = useState(0);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<Result | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [results, setResults] = useState<(Result | null)[]>(Array(QUESTIONS.length).fill(null));
  const [done,    setDone]    = useState(false);
  const [cardKey, setCardKey] = useState(0);

  useEffect(() => {
    if (done) window.kylosOnPillarComplete?.('6');
  }, [done]);

  const question = QUESTIONS[index];
  const isLast   = index === QUESTIONS.length - 1;

  async function handleSubmit() {
    if (!input.trim() || loading) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE()}/api/pillar6/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: question.id, response: input.trim() }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json() as Result;
      setResult(data);
      setResults(prev => { const n = [...prev]; n[index] = data; return n; });
    } catch {
      setError('Evaluation unavailable — try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleNext() {
    if (isLast) { setDone(true); }
    else { setIndex(i => i + 1); setInput(''); setResult(null); setError(null); setCardKey(k => k + 1); }
  }

  if (done) {
    return <Summary results={results} onRestart={() => {
      setIndex(0); setInput(''); setResult(null); setError(null);
      setResults(Array(QUESTIONS.length).fill(null)); setDone(false);
    }} />;
  }

  return (
    <>
      <div className="mod-container">
        <div className="mod-header" style={{ borderBottomColor: `rgba(139,92,246,0.2)` }}>
          <div className="mod-pillar-tag" style={{ color: PILLAR_COLOR }}>PILLAR 6 — TEMPORAL DISCIPLINE</div>
          <div className="mod-pillar-sub">Deep Work · Attention Economics · Deadline Architecture</div>
        </div>

        <div className="mod-instructions">
          <strong>How this works:</strong> You will answer four Socratic questions about time, attention, and the architecture of productive work.
          Temporal discipline is not scheduling — it is the strategic management of the only non-renewable resource in a governance system. Answer from your own experience.
        </div>

        <div className="mod-progress">
          {QUESTIONS.map((_, i) => {
            const r = results[i];
            const color = r ? DEPTH_COLOR[r.depth] : i === index ? `rgba(139,92,246,0.5)` : 'rgba(212,212,216,0.1)';
            return <div key={i} className="mod-progress-seg" style={{ background: color }} />;
          })}
        </div>

        <div className="mod-question-card card-enter" key={cardKey} style={{ '--pillar-color': PILLAR_COLOR } as React.CSSProperties}>
          <div className="mod-question-num">QUESTION {index + 1} OF {QUESTIONS.length}</div>
          <div className="mod-question-text">{question.text}</div>
          {question.hint && <div className="mod-hint">{question.hint}</div>}

          {!result ? (
            <>
              <textarea
                className="mod-textarea"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Write your response..."
                disabled={loading}
                rows={5}
              />
              <CharacterCounter text={input} />
              <div className="mod-actions">
                <button
                  className="mod-btn-indigo"
                  onClick={handleSubmit}
                  disabled={!input.trim() || loading}
                >
                  {loading ? 'EVALUATING...' : 'SUBMIT'}
                </button>
                {error && <span className="mod-error">{error}</span>}
              </div>
            </>
          ) : (
            <DepthReveal result={result} input={input} onNext={handleNext} isLast={isLast} />
          )}
        </div>
      </div>
    </>
  );
}

function Summary({ results, onRestart }: { results: (Result | null)[]; onRestart: () => void }) {
  const scored = results.filter(Boolean) as Result[];
  const depthRank: Record<Depth, number> = { surface: 0, developing: 1, deep: 2 };
  const avgRank = scored.length
    ? scored.reduce((s, r) => s + depthRank[r.depth], 0) / scored.length
    : 0;
  const overallDepth: Depth = avgRank >= 1.6 ? 'deep' : avgRank >= 0.7 ? 'developing' : 'surface';

  return (
    <>
      <div className="mod-complete-banner" style={{ background: 'rgba(139,92,246,0.08)', borderBottomColor: 'rgba(139,92,246,0.2)' }}>
        <div className="mod-complete-icon" style={{ background: PILLAR_COLOR }}>✓</div>
        <div>
          <div className="mod-complete-title">Pillar 6 — Complete</div>
          <div className="mod-complete-sub" style={{ color: DEPTH_COLOR[overallDepth] }}>
            Overall depth: {DEPTH_LABEL[overallDepth]}
          </div>
        </div>
      </div>

      <div className="mod-container">
        <div className="mod-header" style={{ borderBottomColor: 'rgba(139,92,246,0.2)' }}>
          <div className="mod-pillar-tag" style={{ color: PILLAR_COLOR }}>PILLAR 6 — TEMPORAL DISCIPLINE</div>
        </div>

        <div className="mod-summary-list">
          {QUESTIONS.map((q, i) => {
            const r = results[i];
            return (
              <div key={i} className="mod-summary-item">
                <div className="mod-summary-dot" style={{ background: r ? DEPTH_COLOR[r.depth] : 'rgba(212,212,216,0.12)' }} />
                <div>
                  <div className="mod-summary-q">{q.text}</div>
                  {r && <div className="mod-summary-depth" style={{ color: DEPTH_COLOR[r.depth] }}>{DEPTH_LABEL[r.depth]}</div>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mod-actions">
          <button className="mod-btn-ghost" onClick={onRestart}>RETAKE</button>
        </div>
      </div>
    </>
  );
}
