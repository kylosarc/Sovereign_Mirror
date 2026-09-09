import { useState, useEffect } from 'react';
import Module1 from '../modules/Module1';
import Module2 from '../modules/Module2';
import Module3 from '../modules/Module3';
import Module4 from '../modules/Module4';
import Module5 from '../modules/Module5';
import Module6 from '../modules/Module6';
import Module7 from '../modules/Module7';
import Module8 from '../modules/Module8';
import Module9 from '../modules/Module9';

const MODULE_META: Record<string, { short: string; full: string; live: boolean }> = {
  '1': { short: 'INT. VERACITY',    full: 'Intellectual Veracity',    live: true  },
  '2': { short: 'REL. INTEGRITY',   full: 'Relational Integrity',     live: true  },
  '3': { short: 'ENV. STEWARDSHIP', full: 'Environmental Stewardship',live: true  },
  '4': { short: 'TECH. FLUENCY',    full: 'Technological Fluency',    live: true  },
  '5': { short: 'PHYSIO. OPTIM.',   full: 'Physiological Optimization',live: true  },
  '6': { short: 'TEMPORAL DISC.',   full: 'Temporal Discipline',      live: true  },
  '7': { short: 'CREATIVE SYNTH.',  full: 'Creative Synthesis',       live: true  },
  '8': { short: 'COLLAB. GOV.',     full: 'Collaborative Governance', live: true  },
  '9': { short: 'FLOURISHING',      full: 'The Flourishing Metric',   live: true  },
};

const moduleMap: Record<string, () => JSX.Element> = {
  '1': Module1, '2': Module2, '3': Module3,
  '4': Module4, '5': Module5, '6': Module6,
  '7': Module7, '8': Module8, '9': Module9,
};

const g = () => window.kylosTraining;

function getProgress(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem('kylos_pillar_progress') || '{}'); }
  catch { return {}; }
}
function saveProgress(p: Record<string, boolean>) {
  try { localStorage.setItem('kylos_pillar_progress', JSON.stringify(p)); } catch {}
}

interface ModuleRouterProps { pillarId: string; }

export function ModuleRouter({ pillarId }: ModuleRouterProps) {
  const [active, setActive] = useState(pillarId in moduleMap ? pillarId : '1');
  const [progress, setProgress] = useState<Record<string, boolean>>(getProgress);
  const [lightMode, setLightMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('kylos_training_light_mode');
      if (stored === null) {
        localStorage.setItem('kylos_training_light_mode', 'true');
        return true;
      }
      /* Backward compat: old PHP hub used 'dark'/'light', now standardized to 'true'/'false' */
      if (stored === 'dark') { localStorage.setItem('kylos_training_light_mode', 'false'); return false; }
      if (stored === 'light') { localStorage.setItem('kylos_training_light_mode', 'true'); return true; }
      return stored === 'true';
    } catch {
      return true;
    }
  });

  const toggleLight = () => setLightMode(v => {
    const next = !v;
    try { localStorage.setItem('kylos_training_light_mode', String(next)); } catch {}
    return next;
  });

  useEffect(() => {
    window.kylosOnPillarComplete = (id: string) => {
      setProgress(prev => {
        const next = { ...prev, [id]: true };
        saveProgress(next);
        return next;
      });
    };
    return () => { window.kylosOnPillarComplete = undefined; };
  }, []);

  /* Sync body background with light mode to prevent black bleed */
  useEffect(() => {
    document.body.style.background = lightMode ? '#fef6f2' : '#0a0a0f';
    document.documentElement.style.background = lightMode ? '#fef6f2' : '#0a0a0f';
  }, [lightMode]);

  const Module = moduleMap[active] ?? Module1;
  const hubUrl    = g()?.hubUrl    || 'https://kylosarc.com/training/';
  const logoUrl   = g()?.logoUrl   || '';
  const iconsBase = g()?.iconsBase || '';
  const badgesBase = g()?.badgesBase || '';

  const isUnlocked = (id: string) => id === '1' || !!progress[String(Number(id) - 1)];

  return (
    <div className={`kylos-shell${lightMode ? ' kylos-light' : ''}`}>

      {/* ── Header ── */}
      <header className="kylos-header">
        <div className="kylos-header__brand">
          {logoUrl && <img src={logoUrl} alt="Kylos Arc" className="kylos-header__logo" />}
          <div className="kylos-header__wordmark">
            <div className="kylos-header__title">KYLOS ARC TRAINING</div>
            <div className="kylos-header__sub">COGNOSCENTAE ULTRANS</div>
          </div>
        </div>
        <div className="kylos-header__actions">
          <label className="theme-toggle" title="Toggle light/dark">
            <input type="checkbox" checked={lightMode} onChange={toggleLight} />
            <span className="theme-toggle__track"></span>
            <span className="theme-toggle__thumb"></span>
          </label>
          <a href={hubUrl} className="kylos-header__back">&#8592; ALL MODULES</a>
        </div>
      </header>

      {/* ── Mobile nav ── */}
      <div className="kylos-nav-mobile">
        <select className="kylos-nav-select" value={active}
          onChange={e => setActive(e.target.value)} aria-label="Select pillar">
          {Object.entries(MODULE_META).map(([id, meta]) => (
            <option key={id} value={id}>
              {String(id).padStart(2, '0')} - {meta.full}
              {!meta.live ? ' (Coming Soon)' : progress[id] ? ' ✓' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* ── Body ── */}
      <div className="kylos-body">

        {/* ── Sidebar ── */}
        <aside className="kylos-sidebar">

          {/* Operator block */}
          <div className="kylos-sidebar__operator">
            <div className="kylos-sidebar__op-icon">O1</div>
            <div>
              <div className="kylos-sidebar__op-name">OPERATOR_01</div>
              <div className="kylos-sidebar__op-clearance">CLEARANCE: OMEGA</div>
            </div>
          </div>

          {/* Pillar nav */}
          <nav className="kylos-sidebar__nav">
            {Object.entries(MODULE_META).map(([id, meta]) => {
              const done = !!progress[id];
              const isActive = active === id;
              return (
                <button key={id}
                  data-pillar={id}
                  className={[
                    'kylos-sidebar__item',
                    isActive        ? 'kylos-sidebar__item--active' : '',
                    !meta.live      ? 'kylos-sidebar__item--stub'   : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => meta.live && setActive(id)}
                  title={meta.full}
                >
                  <span className="kylos-sidebar__item-icon">
                    {iconsBase
                      ? <img src={`${iconsBase}/pillar-${id}.webp`} alt="" />
                      : <span className="kylos-sidebar__item-num">{id}</span>
                    }
                  </span>
                  <span className="kylos-sidebar__item-label">{meta.full}</span>
                  {done && <span className="kylos-sidebar__item-check">&#10003;</span>}
                </button>
              );
            })}
          </nav>

          {/* Badge + video for active live pillar */}
          {MODULE_META[active]?.live && (
            <div className="kylos-sidebar__tools">
              {badgesBase && (
                <img
                  src={`${badgesBase}/pillar${active}-badge100.png`}
                  alt={`Pillar ${active} badge`}
                  className={`kylos-sidebar__badge${progress[active] ? ' kylos-sidebar__badge--earned' : ''}`}
                />
              )}
              <button className="kylos-sidebar__video-btn">&#9654; VIDEO</button>
            </div>
          )}

          <button className="kylos-sidebar__sync">INITIALIZE NEURAL SYNC</button>

        </aside>

        {/* ── Main content ── */}
        <main className="kylos-main">
          {!isUnlocked(active) && MODULE_META[active]?.live && (
            <div className="kylos-locked-banner">
              LOCKED - complete Pillar {Number(active) - 1}:{' '}
              {MODULE_META[String(Number(active) - 1)]?.full} first
            </div>
          )}
          <Module />
        </main>

      </div>
    </div>
  );
}
