import { useRef, useEffect } from 'react';
import { animateMini } from 'motion';

type Depth = 'surface' | 'developing' | 'deep';

const DEPTH_COLOR: Record<Depth, string> = {
  surface: '#F43F5E',
  developing: '#F97316',
  deep: '#3FF4D5',
};
const DEPTH_LABEL: Record<Depth, string> = {
  surface: 'SURFACE',
  developing: 'DEVELOPING',
  deep: 'DEEP',
};

interface Props {
  result: { depth: Depth; reflection: string };
  input: string;
  onNext: () => void;
  isLast: boolean;
  nextLabel?: string;
}

export function DepthReveal({ result, input, onNext, isLast, nextLabel }: Props) {
  const dotRef       = useRef<HTMLDivElement>(null);
  const labelRef     = useRef<HTMLSpanElement>(null);
  const lineRef      = useRef<HTMLDivElement>(null);
  const reflRef      = useRef<HTMLDivElement>(null);
  const echoRef      = useRef<HTMLDivElement>(null);
  const actionsRef   = useRef<HTMLDivElement>(null);

  const c = DEPTH_COLOR[result.depth];

  useEffect(() => {
    if (!dotRef.current || !labelRef.current || !lineRef.current || !reflRef.current || !echoRef.current || !actionsRef.current) return;

    // Spring animation for the depth dot - natural bounce
    animateMini(dotRef.current, { scale: [0, 1] }, { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] });

    // Staggered reveals with easing curves
    setTimeout(() => {
      animateMini(labelRef.current!, { opacity: [0, 1], x: [-14, 0] }, { duration: 0.35, ease: 'easeOut' });
    }, 100);

    setTimeout(() => {
      animateMini(lineRef.current!, { scaleX: [0, 1] }, { duration: 0.4, ease: 'easeOut' });
    }, 140);

    setTimeout(() => {
      animateMini(reflRef.current!, { opacity: [0, 1], y: [12, 0] }, { duration: 0.45, ease: 'easeOut' });
    }, 280);

    setTimeout(() => {
      animateMini(echoRef.current!, { opacity: [0, 1], y: [8, 0] }, { duration: 0.35, ease: 'easeOut' });
    }, 450);

    setTimeout(() => {
      animateMini(actionsRef.current!, { opacity: [0, 1], y: [6, 0] }, { duration: 0.3, ease: 'easeOut' });
    }, 580);
  }, []);

  return (
    <>
      <div className="mod-depth-row">
        <div ref={dotRef} className="mod-depth-dot" style={{ background: c, transform: 'scale(0)' }} />
        <span ref={labelRef} className="mod-depth-label" style={{ color: c, opacity: 0 }}>
          {DEPTH_LABEL[result.depth]}
        </span>
        <div ref={lineRef} className="mod-depth-line" style={{ background: `${c}33`, transform: 'scaleX(0)' }} />
      </div>

      <div ref={reflRef} className="mod-reflection" style={{ background: `${c}09`, border: `1px solid ${c}25`, opacity: 0 }}>
        {result.reflection}
      </div>

      <div ref={echoRef} className="mod-response-echo" style={{ opacity: 0 }}>
        <div className="mod-response-label">YOUR RESPONSE</div>
        <div className="mod-response-text">{input}</div>
      </div>

      <div ref={actionsRef} className="mod-actions" style={{ opacity: 0 }}>
        <button className="mod-btn-orange" onClick={onNext}>
          {isLast ? (nextLabel ?? 'COMPLETE MODULE') : 'NEXT QUESTION →'}
        </button>
      </div>
    </>
  );
}
