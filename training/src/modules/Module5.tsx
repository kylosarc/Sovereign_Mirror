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
  { id: 'q1', text: 'What happens to your decision-making quality when you are sleep-deprived - and why does the most sleep-deprived person often feel the least impaired?', hint: 'This is a question about self-assessment, not just physiology.' },
  { id: 'q2', text: 'Most people treat stress as something to eliminate. When is stress not only unavoidable but necessary for growth?', hint: 'Consider what happens to a muscle that is never challenged.' },
  { id: 'q3', text: 'What is the difference between the absence of disease and the presence of health?', hint: null },
  { id: 'q4', text: 'If the goal of longevity is to compress morbidity - to live fully and then decline quickly - what decisions made today most determine the quality of your final decade?', hint: null },
];

const DEPTH_COLOR: Record<Depth, string> = { surface: '#F43F5E', developing: '#F97316', deep: '#3FF4D5' };
const DEPTH_LABEL: Record<Depth, string> = { surface: 'SURFACE', developing: 'DEVELOPING', deep: 'DEEP' };
const PILLAR_COLOR = '#F43F5E';

export default function Module5() {
  const [index,   setIndex]   = useState(0);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<Result | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [results, setResults] = useState<(Result | null)[]>(Array(QUESTIONS.length).fill(null));
  const [done,    setDone]    = useState(false);
  const [cardKey, setCardKey] = useState(0);

  useEffect(() => {
    if (done) window.kylosOnPillarComplete?.('5');
  }, [done]);

  const question = QUESTIONS[index];
  const isLast   = index === QUESTIONS.length - 1;

  async function handleSubmit() {
    if (!input.trim() || loading) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE()}/api/pillar5/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: question.id, response: input.trim() }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json() as Result;
      setResult(data);
      setResults(prev => { const n = [...prev]; n[index] = data; return n; });
    } catch {
      setError('Evaluation unavailable - try again.');
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
        <div className="mod-header" style={{ borderBottomColor: `rgba(244,63,94,0.2)` }}>
          <div className="mod-pillar-tag" style={{ color: PILLAR_COLOR }}>PILLAR 5 - PHYSIOLOGICAL OPTIMIZATION</div>
          <div className="mod-pillar-sub">Sleep Architecture · Metabolic Flexibility · Stress Adaptation · Longevity</div>
        </div>

        <div className="mod-instructions">
          <strong>How this works:</strong> You will answer four Socratic questions about the biological prerequisites for sustained high-quality deliberation.
          Peak performance is not optional infrastructure - it is a governance competency. Answer from your own experience and understanding.
        </div>

        <div className="mod-progress">
          {QUESTIONS.map((_, i) => {
            const r = results[i];
            const color = r ? DEPTH_COLOR[r.depth] : i === index ? `rgba(244,63,94,0.5)` : 'rgba(212,212,216,0.1)';
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
      <div className="mod-complete-banner" style={{ background: 'rgba(244,63,94,0.08)', borderBottomColor: 'rgba(244,63,94,0.2)' }}>
        <div className="mod-complete-icon" style={{ background: PILLAR_COLOR }}>✓</div>
        <div>
          <div className="mod-complete-title">Pillar 5 - Complete</div>
          <div className="mod-complete-sub" style={{ color: DEPTH_COLOR[overallDepth] }}>
            Overall depth: {DEPTH_LABEL[overallDepth]}
          </div>
        </div>
      </div>

      <div className="mod-container">
        <div className="mod-header" style={{ borderBottomColor: 'rgba(244,63,94,0.2)' }}>
          <div className="mod-pillar-tag" style={{ color: PILLAR_COLOR }}>PILLAR 5 - PHYSIOLOGICAL OPTIMIZATION</div>
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
