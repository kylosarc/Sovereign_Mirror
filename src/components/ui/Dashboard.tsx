import { useState, useEffect } from 'react';
import { ResonanceTrajectory } from '../three/ResonanceTrajectory';
import { VeracityLog } from '../hud/VeracityLog';
import { useHUDStore } from '../../state/stores/hudStore';
import { useNodeStore } from '../../state/stores/nodeStore';
import { SystemicSliders } from './SystemicSliders';
import { PGateButton } from './PGateButton';
import { CryptoStatusPanel } from './CryptoStatusPanel';
import { EcologyMap } from './EcologyMap';

type NavSection = 'analytics' | 'grain' | 'bolt' | 'architecture' | 'training';

export function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<NavSection>('analytics');

  const handleNavClick = (section: string) => {
    const sectionMap: Record<string, NavSection> = {
      'Systemic Parameters': 'analytics',
      'Trajectory Matrix': 'grain',
      'Flux Density': 'bolt',
      'Quantum Alignment': 'architecture',
      'Node Training': 'training',
      'ULTRANS': 'training',
    };
    const mapped = sectionMap[section];
    if (mapped) {
      setActiveSection(mapped);
      setSidebarOpen(false);
    }
    // Placeholder nav items (sensors, network_ping, settings) are intentionally no-ops
  };

  const navItems: { id: NavSection; icon: string; label: string; sectionKey: string }[] = [
    { id: 'analytics', icon: 'analytics', label: 'Parameters', sectionKey: 'Systemic Parameters' },
    { id: 'grain', icon: 'grain', label: 'Trajectory', sectionKey: 'Trajectory Matrix' },
    { id: 'bolt', icon: 'bolt', label: 'Flux', sectionKey: 'Flux Density' },
    { id: 'architecture', icon: 'architecture', label: 'Quantum', sectionKey: 'Quantum Alignment' },
    { id: 'training', icon: 'psychology', label: 'Ultrans', sectionKey: 'ULTRANS' },
  ];

  return (
    <div className="relative bg-void-black overflow-hidden flex flex-col" style={{ backgroundColor: '#000000', color: '#e5e2e1', height: '100vh', minHeight: '-webkit-fill-available' }}>
      <header className="backdrop-blur-xl border-b flex justify-between items-center w-full px-4 md:px-16 h-12 md:h-16 shrink-0" style={{ backgroundColor: 'rgba(10, 10, 10, 0.8)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
        <div className="flex items-center gap-2 md:gap-6">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden w-8 h-8 flex flex-col justify-center items-center cursor-pointer" style={{ background: 'none', border: 'none' }}>
                <span className={`w-5 h-0.5 mb-1 transition-all ${sidebarOpen ? 'rotate-45 translate-y-2' : ''}`} style={{ backgroundColor: '#ffffff' }}></span>
                <span className={`w-5 h-0.5 mb-1 transition-all ${sidebarOpen ? 'opacity-0' : ''}`} style={{ backgroundColor: '#ffffff' }}></span>
                <span className={`w-5 h-0.5 transition-all ${sidebarOpen ? '-rotate-45 -translate-y-2' : ''}`} style={{ backgroundColor: '#ffffff' }}></span>
              </button>
          <h1 className="text-sm md:text-xl font-bold tracking-tighter" style={{ color: '#ffffff' }}>SOVEREIGN MIRROR</h1>
          <span className="text-xs px-2 py-1 hidden md:inline" style={{ color: '#FFB300', backgroundColor: 'rgba(255, 179, 0, 0.1)', border: '1px solid rgba(255, 179, 0, 0.2)' }}>RESONANCE_TRAJECTORY</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2 md:gap-4">
            <button onClick={() => handleNavClick('sensors')} className="material-symbols-outlined cursor-pointer transition-colors hover:text-amber-400 text-sm" style={{ color: '#ffffff', background: 'none', border: 'none' }}>sensors</button>
            <button onClick={() => handleNavClick('network_ping')} className="material-symbols-outlined cursor-pointer transition-colors hover:text-amber-400 text-sm" style={{ color: '#ffffff', background: 'none', border: 'none' }}>network_ping</button>
            <button onClick={() => handleNavClick('settings')} className="material-symbols-outlined cursor-pointer transition-colors hover:text-amber-400 text-sm" style={{ color: '#ffffff', background: 'none', border: 'none' }}>settings</button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative overflow-hidden">
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}
        <nav className={`fixed left-0 top-12 md:top-16 h-[calc(100vh-96px)] md:h-[calc(100vh-128px)] z-50 md:z-40 flex flex-col backdrop-blur-2xl border-r w-48 md:w-64 shrink-0 transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`} style={{ backgroundColor: 'rgba(10, 10, 10, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
            <div>
              <div className="text-sm md:text-lg" style={{ color: '#ffffff' }}>CU_CONTROL</div>
              <div className="text-[8px] md:text-[10px] opacity-60" style={{ color: '#c4c7c8' }}>SYSTEMIC_PARAMETERS_v4.2</div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden w-8 h-8 flex flex-col justify-center items-center">
                <span className="w-5 h-0.5 rotate-45 translate-y-1" style={{ backgroundColor: '#ffffff' }}></span>
                <span className="w-5 h-0.5 -rotate-45 -translate-y-1" style={{ backgroundColor: '#ffffff' }}></span>
              </button>
          </div>
          <div className="flex-1 py-2 md:py-4 flex flex-col gap-0 md:gap-1 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.sectionKey)}
                className="pl-3 md:pl-4 py-2 md:py-3 transition-all flex items-center gap-2 md:gap-3 border-l-2 text-left"
                style={{
                  backgroundColor: activeSection === item.id ? 'rgba(255, 255, 255, 0.05)' : 'none',
                  color: '#c4c7c8',
                  border: 'none',
                  borderLeft: activeSection === item.id ? '2px solid #FFB300' : '2px solid transparent',
                }}
              >
                <span className="material-symbols-outlined text-sm md:text-base" style={{ color: activeSection === item.id ? '#FFB300' : '#c4c7c8' }}>{item.icon}</span>
                <span className="text-[9px] md:text-[10px] font-mono" style={{ color: activeSection === item.id ? '#ffffff' : '#c4c7c8' }}>{item.label}</span>
              </button>
            ))}
          </div>
          <div className="p-2 md:p-4 mt-auto">
            <button onClick={() => handleNavClick('INITIATE_IGNITION')} className="w-full py-2 md:py-4 font-mono font-bold tracking-widest uppercase transition-colors text-xs md:text-sm" style={{ backgroundColor: '#FFB300', color: '#000000', border: 'none', cursor: 'pointer' }}>
              IGNITION
            </button>
          </div>
        </nav>

        <main className="flex-1 relative flex flex-col md:overflow-hidden md:ml-64 overflow-y-auto" style={{ backgroundColor: '#000000' }}>
          <div className="grid grid-cols-12 gap-2 md:gap-4 p-2 md:p-4 md:flex-1 md:overflow-hidden">
            <div className="col-span-12 lg:col-span-8 backdrop-blur-2xl rounded-lg p-2 md:p-4 flex flex-col relative overflow-hidden border md:min-h-0" style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)', borderColor: 'rgba(255, 255, 255, 0.1)', minHeight: '50vh', height: '50vh' }}>
              {/* Background glow effect */}
              <div className="absolute inset-0 pointer-events-none z-0" style={{
                background: 'radial-gradient(circle at 50% 50%, rgba(255, 179, 0, 0.08) 0%, transparent 60%)'
              }} />
              <div className="scanline" />
              <div className="flex justify-between items-start mb-1 md:mb-2 relative z-10">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 animate-pulse" style={{ backgroundColor: '#FFB300', boxShadow: '0 0 8px #FFB300' }}></div>
                    <span className="text-[10px] md:text-xs font-mono" style={{ color: '#ffffff' }}>RESONANCE TRAJECTORY</span>
                  </div>
                </div>
                <div className="flex gap-2 md:gap-4 text-[9px] md:text-[11px] font-mono" style={{ color: '#c4c7c8' }}>
                  <span>dV: <span style={{ color: '#ffffff' }}>~±1.42</span></span>
                  <span className="hidden md:inline">FRAME: <span style={{ color: '#FFB300' }}>16.6ms</span></span>
                </div>
              </div>
              <div className="flex-1 relative" style={{ minHeight: '300px', height: 'clamp(300px, 40vh, 400px)' }}>
                <ResonanceTrajectory />
                {/* HUD Overlay - Top Left */}
                <div className="absolute top-2 left-2 z-20 p-2 border backdrop-blur-md rounded" style={{ backgroundColor: 'rgba(10, 10, 10, 0.7)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                  <div className="text-[9px] font-mono text-amber-400 mb-1">RESONANCE TRAJECTORY</div>
                  <div className="space-y-0.5 text-[9px] font-mono" style={{ color: '#c4c7c8' }}>
                    <div className="flex justify-between gap-4"><span>dV:</span> <span style={{ color: '#ffffff' }}>~±1.42</span></div>
                    <div className="flex justify-between gap-4"><span>FRAME:</span> <span style={{ color: '#FFB300' }}>16.6ms</span></div>
                  </div>
                </div>
                {/* HUD Overlay - Top Right */}
                <div className="absolute top-2 right-2 z-20 text-[9px] font-mono" style={{ color: '#c4c7c8' }}>
                  INVERION_DIVIDE: SHRED_ACTIVE
                </div>
                {/* HUD Overlay - Bottom Left */}
                <div className="absolute bottom-2 left-2 z-20 p-2 border backdrop-blur-md rounded" style={{ backgroundColor: 'rgba(10, 10, 10, 0.7)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                  <div className="text-[9px] font-mono mb-2" style={{ color: '#c4c7c8' }}>SYSTEM OVERVIEWS</div>
                  <div className="space-y-1 text-[9px] font-mono" style={{ color: '#c4c7c8' }}>
                    <div className="flex justify-between gap-4"><span>GASKET:</span> <span style={{ color: '#00FF41' }}>Level 4</span></div>
                    <div className="flex justify-between gap-4"><span>DISP:</span> <span>~0.01</span></div>
                  </div>
                </div>
                {/* HUD Overlay - Bottom Right */}
                <div className="absolute bottom-2 right-2 z-20 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#00FF41' }}></div>
                  <span className="text-[9px] font-mono" style={{ color: '#c4c7c8' }}>0x4FF2A</span>
                </div>
              </div>
              <div className="mt-1 md:mt-2 flex justify-between text-[9px] md:text-[10px] font-mono border-t pt-2" style={{ color: '#c4c7c8', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                <span style={{ color: '#FFB300' }}>INVERION_DIVIDE</span>
                <span>NODE: 0x4FF2A</span>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4 flex flex-col gap-2 md:gap-4 md:min-h-0 md:overflow-y-auto">
              {activeSection === 'analytics' && (
                <>
                  <div className="backdrop-blur-2xl border p-2 md:p-4 rounded-lg" style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                    <div className="text-[10px] md:text-[11px] mb-2 md:mb-3 pb-2 border-b" style={{ color: '#FFB300', borderColor: 'rgba(255, 255, 255, 0.1)' }}>CU PARAMETERS</div>
                    <SystemicSliders />
                  </div>

                  <div className="backdrop-blur-2xl border p-2 md:p-4 rounded-lg flex flex-col" style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                    <div className="font-mono text-xs mb-2 md:mb-3" style={{ color: '#FFF7ED' }}>NODE STATUS</div>
                    <div className="flex-1">
                      <NodeStatusPanel />
                    </div>
                    <PGateButton nodeId="NODE_001" />
                  </div>
                </>
              )}

              {activeSection === 'grain' && <TrajectoryMatrixPanel />}
              {activeSection === 'bolt' && <FluxDensityPanel />}
              {activeSection === 'architecture' && (
                <>
                  <QuantumAlignmentPanel />
                  <CryptoStatusPanel />
                  <div className="backdrop-blur-2xl border p-2 md:p-4 rounded-lg" style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                    <EcologyMap />
                  </div>
                </>
              )}
              {activeSection === 'training' && (
                <div className="col-span-12 backdrop-blur-2xl border p-2 md:p-4 rounded-lg" style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                  <div className="text-[10px] md:text-[11px] mb-2 md:mb-3 pb-2 border-b flex justify-between items-center" style={{ color: '#FFB300', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                    <span>COGNOSCENTAE ULTRANS</span>
                    <span className="text-[8px] opacity-50">PSYCHOLOGY</span>
                  </div>
                  <a href="https://kylosarc.com/training/intellectual_veracity/" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,183,0,0.6)', fontSize: '0.75rem', fontFamily: 'monospace', textDecoration: 'none' }}>
                    OPEN TRAINING MODULE →
                  </a>
                </div>
              )}

              {activeSection === 'training' && <SimulationMetricsPanel />}
            </div>

            <div className="col-span-12 backdrop-blur-2xl border p-2 md:p-4 rounded-lg flex-1 min-h-[120px] md:min-h-0" style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
              <VeracityLog />
            </div>
          </div>
        </main>
      </div>

      <footer className="h-16 md:h-24 z-50 flex-shrink-0 flex flex-col border-t overflow-hidden" style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)', borderColor: 'rgba(255, 179, 0, 0.2)' }}>
        <div className="flex-1 grid grid-cols-12 gap-1 md:gap-4 px-1 md:px-4 py-1 md:py-2 overflow-hidden">
          <div className="col-span-12 md:col-span-8 flex flex-col h-full border-r pr-1 md:pr-4 overflow-hidden" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
            <div className="flex justify-between items-center mb-0.5 md:mb-1">
              <span className="text-[8px] md:text-[10px] font-mono" style={{ color: '#ffffff' }}>VERACITY_LEDGER</span>
              <div className="flex gap-1 md:gap-4 text-[7px] md:text-[9px] font-mono hidden md:flex" style={{ color: '#636565' }}>
                <span className="cursor-pointer transition-colors hover:text-white">LATEST</span>
                <span className="cursor-pointer transition-colors hover:text-white">ERRORS</span>
                <span className="cursor-pointer transition-colors hover:text-white">SYNC</span>
              </div>
            </div>
            <div className="flex-1 font-mono text-[8px] md:text-[10px] space-y-0.5 md:space-y-1 overflow-y-auto pr-0.5 md:pr-2 scrollbar-thin" style={{ color: '#c4c7c8' }}>
              <div className="flex gap-1 md:gap-4">
                <span style={{ color: '#FFB300' }}>[AUDIT]</span>
                <span style={{ color: '#ffffff' }}>[ZK]</span>
                <span>dV: 0.880</span>
                <span className="ml-auto opacity-50">14:32</span>
              </div>
            </div>
          </div>
          <div className="col-span-12 md:col-span-4 flex flex-col h-full justify-between">
            <div className="text-[8px] md:text-[10px] font-mono mb-0.5 md:mb-1" style={{ color: '#c4c7c8' }}>SOVEREIGN ARCHIVE</div>
            <div className="space-y-0.5 md:space-y-1">
              <div className="text-[8px] md:text-[10px] font-mono flex justify-between" style={{ color: '#636565' }}>
                <span>DB Lat:</span>
                <span style={{ color: '#ffffff' }}>22ms</span>
              </div>
              <div className="text-[8px] md:text-[10px] font-mono flex justify-between" style={{ color: '#636565' }}>
                <span>Backlog:</span>
                <span style={{ color: '#FFB300' }}>98%</span>
              </div>
              <div className="h-0.5 md:h-1 mt-0.5" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                <div className="h-full" style={{ width: '98%', background: 'linear-gradient(to right, rgba(255, 179, 0, 0.2), #FFB300, #ffffff)' }}></div>
              </div>
            </div>
          </div>
        </div>
        <div className="h-5 md:h-8 flex justify-between items-center px-1 md:px-4 border-t" style={{ backgroundColor: '#000000', borderColor: 'rgba(255, 179, 0, 0.1)' }}>
          <div className="flex items-center gap-1 md:gap-2">
            <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full animate-pulse hidden md:inline" style={{ backgroundColor: '#FFB300' }}></span>
            <span className="text-[8px] md:text-[10px] font-mono" style={{ color: '#ffffff' }}>LEDGER</span>
          </div>
          <div className="font-mono text-[7px] md:text-[9px] tracking-[0.1em] hidden md:inline" style={{ color: '#636565' }}>
            KEY: 72A-D9K-X04
          </div>
        </div>
      </footer>
    </div>
  );
}

function NodeStatusPanel() {
  const temperature = useHUDStore((s) => s.temperature);
  const noiseFilter = useHUDStore((s) => s.noiseFilter);
  const sunriseOpacity = useHUDStore((s) => s.sunriseOpacity);
  const effectiveTickRate = useHUDStore((s) => s.effectiveTickRate);

  return (
    <div className="font-mono text-xs space-y-2" style={{ color: '#c4c7c8' }}>
      <div className="flex justify-between">
        <span>Temperature:</span>
        <span style={{ color: '#FFB300' }}>{(temperature * 100).toFixed(1)}%</span>
      </div>
      <div className="flex justify-between">
        <span>Noise Filter:</span>
        <span style={{ color: '#FFB300' }}>{(noiseFilter * 100).toFixed(1)}%</span>
      </div>
      <div className="flex justify-between">
        <span>Sunrise Opacity:</span>
        <span style={{ color: '#F43F5E' }}>{sunriseOpacity.toFixed(3)}</span>
      </div>
      <div className="flex justify-between">
        <span>Tick Rate:</span>
        <span style={{ color: '#FFB300' }}>{effectiveTickRate.toFixed(0)}ms</span>
      </div>
    </div>
  );
}

function TrajectoryMatrixPanel() {
  const temperature = useHUDStore((s) => s.temperature);
  const noiseFilter = useHUDStore((s) => s.noiseFilter);
  const flux = useNodeStore((s) => s.flux);

  return (
    <div className="backdrop-blur-2xl border p-2 md:p-4 rounded-lg" style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
      <div className="text-[10px] md:text-[11px] mb-2 md:mb-3 pb-2 border-b flex justify-between items-center" style={{ color: '#FFB300', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
        <span>TRAJECTORY MATRIX</span>
        <span className="text-[8px] opacity-50">GRAIN</span>
      </div>
      <div className="space-y-3 font-mono text-[9px] md:text-[10px]" style={{ color: '#c4c7c8' }}>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex justify-between">
            <span>Alpha:</span>
            <span style={{ color: '#FFB300' }}>{flux.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span>Beta:</span>
            <span>{(temperature * 2 - 1).toFixed(3)}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex justify-between">
            <span>Noise:</span>
            <span style={{ color: '#FFB300' }}>{noiseFilter.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delta:</span>
            <span>{(flux * noiseFilter).toFixed(3)}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex justify-between">
            <span>Entropy:</span>
            <span>{((1 - flux) * noiseFilter).toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span>Phase:</span>
            <span style={{ color: '#FFB300' }}>{((temperature + noiseFilter) % 1).toFixed(3)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FluxDensityPanel() {
  const flux = useNodeStore((s) => s.flux);
  const temperature = useHUDStore((s) => s.temperature);
  const noiseFilter = useHUDStore((s) => s.noiseFilter);

  const fluxDensity = flux * (1 - noiseFilter) * (1 + temperature);

  return (
    <div className="backdrop-blur-2xl border p-2 md:p-4 rounded-lg" style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
      <div className="text-[10px] md:text-[11px] mb-2 md:mb-3 pb-2 border-b flex justify-between items-center" style={{ color: '#FFB300', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
        <span>FLUX DENSITY</span>
        <span className="text-[8px] opacity-50">BOLT</span>
      </div>
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-2xl md:text-3xl font-bold" style={{ color: '#FFB300' }}>{fluxDensity.toFixed(4)}</div>
          <div className="text-[8px] opacity-50">DENSITY_UNITS</div>
        </div>
        <div className="space-y-2 font-mono text-[9px] md:text-[10px]" style={{ color: '#c4c7c8' }}>
          <div className="flex justify-between">
            <span>Alpha Flux:</span>
            <span style={{ color: '#FFB300' }}>{(flux * 1.5).toFixed(4)}</span>
          </div>
          <div className="flex justify-between">
            <span>Noise Attenuation:</span>
            <span>{(1 - noiseFilter).toFixed(4)}</span>
          </div>
          <div className="flex justify-between">
            <span>Thermal Gain:</span>
            <span>{(1 + temperature).toFixed(4)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuantumAlignmentPanel() {
  const flux = useNodeStore((s) => s.flux);
  const temperature = useHUDStore((s) => s.temperature);
  const noiseFilter = useHUDStore((s) => s.noiseFilter);

  const alignment = Math.sqrt(flux * temperature * (1 - noiseFilter));

  return (
    <div className="backdrop-blur-2xl border p-2 md:p-4 rounded-lg" style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
      <div className="text-[10px] md:text-[11px] mb-2 md:mb-3 pb-2 border-b flex justify-between items-center" style={{ color: '#FFB300', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
        <span>QUANTUM ALIGNMENT</span>
        <span className="text-[8px] opacity-50">ARCHITECTURE</span>
      </div>
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-2xl md:text-3xl font-bold" style={{ color: '#FFB300' }}>{alignment.toFixed(4)}</div>
          <div className="text-[8px] opacity-50">ALIGNMENT_SCORE</div>
        </div>
<div className="space-y-2 font-mono text-[9px] md:text-[10px]" style={{ color: '#c4c7c8' }}>
          <div className="flex justify-between">
            <span>Stability:</span>
            <span>{(1 - noiseFilter).toFixed(4)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SimulationMetricsPanel() {
  const [metrics, setMetrics] = useState<{
    collective_v_active: number;
    cascade_risk: number;
    pgate_success_rate: number;
    agent_count: number;
    cooperation_rate: number;
    defection_rate: number;
  } | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/simulation/metrics');
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch {
        // Simulation not running
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="backdrop-blur-2xl border p-2 md:p-4 rounded-lg" style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
      <div className="text-[10px] md:text-[11px] mb-2 md:mb-3 pb-2 border-b flex justify-between items-center" style={{ color: '#FFB300', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
        <span>AGENT SIMULATION</span>
        <span className="text-[8px] opacity-50">LIVE</span>
      </div>
      {metrics ? (
        <div className="space-y-3 font-mono text-[9px] md:text-[10px]" style={{ color: '#c4c7c8' }}>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg md:text-xl font-bold" style={{ color: '#00FF41' }}>{metrics.collective_v_active.toFixed(3)}</div>
              <div className="text-[8px] opacity-50">V_ACTIVE</div>
            </div>
            <div>
              <div className="text-lg md:text-xl font-bold" style={{ color: metrics.cascade_risk > 0.5 ? '#FF4500' : '#FFB300' }}>{metrics.cascade_risk.toFixed(3)}</div>
              <div className="text-[8px] opacity-50">CASCADE_RISK</div>
            </div>
            <div>
              <div className="text-lg md:text-xl font-bold" style={{ color: '#FFB300' }}>{metrics.pgate_success_rate.toFixed(3)}</div>
              <div className="text-[8px] opacity-50">PGATE</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg md:text-xl font-bold" style={{ color: '#ffffff' }}>{metrics.agent_count}</div>
              <div className="text-[8px] opacity-50">AGENTS</div>
            </div>
            <div>
              <div className="text-lg md:text-xl font-bold" style={{ color: '#00FF41' }}>{metrics.cooperation_rate.toFixed(2)}</div>
              <div className="text-[8px] opacity-50">COOP_RATE</div>
            </div>
            <div>
              <div className="text-lg md:text-xl font-bold" style={{ color: '#FF4500' }}>{metrics.defection_rate.toFixed(2)}</div>
              <div className="text-[8px] opacity-50">DEFECT_RATE</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-[10px]" style={{ color: '#636565' }}>
          Simulation not running on localhost:5001
        </div>
      )}
    </div>
  );
}