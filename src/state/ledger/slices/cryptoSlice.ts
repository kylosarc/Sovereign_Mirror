import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CryptoLayerStatus {
  id: string;
  level: number;
  enabled: boolean;
  oqs_name: string;
}

interface CryptoState {
  layers: CryptoLayerStatus[];
  lastUpdated: number;
  loading: boolean;
  error: string | null;
}

const DEFAULT_LAYERS: CryptoLayerStatus[] = [
  { id: 'mayo1', level: 1, enabled: true, oqs_name: 'MAYO-1' },
  { id: 'mayo3', level: 3, enabled: true, oqs_name: 'MAYO-3' },
  { id: 'mayo5', level: 5, enabled: true, oqs_name: 'MAYO-5' },
  { id: 'falcon512', level: 1, enabled: true, oqs_name: 'Falcon-512' },
  { id: 'ml_dsa_65', level: 3, enabled: true, oqs_name: 'ML-DSA-65' },
  { id: 'sphincs_256f', level: 5, enabled: true, oqs_name: 'SPHINCS+-SHA2-256f-simple' },
];

const initialState: CryptoState = {
  layers: DEFAULT_LAYERS,
  lastUpdated: Date.now(),
  loading: false,
  error: null,
};

const cryptoSlice = createSlice({
  name: 'crypto',
  initialState,
  reducers: {
    setCryptoStatus: (state, action: PayloadAction<CryptoLayerStatus[]>) => {
      state.layers = action.payload;
      state.lastUpdated = Date.now();
      state.loading = false;
      state.error = null;
    },
    setCryptoLoading: (state) => {
      state.loading = true;
      state.error = null;
    },
    setCryptoError: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const { setCryptoStatus, setCryptoLoading, setCryptoError } = cryptoSlice.actions;
export default cryptoSlice.reducer;
