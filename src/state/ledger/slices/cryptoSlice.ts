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

const initialState: CryptoState = {
  layers: [],
  lastUpdated: 0,
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
