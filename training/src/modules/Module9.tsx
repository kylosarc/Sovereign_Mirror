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
  { id: 'q1', text: 'GDP is the dominant metric of national success. What does it structurally fail to measure — and why does that failure matter for governance?', hint: 'Look at what it includes that it shouldn\'t, not just what it leaves out.' },
  { id: 'q2', text: 'What is the structural difference between a system that is robust and one that is anti-fragile?', hint: 'Consider what each requires in order to work — and what happens when they encounter a threat they weren\'t designed for.' },
  { id: 'q3', text: 'If you had to design a single metric for flourishing in a community, what would you measure and why — and what are the hardest tradeoffs in that design?', hint: 'Think about Goodhart\'s Law: when a measure becomes a target, it ceases to be a good measure.' },
  { id: 'q4', text: 'Does individual flourishing and collective flourishing always align — and if not, what determines when they conflict?', hint: null },
];

const DEPTH_COLOR: Record<Depth, string> = { surface: '#F43F5E', developing: '#F97316', deep: '#3FF4D5' };
const DEPTH_LABEL: Record<Depth, string> = { surface: 'SURFACE', developing: 'DEVELOPING', deep: 'DEEP' };
const PILLAR_COLOR = '#10B981';

export default function Module9() {
  const [index,   setIndex]   = useState(0);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<Result | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [results, setResults] = useState<(Result | null)[]>(Array(QUESTIONS.length).fill(null));
  const [done,    setDone]    = useState(false);
  const [cardKey, setCardKey] = useState(0);

  useEffect(() => {
    if (done) window.kylosOnPillarComplete?.('9');
  }, [done]);

  const question = QUESTIONS[index];
  const isLast   = index === QUESTIONS.length - 1;

  async function handleSubmit() {
    if (!input.trim() || loading) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE()}/api/pillar9/evaluate`, {
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
        <div className="mod-header" style={{ borderBottomColor: `rgba(16,185,129,0.2)` }}>
          <div className="mod-pillar-tag" style={{ color: PILLAR_COLOR }}>PILLAR 9 — THE FLOURISHING METRIC</div>
          <div className="mod-pillar-sub">Multi-Capital Accounting · Wellbeing Indices · Anti-Fragility</div>
        </div>

        <div className="mod-instructions">
          <strong>How this works:</strong> You will answer four Socratic questions about how to measure and design for human flourishing.
          A governance system that cannot measure flourishing cannot produce it. Answer from both principle and observation.
        </div>

        <div className="mod-progress">
          {QUESTIONS.map((_, i) => {
            const r = results[i];
            const color = r ? DEPTH_COLOR[r.depth] : i === index ? `rgba(16,185,129,0.5)` : 'rgba(212,212,216,0.1)';
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
      <div className="mod-complete-banner" style={{ background: 'rgba(16,185,129,0.08)', borderBottomColor: 'rgba(16,185,129,0.2)' }}>
        <div className="mod-complete-icon" style={{ background: PILLAR_COLOR }}>✓</div>
        <div>
          <div className="mod-complete-title">Pillar 9 — Complete</div>
          <div className="mod-complete-sub" style={{ color: DEPTH_COLOR[overallDepth] }}>
            Overall depth: {DEPTH_LABEL[overallDepth]}
          </div>
        </div>
      </div>

      <div className="mod-container">
        <div className="mod-header" style={{ borderBottomColor: 'rgba(16,185,129,0.2)' }}>
          <div className="mod-pillar-tag" style={{ color: PILLAR_COLOR }}>PILLAR 9 — THE FLOURISHING METRIC</div>
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
