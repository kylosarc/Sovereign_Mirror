import { useSelector } from 'react-redux';
import { RootState } from '../../state/ledger/store';
import { VeracityEvent } from '../../state/ledger/slices/veracitySlice';
import { PhysicalizationEvent } from '../../state/ledger/slices/physicalizationSlice';
import { EcologyEvent } from '../../state/ledger/slices/ecologySlice';

function formatTimestamp(ts: number): string {
  return new Date(ts).toISOString().replace('T', ' ').slice(0, -1);
}

function VeracityEventRow({ event }: { event: VeracityEvent }) {
  const labels: Record<string, string> = {
    VERACITY_CALCULATED: 'V_SCORE',
    VERACITY_GATE_CROSSED: 'ZKPROOF_PASS',
    RESONANCE_SPIKE_DETECTED: 'ENTROPY_SPIKE',
    ATROPHY_TRIGGERED: 'DECAY_APPLIED',
  };

  return (
    <div className="grid grid-cols-12 gap-1 md:gap-2 text-on-surface-variant group hover:bg-white/5 p-0.5 md:p-1 transition-colors text-[9px] md:text-[11px]">
      <div className="col-span-3 font-data-mono truncate">{formatTimestamp(event.timestamp)}</div>
      <div className="col-span-2 font-data-mono text-ignition-white">#0x{event.nodeId.slice(0, 4)}</div>
      <div className="col-span-5 font-data-mono truncate">{labels[event.eventType] || event.eventType}</div>
      <div className="col-span-2 text-right font-data-mono">
        <span className="text-solar-amber">V={event.veracityScore.toFixed(2)}</span>
      </div>
    </div>
  );
}

function PhysicalizationEventRow({ event }: { event: PhysicalizationEvent }) {
  const labels: Record<string, string> = {
    P_GATE_ACTIVATED: 'P_GATE_ARM',
    P_GATE_TRIGGERED: 'P_GATE_FIRE',
    QUORUM_REACHED: 'QUORUM_YES',
    NODE_PHYSICALIZED: 'ZKP_VERIFIED',
    PHYSICALIZATION_REJECTED: 'P_GATE_REJECT',
    CRYPTO_SIG_RECEIVED: 'QPADL_SIG',
  };

  const isCrypto = event.eventType === 'CRYPTO_SIG_RECEIVED';

  return (
    <div className="grid grid-cols-12 gap-1 md:gap-2 text-on-surface-variant group hover:bg-white/5 p-0.5 md:p-1 transition-colors text-[9px] md:text-[11px]">
      <div className="col-span-3 font-data-mono truncate">{formatTimestamp(event.timestamp)}</div>
      <div className="col-span-2 font-data-mono text-ignition-white">#0x{event.nodeId.slice(0, 4)}</div>
      <div className={`col-span-5 font-data-mono truncate ${isCrypto ? 'text-healed-sage' : ''}`}>{labels[event.eventType] || event.eventType}</div>
      <div className="col-span-2 text-right font-data-mono">
        <span className={event.affirmingNodes >= event.quorumSize ? 'text-solar-amber' : 'text-veracity-gate-bypass'}>
          Q={event.affirmingNodes}/{event.quorumSize}
        </span>
      </div>
    </div>
  );
}

function EcologyEventRow({ event }: { event: EcologyEvent }) {
  const labels: Record<string, string> = {
    ECO_READING_RECEIVED: 'ECO_INIT',
    ECO_THRESHOLD_BREACH: 'ECO_ALERT',
  };
  const isAlert = event.eventType === 'ECO_THRESHOLD_BREACH';
  const sign = event.temperatureAnomaly >= 0 ? '+' : '';
  return (
    <div className="grid grid-cols-12 gap-1 md:gap-2 text-on-surface-variant group hover:bg-white/5 p-0.5 md:p-1 transition-colors text-[9px] md:text-[11px]">
      <div className="col-span-3 font-data-mono truncate">{formatTimestamp(event.timestamp)}</div>
      <div className="col-span-2 font-data-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>PLANET</div>
      <div className={`col-span-5 font-data-mono truncate ${isAlert ? 'text-deprecated-rust' : 'text-healed-sage'}`}>
        {labels[event.eventType] || event.eventType}
      </div>
      <div className="col-span-2 text-right font-data-mono" style={{ color: isAlert ? '#c0392b' : '#7fba6a' }}>
        {sign}{event.temperatureAnomaly.toFixed(1)}°
      </div>
    </div>
  );
}

export function VeracityLog() {
  const veracityEvents = useSelector((state: RootState) => state.veracity.events);
  const physicalizationEvents = useSelector((state: RootState) => state.physicalization.events);
  const ecologyEvents = useSelector((state: RootState) => state.ecology.events);

  const allEvents = [
    ...veracityEvents.map(e => ({ ...e, _kind: 'veracity' as const })),
    ...physicalizationEvents.map(e => ({ ...e, _kind: 'physicalization' as const })),
    ...ecologyEvents.map(e => ({ ...e, _kind: 'ecology' as const })),
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 30);

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-1 md:mb-2 shrink-0">
        <div className="flex items-center gap-1 md:gap-3">
          <span className="material-symbols-outlined text-solar-amber text-sm md:text-base">receipt_long</span>
          <span className="font-data-mono text-[10px] md:text-sm text-ignition-white">VERACITY_LEDGER</span>
        </div>
        <span className="font-status-label text-[8px] md:text-[10px] text-on-surface-variant">LIVE_FEED</span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {allEvents.length === 0 ? (
          <div className="text-on-surface-variant/40 font-data-mono text-[9px] md:text-[11px] italic">Awaiting events...</div>
        ) : (
          <>
            <div className="grid grid-cols-12 gap-1 md:gap-2 text-on-surface-variant/40 border-b border-ignition-white/5 pb-1 mb-1 md:mb-2 text-[9px] md:text-[10px] font-data-mono shrink-0">
              <div className="col-span-3">TIME</div>
              <div className="col-span-2">NODE</div>
              <div className="col-span-5">EVENT</div>
              <div className="col-span-2 text-right">STATUS</div>
            </div>
            {allEvents.map((event, i) => {
              if (event._kind === 'veracity') {
                return <VeracityEventRow key={event.id || i} event={event} />;
              }
              if (event._kind === 'ecology') {
                return <EcologyEventRow key={event.id || i} event={event} />;
              }
              return <PhysicalizationEventRow key={event.id || i} event={event} />;
            })}
          </>
        )}
      </div>
    </div>
  );
}