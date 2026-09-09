import { useState, useEffect } from 'react';
import { CharacterCounter } from '../components/CharacterCounter';

const API_BASE = (): string =>
  typeof window !== 'undefined' && window.kylosTraining?.apiBase
    ? window.kylosTraining.apiBase
    : (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__kylosApiBase as string) || '';

type Depth = 'surface' | 'developing' | 'deep';
type Phase = 'socratic' | 'sequence' | 'done';

interface SocraticQuestion { id: string; text: string; hint: string | null; }
interface SocraticResult   { depth: Depth; reflection: string; }
interface SequenceResult   { score: number; label: string; canonical: string[]; canonicalLabels: Record<string, string>; explanation: string; }

const QUESTIONS: SocraticQuestion[] = [
  { id: 'q1', text: 'When two resource systems are in competition - say, energy and water - what principle guides which to address first?', hint: 'Think about dependencies: does solving one unlock the other?' },
  { id: 'q2', text: 'What is a second-order consequence? Describe one from any system you can think of.', hint: 'A consequence of a consequence - trace at least two steps.' },
  { id: 'q3', text: 'What distinguishes a regenerative approach to ecological systems from a merely sustainable one?', hint: null },
];

const INTERVENTIONS = [
  { id: 'geothermal',   label: 'Deep Geothermal Gyrotrons',   sub: 'Baseload power from Earth\'s heat' },
  { id: 'fermentation', label: 'Precision Fermentation',       sub: 'Decouple protein from agriculture' },
  { id: 'solar',        label: 'Space-Based Solar Power',      sub: 'Orbital arrays for large-scale energy' },
  { id: 'atmospheric',  label: 'Atmospheric Water Harvesting', sub: 'Moisture capture arrays' },
];

const DEPTH_COLOR: Record<Depth, string> = { surface: '#F43F5E', developing: '#F97316', deep: '#3FF4D5' };
const DEPTH_LABEL: Record<Depth, string> = { surface: 'SURFACE', developing: 'DEVELOPING', deep: 'DEEP' };
const SCORE_COLOR = (l: string) => l === 'exact' ? '#3FF4D5' : l === 'partial' ? '#F97316' : '#F43F5E';
const SCORE_LABEL = (l: string) => l === 'exact' ? 'EXACT MATCH' : l === 'partial' ? 'PARTIAL MATCH' : 'INVERTED';

export default function Module3() {
  const [phase,      setPhase]      = useState<Phase>('socratic');
  const [qIndex,     setQIndex]     = useState(0);
  const [input,      setInput]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState<SocraticResult | null>(null);
  const [qResults,   setQResults]   = useState<(SocraticResult | null)[]>(Array(QUESTIONS.length).fill(null));
  const [sequence,   setSequence]   = useState<string[]>([]);
  const [seqResult,  setSeqResult]  = useState<SequenceResult | null>(null);
  const [seqLoading, setSeqLoading] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    if (phase === 'done') window.kylosOnPillarComplete?.('3');
  }, [phase]);

  const question = QUESTIONS[qIndex];
  const isLastQ  = qIndex === QUESTIONS.length - 1;

  async function handleSocraticSubmit() {
    if (!input.trim() || loading) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE()}/api/pillar3/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: question.id, response: input.trim() }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json() as SocraticResult;
      setResult(data);
      setQResults(prev => { const n = [...prev]; n[qIndex] = data; return n; });
    } catch {
      setError('Evaluation unavailable - try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleNextQ() {
    if (isLastQ) { setPhase('sequence'); }
    else { setQIndex(i => i + 1); setInput(''); setResult(null); setError(null); }
  }

  function toggleSequence(id: string) {
    setSequence(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  }

  async function handleSequenceSubmit() {
    if (sequence.length !== 4 || seqLoading) return;
    setSeqLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE()}/api/pillar3/sequence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequence }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setSeqResult(await res.json() as SequenceResult);
    } catch {
      setError('Submission failed - try again.');
    } finally {
      setSeqLoading(false);
    }
  }

  /* ── Socratic phase ─────────────────────────────────────────── */
  if (phase === 'socratic') {
    const c = result ? DEPTH_COLOR[result.depth] : null;
    return (
      <div className="mod-container">
        <div className="mod-header">
          <div className="mod-pillar-tag">PILLAR 3 - ENVIRONMENTAL STEWARDSHIP · PHASE I</div>
          <div className="mod-pillar-sub">Systems Reasoning · Second-Order Consequences · Regenerative Design</div>
        </div>

        <div className="mod-instructions">
          <strong>Phase I - Systems Reflection:</strong> Answer three questions about ecological and systems reasoning.
          Think carefully - depth of analysis matters more than breadth of vocabulary.
          Phase II will follow: you will sequence four real-world interventions for a resource crisis.
        </div>

        <div className="mod-progress">
          {QUESTIONS.map((_, i) => {
            const r = qResults[i];
            const color = r ? DEPTH_COLOR[r.depth] : i === qIndex ? 'rgba(212,212,216,0.4)' : 'rgba(212,212,216,0.1)';
            return <div key={i} className="mod-progress-seg" style={{ background: color }} />;
          })}
          <div className="mod-progress-seg" style={{ background: 'rgba(212,212,216,0.08)' }} title="Sequencing phase" />
        </div>

        <div className="mod-question-num">QUESTION {qIndex + 1} OF {QUESTIONS.length}</div>
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
              <button className="mod-btn-indigo" onClick={handleSocraticSubmit} disabled={!input.trim() || loading}>
                {loading ? 'EVALUATING...' : 'SUBMIT'}
              </button>
              {error && <span className="mod-error">{error}</span>}
            </div>
          </>
        ) : (
          <>
            <div className="mod-depth-row">
              <div className="mod-depth-dot" style={{ background: c! }} />
              <span className="mod-depth-label" style={{ color: c! }}>{DEPTH_LABEL[result.depth]}</span>
              <div className="mod-depth-line" style={{ background: `${c}33` }} />
            </div>
            <div className="mod-reflection" style={{ background: `${c}09`, border: `1px solid ${c}25` }}>
              {result.reflection}
            </div>
            <div className="mod-response-echo">
              <div className="mod-response-label">YOUR RESPONSE</div>
              <div className="mod-response-text">{input}</div>
            </div>
            <div className="mod-actions">
              <button className="mod-btn-orange" onClick={handleNextQ}>
                {isLastQ ? 'PROCEED TO SEQUENCING →' : 'NEXT QUESTION →'}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  /* ── Sequence phase ─────────────────────────────────────────── */
  if (phase === 'sequence') {
    return (
      <div className="mod-container">
        <div className="mod-header">
          <div className="mod-pillar-tag">PILLAR 3 - ENVIRONMENTAL STEWARDSHIP · PHASE II</div>
          <div className="mod-pillar-sub">WEFE Nexus · Intervention Sequencing</div>
        </div>

        <div className="mod-instructions">
          <strong>Phase II - Intervention Sequencing:</strong> A regional WEFE nexus crisis requires four interventions.
          Click each intervention in the order it should be deployed - cascade dependencies determine the correct sequence.
          Which must come first to unlock the others?
        </div>

        {!seqResult ? (
          <>
            <div className="mod-scenario">
              <div className="mod-scenario-tag">SCENARIO - WEFE NEXUS CRISIS</div>
              <div className="mod-scenario-stats">
                <div>
                  <span className="mod-scenario-stat-num" style={{ color: '#F43F5E' }}>−42%</span>
                  <span className="mod-scenario-stat-label">Water Table</span>
                </div>
                <div>
                  <span className="mod-scenario-stat-num" style={{ color: '#F97316' }}>+18%</span>
                  <span className="mod-scenario-stat-label">Energy Cost</span>
                </div>
              </div>
              <div className="mod-scenario-text">
                Four interventions are available. Sequence them from first to last based on cascade
                dependency - which must precede which to make the others viable?
              </div>
            </div>

            <div className="mod-seq-label">YOUR SEQUENCE - click interventions in order</div>
            <div className="mod-seq-slots">
              {[0,1,2,3].map(i => {
                const id = sequence[i];
                const iv = INTERVENTIONS.find(x => x.id === id);
                return (
                  <div key={i}
                    className="mod-seq-slot"
                    style={{
                      background: id ? 'rgba(63,244,213,0.05)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${id ? 'rgba(63,244,213,0.2)' : 'rgba(255,255,255,0.07)'}`,
                    }}
                  >
                    <div className="mod-seq-slot-num">{i + 1}</div>
                    {iv && <div className="mod-seq-slot-label" style={{ color: '#3FF4D5' }}>{iv.label}</div>}
                  </div>
                );
              })}
            </div>

            <div className="mod-interventions">
              {INTERVENTIONS.map(iv => {
                const pos = sequence.indexOf(iv.id);
                const selected = pos >= 0;
                return (
                  <button
                    key={iv.id}
                    className="mod-intervention"
                    onClick={() => toggleSequence(iv.id)}
                    style={{
                      background: selected ? 'rgba(63,244,213,0.05)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${selected ? 'rgba(63,244,213,0.25)' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    <div className="mod-intervention-num"
                      style={{
                        background: selected ? '#3FF4D5' : 'rgba(255,255,255,0.08)',
                        color: selected ? '#0a0a0f' : 'rgba(212,212,216,0.25)',
                      }}
                    >
                      {selected ? pos + 1 : ''}
                    </div>
                    <div>
                      <div className="mod-intervention-title" style={{ color: selected ? '#3FF4D5' : undefined }}>{iv.label}</div>
                      <div className="mod-intervention-sub">{iv.sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mod-actions">
              <button
                className="mod-btn-cyan"
                onClick={handleSequenceSubmit}
                disabled={sequence.length !== 4 || seqLoading}
              >
                {seqLoading ? 'SUBMITTING...' : 'SUBMIT SEQUENCE'}
              </button>
              {sequence.length > 0 && (
                <button className="mod-btn-ghost" onClick={() => setSequence([])}>RESET</button>
              )}
              {error && <span className="mod-error">{error}</span>}
            </div>
          </>
        ) : (
          <SequenceResultPanel
            result={seqResult}
            userSequence={sequence}
            onRetake={() => { setSequence([]); setSeqResult(null); }}
            onFinish={() => setPhase('done')}
          />
        )}
      </div>
    );
  }

  /* ── Summary (done) ─────────────────────────────────────────── */
  return <Summary qResults={qResults} seqResult={seqResult} onRestart={() => {
    setPhase('socratic'); setQIndex(0); setInput(''); setResult(null); setError(null);
    setQResults(Array(QUESTIONS.length).fill(null)); setSequence([]); setSeqResult(null);
  }} />;
}

function SequenceResultPanel({ result, userSequence, onRetake, onFinish }: {
  result: SequenceResult; userSequence: string[]; onRetake: () => void; onFinish: () => void;
}) {
  const color = SCORE_COLOR(result.label);
  return (
    <>
      <div className="mod-depth-row">
        <div className="mod-depth-dot" style={{ background: color }} />
        <span className="mod-depth-label" style={{ color }}>
          {SCORE_LABEL(result.label)} - {result.score}/4
        </span>
        <div className="mod-depth-line" style={{ background: `${color}33` }} />
      </div>

      <div className="mod-seq-compare">
        {(['YOUR SEQUENCE', 'CANONICAL SEQUENCE'] as const).map((label, col) => {
          const ids = col === 0 ? userSequence : result.canonical;
          return (
            <div key={label}>
              <div className="mod-seq-compare-head">{label}</div>
              {ids.map((id, i) => {
                const match = id === result.canonical[i];
                return (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '4px' }}>
                    <span className="mod-seq-item-num">{i + 1}</span>
                    <span className="mod-seq-item-name" style={{ color: col === 0 ? (match ? '#3FF4D5' : '#F43F5E') : 'rgba(212,212,216,0.55)' }}>
                      {result.canonicalLabels[id]}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="mod-reflection" style={{ background: 'rgba(63,244,213,0.04)', border: '1px solid rgba(63,244,213,0.15)' }}>
        <div style={{ color: '#3FF4D5', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>CASCADE LOGIC</div>
        {result.explanation.split('\n\n').map((para, i) => (
          <p key={i} style={{ fontSize: '0.875rem', lineHeight: 1.7, margin: '0 0 0.75rem', color: 'inherit' }}>{para}</p>
        ))}
      </div>

      <div className="mod-actions">
        <button className="mod-btn-outline" onClick={onFinish}>COMPLETE MODULE</button>
        <button className="mod-btn-ghost"   onClick={onRetake}>RETAKE SEQUENCE</button>
      </div>
    </>
  );
}

function Summary({ qResults, seqResult, onRestart }: {
  qResults: (SocraticResult | null)[]; seqResult: SequenceResult | null; onRestart: () => void;
}) {
  return (
    <>
      <div className="mod-complete-banner">
        <div className="mod-complete-icon">✓</div>
        <div>
          <div className="mod-complete-title">Pillar 3 - Complete</div>
          <div className="mod-complete-sub">Environmental Stewardship - both phases recorded</div>
        </div>
      </div>

      <div className="mod-container">
        <div className="mod-header">
          <div className="mod-pillar-tag">PILLAR 3 - COMPLETE</div>
        </div>

        <div className="mod-summary-list">
          {QUESTIONS.map((q, i) => {
            const r = qResults[i];
            return (
              <div key={i} className="mod-summary-item">
                <div className="mod-summary-dot" style={{ background: r ? DEPTH_COLOR[r.depth] : 'rgba(212,212,216,0.1)' }} />
                <div>
                  <div className="mod-summary-q">{q.text}</div>
                  {r && <div className="mod-summary-depth" style={{ color: DEPTH_COLOR[r.depth] }}>{DEPTH_LABEL[r.depth]}</div>}
                </div>
              </div>
            );
          })}
          {seqResult && (
            <div className="mod-summary-item">
              <div className="mod-summary-dot" style={{ background: SCORE_COLOR(seqResult.label) }} />
              <div>
                <div className="mod-summary-q">WEFE Intervention Sequence</div>
                <div className="mod-summary-depth" style={{ color: SCORE_COLOR(seqResult.label) }}>
                  {SCORE_LABEL(seqResult.label)} - {seqResult.score}/4
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mod-actions">
          <button className="mod-btn-ghost" onClick={onRestart}>RETAKE</button>
        </div>
      </div>
    </>
  );
}
