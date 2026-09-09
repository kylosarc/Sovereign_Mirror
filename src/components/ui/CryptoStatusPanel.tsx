import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../state/ledger/store';
import { setCryptoStatus, setCryptoLoading, setCryptoError, CryptoLayerStatus } from '../../state/ledger/slices/cryptoSlice';
import { fetchCryptoStatus, cryptoKeypair, cryptoSign, cryptoVerify } from '../../services/apiService';

const LAYER_ORDER = ['mayo1', 'mayo3', 'mayo5', 'falcon512', 'ml_dsa_65', 'sphincs_256f'];

interface LayerMeta {
  label: string;
  family: string;
  desc: string;
  color: string;
  nistLevel: string;
}

const LAYER_META: Record<string, LayerMeta> = {
  mayo1: {
    label: 'MAYO-1',
    family: 'Multivariate (MQ)',
    desc: 'High-speed UOV signature',
    color: '#FFB300',
    nistLevel: 'Level 1',
  },
  mayo3: {
    label: 'MAYO-3',
    family: 'Multivariate (MQ)',
    desc: 'High-speed UOV signature',
    color: '#FFB300',
    nistLevel: 'Level 3',
  },
  mayo5: {
    label: 'MAYO-5',
    family: 'Multivariate (MQ)',
    desc: 'High-speed UOV signature',
    color: '#FFB300',
    nistLevel: 'Level 5',
  },
  falcon512: {
    label: 'Falcon-512',
    family: 'Lattice (FFT)',
    desc: 'Fast Fourier compact signature',
    color: '#38BDF8',
    nistLevel: 'Level 1',
  },
  ml_dsa_65: {
    label: 'ML-DSA-65',
    family: 'Module Lattice',
    desc: 'Primary NIST FIPS 204',
    color: '#00FF41',
    nistLevel: 'Level 3',
  },
  sphincs_256f: {
    label: 'SPHINCS+',
    family: 'Stateless Hash',
    desc: 'Quantum anchor FIPS 205',
    color: '#F43F5E',
    nistLevel: 'Level 5',
  },
};

function sortLayers(layers: CryptoLayerStatus[]): CryptoLayerStatus[] {
  const map = new Map(layers.map((l) => [l.id, l]));
  return LAYER_ORDER.map((id) => map.get(id)).filter((l): l is CryptoLayerStatus => l != null);
}

const REFRESH_MS = 15_000;

export function CryptoStatusPanel() {
  const dispatch = useDispatch();
  const { layers, lastUpdated } = useSelector((state: RootState) => state.crypto);

  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    algorithm: string;
    elapsedMs: number;
    message: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      dispatch(setCryptoLoading());
      const result = await fetchCryptoStatus();
      if (!isMounted) return;
      if (result.ok && result.data && result.data.length > 0) {
        dispatch(setCryptoStatus(result.data));
      } else if (result.error) {
        dispatch(setCryptoError(result.error));
      }
    };

    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [dispatch]);

  const runCryptoTest = async () => {
    setTestRunning(true);
    setTestResult(null);
    const start = performance.now();
    try {
      // 1. Generate keypair with MAYO-1
      const kpRes = await cryptoKeypair('mayo1');
      if (!kpRes.ok || !kpRes.data) {
        throw new Error(kpRes.error || 'Keypair generation failed');
      }

      // 2. Base64-encode test payload for the liboqs binary daemon
      const testPayload = `QPADL_VERIFY_${Date.now()}`;
      const b64Msg = btoa(testPayload);

      // 3. Sign
      const signRes = await cryptoSign('mayo1', b64Msg, kpRes.data.secret_key);
      if (!signRes.ok || !signRes.data) {
        throw new Error(signRes.error || 'Signing operation failed');
      }

      // 4. Verify
      const verifyRes = await cryptoVerify('mayo1', b64Msg, signRes.data.signature, kpRes.data.public_key);
      if (!verifyRes.ok || !verifyRes.data?.valid) {
        throw new Error(verifyRes.error || 'Signature verification invalid');
      }

      const elapsed = Math.round(performance.now() - start);
      setTestResult({
        success: true,
        algorithm: 'MAYO-1',
        elapsedMs: elapsed,
        message: 'KeyGen + Sign + Verify validated (100% PQC secured)',
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        algorithm: 'MAYO-1',
        elapsedMs: Math.round(performance.now() - start),
        message: err.message || 'Crypto test failed',
      });
    } finally {
      setTestRunning(false);
    }
  };

  const sorted = sortLayers(layers);
  const activeCount = sorted.filter((l) => l.enabled).length;

  return (
    <div className="text-radiant-cream font-mono mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 border-b pb-2" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#00FF41', boxShadow: '0 0 8px #00FF41' }} />
          <span className="text-xs font-bold tracking-wider" style={{ color: '#FFB300' }}>
            QPADL POST-QUANTUM CRYPTO
          </span>
        </div>
        <span
          className="text-[9px] px-1.5 py-0.5 rounded font-bold"
          style={{
            color: '#00FF41',
            backgroundColor: 'rgba(0, 255, 65, 0.1)',
            border: '1px solid rgba(0, 255, 65, 0.3)',
          }}
        >
          {activeCount}/{sorted.length || 6} OPERATIONAL
        </span>
      </div>

      {/* Algorithm Layers List */}
      <div className="space-y-1.5 mb-3">
        {sorted.map((layer) => {
          const meta = LAYER_META[layer.id] || {
            label: layer.oqs_name,
            family: 'Post-Quantum',
            desc: 'Cryptographic primitive',
            color: '#c4c7c8',
            nistLevel: `Level ${layer.level}`,
          };

          return (
            <div
              key={layer.id}
              className="flex items-center justify-between text-xs py-1 px-1.5 rounded"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: layer.enabled ? '#00FF41' : '#FF4500',
                    boxShadow: layer.enabled ? '0 0 6px rgba(0, 255, 65, 0.8)' : 'none',
                  }}
                />
                <span className="font-bold text-[11px]" style={{ color: meta.color }}>
                  {meta.label}
                </span>
                <span className="text-[9px] opacity-60 hidden sm:inline" style={{ color: '#c4c7c8' }}>
                  ({meta.family})
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="text-[9px] px-1 py-0.5 rounded" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#c4c7c8' }}>
                  {meta.nistLevel}
                </span>
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                  style={{
                    color: layer.enabled ? '#00FF41' : '#FF4500',
                    backgroundColor: layer.enabled ? 'rgba(0, 255, 65, 0.1)' : 'rgba(255, 69, 0, 0.1)',
                  }}
                >
                  {layer.enabled ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Live Key Test Button */}
      <div className="pt-2 border-t space-y-2" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
        <button
          onClick={runCryptoTest}
          disabled={testRunning}
          className="w-full py-1.5 px-3 rounded font-mono text-[10px] font-bold tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
          style={{
            backgroundColor: testRunning ? 'rgba(255, 179, 0, 0.2)' : 'rgba(255, 179, 0, 0.12)',
            color: '#FFB300',
            border: '1px solid rgba(255, 179, 0, 0.4)',
          }}
        >
          {testRunning ? (
            <>
              <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: '#FFB300' }} />
              <span>TESTING PQC PIPELINE...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[12px]">lock_reset</span>
              <span>TEST QPADL KEY EXCHANGE</span>
            </>
          )}
        </button>

        {testResult && (
          <div
            className="p-2 rounded text-[9px] font-mono flex items-center justify-between gap-2"
            style={{
              backgroundColor: testResult.success ? 'rgba(0, 255, 65, 0.08)' : 'rgba(255, 69, 0, 0.1)',
              border: `1px solid ${testResult.success ? 'rgba(0, 255, 65, 0.3)' : 'rgba(255, 69, 0, 0.3)'}`,
              color: testResult.success ? '#00FF41' : '#FF4500',
            }}
          >
            <div className="truncate">
              <span className="font-bold">{testResult.algorithm}: </span>
              <span>{testResult.message}</span>
            </div>
            <span className="shrink-0 opacity-70 text-[8px]">{testResult.elapsedMs}ms</span>
          </div>
        )}

        <div className="flex justify-between items-center text-[8px] opacity-40 pt-1" style={{ color: '#c4c7c8' }}>
          <span>liboqs 0.12 + C-bindings</span>
          <span>{lastUpdated > 0 ? `Synced ${new Date(lastUpdated).toISOString().slice(11, 19)} UTC` : 'Standby'}</span>
        </div>
      </div>
    </div>
  );
}
