import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../state/ledger/store';
import { setCryptoStatus, setCryptoLoading, setCryptoError, CryptoLayerStatus } from '../../state/ledger/slices/cryptoSlice';
import { fetchCryptoStatus, cryptoKeypair, cryptoSign } from '../../services/apiService';

const LAYER_ORDER = ['mayo1', 'mayo3', 'mayo5', 'falcon512', 'ml_dsa_65', 'sphincs_256f'];
const LAYER_FAMILIES: Record<string, { label: string; color: string; desc: string }> = {
  mayo1:    { label: 'MAYO-1 (MQ)',   color: 'text-ultranetic-amber', desc: 'MQ Speed' },
  mayo3:    { label: 'MAYO-3 (MQ)',   color: 'text-ultranetic-amber', desc: 'MQ Speed' },
  mayo5:    { label: 'MAYO-5 (MQ)',   color: 'text-ultranetic-amber', desc: 'MQ Speed' },
  falcon512:{ label: 'Falcon-512',    color: 'text-deprecated-rust',  desc: 'Temp Patch' },
  ml_dsa_65:{ label: 'ML-DSA-65',    color: 'text-healed-sage',      desc: 'Lattice Primary' },
  sphincs_256f:{ label: 'SPHINCS+',  color: 'text-physical-rose',    desc: 'Hash Anchor' },
};

function sortLayers(layers: CryptoLayerStatus[]): CryptoLayerStatus[] {
  const map = new Map(layers.map(l => [l.id, l]));
  return LAYER_ORDER.map(id => map.get(id)).filter((l): l is CryptoLayerStatus => l != null);
}

export function CryptoStatusPanel() {
  const dispatch = useDispatch();
  const { layers, lastUpdated, loading, error } = useSelector((state: RootState) => state.crypto);
  const [selectedAlgo, setSelectedAlgo] = useState('mayo1');
  const [generating, setGenerating] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const loadStatus = useCallback(() => {
    dispatch(setCryptoLoading());
    fetchCryptoStatus().then(result => {
      if (result.ok && result.data) {
        dispatch(setCryptoStatus(result.data));
      } else {
        dispatch(setCryptoError(result.error || 'fetch failed'));
      }
    });
  }, [dispatch]);

  // Initial load + interval refresh
  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 15000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  const sorted = sortLayers(layers);

  const handleTestKeypair = async () => {
    setGenerating(true);
    setTestResult(null);
    try {
      const kpRes = await cryptoKeypair(selectedAlgo);
      if (kpRes.ok && kpRes.data) {
        const kp = kpRes.data;
        const signRes = await cryptoSign(selectedAlgo, 'QPADL_GATE_TEST_PAYLOAD', kp.secret_key);
        if (signRes.ok && signRes.data) {
          setTestResult(`✓ ${selectedAlgo.toUpperCase()} signed: ${signRes.data.signature.slice(0, 16)}...`);
        } else {
          setTestResult(`✓ Keypair generated (PK: ${kp.public_key.slice(0, 12)}...)`);
        }
      } else {
        setTestResult(`✗ Error: ${kpRes.error || 'generation failed'}`);
      }
    } catch (e: any) {
      setTestResult(`✗ ${e.message || 'failed'}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="backdrop-blur-2xl border p-2 md:p-4 rounded-lg text-radiant-cream font-mono" style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
      <div className="flex items-center justify-between mb-3 border-b pb-2" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
        <div className="flex items-center">
          <span className="w-2 h-2 bg-healed-sage rounded-full mr-2 animate-pulse" />
          <span className="text-xs md:text-sm font-bold tracking-wider" style={{ color: '#FFB300' }}>QPADL CRYPTO</span>
        </div>
        <span className="text-[9px] md:text-[10px] text-healed-sage border border-healed-sage/30 px-1.5 py-0.5 rounded bg-healed-sage/10">
          DAEMON LIVE
        </span>
      </div>

      {loading && layers.length === 0 && (
        <div className="text-white/40 text-xs italic py-2">Querying post-quantum layers...</div>
      )}
      {error && layers.length === 0 && (
        <div className="text-deprecated-rust text-xs mb-2 py-1">Connecting to crypto daemon... ({error})</div>
      )}

      <div className="space-y-1.5">
        {sorted.map((layer) => {
          const info = LAYER_FAMILIES[layer.id] || { label: layer.oqs_name, color: 'text-white/60', desc: '' };
          return (
            <div key={layer.id} className="flex items-center justify-between text-xs py-0.5">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${layer.enabled ? 'bg-healed-sage' : 'bg-deprecated-rust'}`} />
                <span className={info.color}>{info.label}</span>
                {info.desc && <span className="text-white/40 text-[10px]">({info.desc})</span>}
              </div>
              <span className="text-white/50 text-[10px]">L{layer.level}</span>
            </div>
          );
        })}
      </div>

      {/* Live Post-Quantum Test Widget */}
      <div className="mt-3 pt-2.5 border-t border-white/10">
        <div className="text-[9px] text-white/50 mb-1">REAL-TIME SIGNATURE HARNESS:</div>
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
          <select 
            value={selectedAlgo} 
            onChange={(e) => setSelectedAlgo(e.target.value)}
            className="bg-black/60 border border-white/15 text-[10px] text-white/90 rounded px-1.5 py-1 outline-none flex-1"
          >
            <option value="mayo1">MAYO-1 (MQ Level 1)</option>
            <option value="mayo3">MAYO-3 (MQ Level 3)</option>
            <option value="mayo5">MAYO-5 (MQ Level 5)</option>
            <option value="falcon512">Falcon-512 (Lattice Level 1)</option>
            <option value="ml_dsa_65">ML-DSA-65 (Lattice Level 3)</option>
            <option value="sphincs_256f">SPHINCS+ (Hash Level 5)</option>
          </select>
          <button
            onClick={handleTestKeypair}
            disabled={generating}
            className="text-[10px] bg-white/10 hover:bg-white/20 border border-white/20 px-2.5 py-1 rounded text-radiant-cream transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            {generating ? 'Testing...' : 'Test Key & Sign'}
          </button>
        </div>
        {testResult && (
          <div className={`text-[9px] truncate p-1 rounded bg-black/40 ${testResult.startsWith('✓') ? 'text-healed-sage' : 'text-deprecated-rust'}`}>
            {testResult}
          </div>
        )}
      </div>

      {lastUpdated > 0 && (
        <div className="text-white/30 text-[9px] mt-2 flex justify-between">
          <span>Synced with liboqs</span>
          <span>Updated {new Date(lastUpdated).toISOString().slice(11, 19)} UTC</span>
        </div>
      )}
    </div>
  );
}
