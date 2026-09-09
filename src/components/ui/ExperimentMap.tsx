import { useEffect, useState } from 'react';
import { fetchEcologyData, EcologyData } from '../../services/apiService';

const POLL_MS = 300_000;

const REFERENCE_POINTS = [
  { id: 'arctic',   lat: 70,  lon: 0, label: 'ARCTIC',     sublabel: 'Greenland Sea · 70°N 0°E',   weight: '2×' },
  { id: 'equator',  lat: 0,   lon: 0, label: 'EQUATORIAL', sublabel: 'Gulf of Guinea · 0°N 0°E',   weight: '1×' },
  { id: 'southern', lat: -60, lon: 0, label: 'SOUTHERN',   sublabel: 'Southern Ocean · 60°S 0°E',  weight: '2×' },
];

const W = 720;
const H = 360;

function project(lat: number, lon: number) {
  return { x: (lon + 180) / 360 * W, y: (90 - lat) / 180 * H };
}

const LAT_LINES = [-90, -60, -30, 0, 30, 60, 90];
const LON_LINES = [-180, -150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180];

function ecoColor(health: number) {
  if (health >= 0.7) return '#3FF4D5';  // cyan
  if (health >= 0.4) return '#F47B3F';  // orange
  return '#F43F5E';                      // rose
}

export function ExperimentMap() {
  const [data, setData] = useState<EcologyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const result = await fetchEcologyData();
      if (cancelled) return;
      if (result.ok && result.data) {
        setData(result.data);
        setLastUpdated(Date.now());
      }
      setLoading(false);
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const health = data?.ecoHealth ?? 0;
  const anomaly = data?.temperatureAnomaly ?? 0;
  const color = ecoColor(health);
  const healthPct = Math.round(health * 100);
  const anomalySign = anomaly >= 0 ? '+' : '';

  return (
    <div
      className="min-h-screen flex flex-col font-mono"
      style={{ backgroundColor: '#000', color: '#c4c7c8' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }} />
          <span className="text-sm tracking-widest uppercase">Sovereign Mirror · Planetary Anchor</span>
        </div>
        <div className="flex items-center gap-6 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {lastUpdated > 0 && (
            <span>Updated {new Date(lastUpdated).toISOString().replace('T', ' ').slice(0, 19)} UTC</span>
          )}
          <a href="/" className="hover:text-white transition-colors">← Dashboard</a>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">

        {loading && !data && (
          <div className="text-xs italic" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Fetching ecological reference data...
          </div>
        )}

        {/* SVG Map */}
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full max-w-5xl rounded-lg"
          style={{ border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(4,4,4,0.9)' }}
          aria-label="Planetary ecological reference map - equirectangular projection"
        >
          {/* Latitude grid */}
          {LAT_LINES.map(lat => {
            const y = project(lat, 0).y;
            const isEquator = lat === 0;
            return (
              <g key={`lat${lat}`}>
                <line x1={0} y1={y} x2={W} y2={y}
                  stroke={isEquator ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}
                  strokeWidth={isEquator ? 0.8 : 0.4}
                />
                {lat !== -90 && lat !== 90 && (
                  <text x={6} y={y - 3} fill="rgba(255,255,255,0.18)" fontSize={8} fontFamily="monospace">
                    {lat >= 0 ? `${lat}°N` : `${Math.abs(lat)}°S`}
                  </text>
                )}
              </g>
            );
          })}

          {/* Longitude grid */}
          {LON_LINES.map(lon => {
            const x = project(0, lon).x;
            const isPrime = lon === 0;
            return (
              <g key={`lon${lon}`}>
                <line x1={x} y1={0} x2={x} y2={H}
                  stroke={isPrime ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.04)'}
                  strokeWidth={isPrime ? 0.8 : 0.3}
                />
                {lon !== -180 && lon !== 180 && (
                  <text x={x + 2} y={H - 4} fill="rgba(255,255,255,0.14)" fontSize={7} fontFamily="monospace">
                    {lon}°
                  </text>
                )}
              </g>
            );
          })}

          {/* Data markers */}
          {REFERENCE_POINTS.map(pt => {
            const { x, y } = project(pt.lat, pt.lon);
            const labelSide = pt.lat > 0 ? 'above' : 'below';
            const labelY = labelSide === 'above' ? y - 18 : y + 26;

            return (
              <g key={pt.id}>
                {/* Outer pulse */}
                <circle cx={x} cy={y} r={12} fill="none" stroke={color} strokeWidth={0.6} opacity={0.2}>
                  <animate attributeName="r" values="8;18;8" dur="4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.25;0.04;0.25" dur="4s" repeatCount="indefinite" />
                </circle>
                {/* Mid ring */}
                <circle cx={x} cy={y} r={7} fill="none" stroke={color} strokeWidth={0.8} opacity={0.45} />
                {/* Core dot */}
                <circle cx={x} cy={y} r={3.5} fill={color} opacity={0.9} />
                {/* Crosshair */}
                <line x1={x - 12} y1={y} x2={x - 4} y2={y} stroke={color} strokeWidth={0.6} opacity={0.5} />
                <line x1={x + 4} y1={y} x2={x + 12} y2={y} stroke={color} strokeWidth={0.6} opacity={0.5} />
                <line x1={x} y1={y - 12} x2={x} y2={y - 4} stroke={color} strokeWidth={0.6} opacity={0.5} />
                <line x1={x} y1={y + 4} x2={x} y2={y + 12} stroke={color} strokeWidth={0.6} opacity={0.5} />
                {/* Label */}
                <text x={x} y={labelY} textAnchor="middle" fill={color} fontSize={9} fontFamily="monospace" fontWeight="bold">
                  {pt.label}
                </text>
                <text x={x} y={labelY + 11} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize={7} fontFamily="monospace">
                  {pt.sublabel}
                </text>
                <text x={x} y={labelY + 21} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize={6.5} fontFamily="monospace">
                  weight {pt.weight}
                </text>
              </g>
            );
          })}

          {/* Data source annotation - prime meridian callout */}
          <line x1={W / 2} y1={0} x2={W / 2} y2={H}
            stroke={color} strokeWidth={0.4} strokeDasharray="3,4" opacity={0.2} />
          <text x={W / 2 + 4} y={10} fill="rgba(255,255,255,0.2)" fontSize={7} fontFamily="monospace">
            0° MERIDIAN - all collection points
          </text>

          {/* ecoHealth fill bar */}
          <rect x={0} y={H - 6} width={W} height={6} fill="rgba(255,255,255,0.04)" />
          <rect x={0} y={H - 6} width={W * health} height={6} fill={color} opacity={0.6} />
          <text x={6} y={H - 1} fill="rgba(255,255,255,0.3)" fontSize={5.5} fontFamily="monospace">
            ECO HEALTH {healthPct}%
          </text>
          <text x={W - 6} y={H - 1} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize={5.5} fontFamily="monospace">
            Δ TEMP {anomalySign}{anomaly.toFixed(2)}°C
          </text>
        </svg>

        {/* Readout strip */}
        <div
          className="w-full max-w-5xl grid grid-cols-3 gap-px text-xs"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          {REFERENCE_POINTS.map(pt => (
            <div key={pt.id} className="p-4" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="text-[10px] tracking-widest mb-2" style={{ color }}>
                {pt.label} REFERENCE
              </div>
              <div className="space-y-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                <div className="flex justify-between">
                  <span>Coordinates</span>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>{pt.sublabel.split('·')[1]?.trim()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Quorum weight</span>
                  <span style={{ color }}>{pt.weight}</span>
                </div>
                <div className="flex justify-between">
                  <span>Data source</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>Open-Meteo ERA5</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Formula strip */}
        <div
          className="w-full max-w-5xl p-4 text-[11px]"
          style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="text-[10px] tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
            ANOMALY FORMULA
          </div>
          <div className="grid grid-cols-2 gap-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <div>
              <div className="mb-1">Weighted temperature anomaly:</div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace' }}>
                Δ = Σ(w · (T_observed − T_normal_month)) / Σw
              </div>
            </div>
            <div>
              <div className="mb-1">Ecological health index:</div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace' }}>
                H = clamp(1 − Δ / 6.0, 0, 1)
              </div>
            </div>
          </div>
          <div className="mt-3 text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Baseline: pre-industrial 1850–1900 (IPCC AR6 zone offsets applied to ERA5 ocean surface means) ·
            Arctic −2.0°C · Equatorial −0.7°C · Southern Ocean −1.0°C · Max scale: 6°C · Cache TTL: 5 min
          </div>
        </div>
      </div>
    </div>
  );
}
