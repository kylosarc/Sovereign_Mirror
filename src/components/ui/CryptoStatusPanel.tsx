import { useEffect, useState } from 'react';
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

const REFRESH_MS = 30_000;
const RETRY_MS = 10_000;

export function CryptoStatusPanel() {
  const dispatch = useDispatch();
  const { layers, lastUpdated, loading, error } = useSelector((state: RootState) => state.crypto);
  const [selectedAlgo, setSelectedAlgo] = useState('mayo1');
  const [generating, setGenerating] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    const now = Date.now();
    if (lastUpdated > 0 && now - lastUpdated < REFRESH_MS) return;

    dispatch(setCryptoLoading());
    fetchCryptoStatus().then(result => {
      if (result.ok && result.data) {
        dispatch(setCryptoStatus(result.data));
      } else {
        dispatch(setCryptoError(result.error || 'fetch failed'));
      }
    });
  }, [dispatch, lastUpdated]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => {
      dispatch(setCryptoLoading());
      fetchCryptoStatus().then(result => {
        if (result.ok && result.data) {
          dispatch(setCryptoStatus(result.data));
        } else {
          dispatch(setCryptoError(result.error || 'fetch failed'));
        }
      });
    }, RETRY_MS);
    return () => clearTimeout(t);
  }, [dispatch, error]);

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
    <div className="text-radiant-cream font-mono mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <span className="w-2 h-2 bg-healed-sage rounded-full mr-2 animate-pulse" />
          <span className="text-sm font-bold tracking-wider">QPADL CRYPTO</span>
        </div>
        <span className="text-[10px] text-white/40 border border-white/10 px-1.5 py-0.5 rounded">
          DAEMON LIVE
        </span>
      </div>

      {loading && layers.length === 0 && (
        <div className="text-white/30 text-xs italic">Loading crypto layers...</div>
      )}
      {error && (
        <div className="text-deprecated-rust text-xs mb-2">{error}</div>
      )}

      <div className="space-y-1.5">
        {sorted.map((layer) => {
          const info = LAYER_FAMILIES[layer.id] || { label: layer.oqs_name, color: 'text-white/60', desc: '' };
          return (
            <div key={layer.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${layer.enabled ? 'bg-healed-sage' : 'bg-deprecated-rust'}`} />
                <span className={info.color}>{info.label}</span>
                {info.desc && <span className="text-white/30 text-[10px]">({info.desc})</span>}
              </div>
              <span className="text-white/40 text-[10px]">L{layer.level}</span>
            </div>
          );
        })}
      </div>

      {/* Live Post-Quantum Test Widget */}
      <div className="mt-3 pt-2.5 border-t border-white/10">
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
          <select 
            value={selectedAlgo} 
            onChange={(e) => setSelectedAlgo(e.target.value)}
            className="bg-black/60 border border-white/15 text-[10px] text-white/80 rounded px-1.5 py-0.5 outline-none"
          >
            <option value="mayo1">MAYO-1</option>
            <option value="mayo3">MAYO-3</option>
            <option value="mayo5">MAYO-5</option>
            <option value="falcon512">Falcon-512</option>
            <option value="ml_dsa_65">ML-DSA-65</option>
            <option value="sphincs_256f">SPHINCS+</option>
          </select>
          <button
            onClick={handleTestKeypair}
            disabled={generating}
            className="text-[10px] bg-white/10 hover:bg-white/20 border border-white/20 px-2 py-0.5 rounded text-radiant-cream transition-colors disabled:opacity-50"
          >
            {generating ? 'Testing...' : 'Test Key & Sign'}
          </button>
        </div>
        {testResult && (
          <div className={`text-[9px] truncate ${testResult.startsWith('✓') ? 'text-healed-sage' : 'text-deprecated-rust'}`}>
            {testResult}
          </div>
        )}
      </div>

      {lastUpdated > 0 && (
        <div className="text-white/20 text-[10px] mt-2">
          Updated {new Date(lastUpdated).toISOString().slice(11, 19)}
        </div>
      )}
    </div>
  );
}
