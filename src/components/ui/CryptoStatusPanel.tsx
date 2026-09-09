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

const REFRESH_MS = 30_000;
const RETRY_MS = 10_000;

export function CryptoStatusPanel() {
  const dispatch = useDispatch();
  const { layers, lastUpdated, loading, error } = useSelector((state: RootState) => state.crypto);

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

  // Retry after RETRY_MS whenever an error is set and we have no data yet.
  // Once we have layers, the normal 30s refresh cycle takes over.
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

  return (
    <div className="text-radiant-cream font-mono mt-4">
      <div className="flex items-center mb-3">
        <span className="w-2 h-2 bg-healed-sage rounded-full mr-2 animate-pulse" />
        <span className="text-sm">QPADL CRYPTO</span>
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

      {lastUpdated > 0 && (
        <div className="text-white/20 text-[10px] mt-3">
          Updated {new Date(lastUpdated).toISOString().slice(11, 19)}
        </div>
      )}
    </div>
  );
}
