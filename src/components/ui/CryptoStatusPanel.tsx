import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../state/ledger/store';
import { setCryptoStatus, setCryptoLoading, setCryptoError, CryptoLayerStatus } from '../../state/ledger/slices/cryptoSlice';
import { fetchCryptoStatus } from '../../services/apiService';

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

const REFRESH_MS = 15_000;

export function CryptoStatusPanel() {
  const dispatch = useDispatch();
  const { layers, lastUpdated, loading, error } = useSelector((state: RootState) => state.crypto);

  useEffect(() => {
    const load = () => {
      dispatch(setCryptoLoading());
      fetchCryptoStatus().then(result => {
        if (result.ok && result.data) {
          dispatch(setCryptoStatus(result.data));
        } else {
          dispatch(setCryptoError(result.error || 'fetch failed'));
        }
      });
    };

    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, [dispatch]);

  const sorted = sortLayers(layers);

  return (
    <div className="backdrop-blur-2xl border p-2 md:p-4 rounded-lg text-radiant-cream font-mono" style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
      <div className="flex items-center justify-between mb-3 border-b pb-2" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
        <div className="flex items-center">
          <span className="w-2 h-2 bg-healed-sage rounded-full mr-2 animate-pulse" />
          <span className="text-xs md:text-sm font-bold" style={{ color: '#FFB300' }}>QPADL CRYPTO</span>
        </div>
        <span className="text-[9px] md:text-[10px] text-healed-sage border border-healed-sage/30 px-1.5 py-0.5 rounded bg-healed-sage/10">
          DAEMON LIVE
        </span>
      </div>

      {loading && layers.length === 0 && (
        <div className="text-white/40 text-xs italic py-2">Loading crypto layers...</div>
      )}
      {error && layers.length === 0 && (
        <div className="text-deprecated-rust text-xs mb-2 py-1">{error}</div>
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

      {lastUpdated > 0 && (
        <div className="text-white/30 text-[9px] mt-3 pt-2 border-t border-white/5 flex justify-between">
          <span>liboqs engine</span>
          <span>Updated {new Date(lastUpdated).toISOString().slice(11, 19)} UTC</span>
        </div>
      )}
    </div>
  );
}
