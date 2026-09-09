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
  { id: 'q1', text: 'Where do genuinely new ideas come from? Not improved ones — structurally novel ones.', hint: 'Think about what conditions produce ideas that have no precedent, not just better versions of existing ones.' },
  { id: 'q2', text: 'What makes an analogy between two domains useful rather than merely decorative?', hint: 'Consider the difference between an analogy that illuminates and one that generates predictions.' },
  { id: 'q3', text: 'Why does expertise in a field sometimes make it harder to solve problems in that field?', hint: null },
  { id: 'q4', text: 'What is the difference between a creative person and a creative process — and why does the distinction matter?', hint: 'Consider what changes when you attribute creativity to a person versus to a set of conditions.' },
];

const DEPTH_COLOR: Record<Depth, string> = { surface: '#F43F5E', developing: '#F97316', deep: '#3FF4D5' };
const DEPTH_LABEL: Record<Depth, string> = { surface: 'SURFACE', developing: 'DEVELOPING', deep: 'DEEP' };
const PILLAR_COLOR = '#F59E0B';

export default function Module7() {
  const [index,   setIndex]   = useState(0);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<Result | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [results, setResults] = useState<(Result | null)[]>(Array(QUESTIONS.length).fill(null));
  const [done,    setDone]    = useState(false);
  const [cardKey, setCardKey] = useState(0);

  useEffect(() => {
    if (done) window.kylosOnPillarComplete?.('7');
  }, [done]);

  const question = QUESTIONS[index];
  const isLast   = index === QUESTIONS.length - 1;

  async function handleSubmit() {
    if (!input.trim() || loading) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE()}/api/pillar7/evaluate`, {
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
        <div className="mod-header" style={{ borderBottomColor: `rgba(245,158,11,0.2)` }}>
          <div className="mod-pillar-tag" style={{ color: PILLAR_COLOR }}>PILLAR 7 — CREATIVE SYNTHESIS</div>
          <div className="mod-pillar-sub">Cross-Domain Transfer · Lateral Thinking · Innovation Pipeline</div>
        </div>

        <div className="mod-instructions">
          <strong>How this works:</strong> You will answer four Socratic questions about where novel ideas come from and how to cultivate the capacity to generate them.
          Creative synthesis is not inspiration — it is a learnable structural capacity. Answer from your own thinking and experience.
        </div>

        <div className="mod-progress">
          {QUESTIONS.map((_, i) => {
            const r = results[i];
            const color = r ? DEPTH_COLOR[r.depth] : i === index ? `rgba(245,158,11,0.5)` : 'rgba(212,212,216,0.1)';
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
      <div className="mod-complete-banner" style={{ background: 'rgba(245,158,11,0.08)', borderBottomColor: 'rgba(245,158,11,0.2)' }}>
        <div className="mod-complete-icon" style={{ background: PILLAR_COLOR }}>✓</div>
        <div>
          <div className="mod-complete-title">Pillar 7 — Complete</div>
          <div className="mod-complete-sub" style={{ color: DEPTH_COLOR[overallDepth] }}>
            Overall depth: {DEPTH_LABEL[overallDepth]}
          </div>
        </div>
      </div>

      <div className="mod-container">
        <div className="mod-header" style={{ borderBottomColor: 'rgba(245,158,11,0.2)' }}>
          <div className="mod-pillar-tag" style={{ color: PILLAR_COLOR }}>PILLAR 7 — CREATIVE SYNTHESIS</div>
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
