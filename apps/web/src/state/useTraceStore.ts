import { create } from 'zustand';
import type { TransformerTrace } from '../transformer-ir/traceTypes';

interface TraceState {
  currentPrompt: string;
  trace?: TransformerTrace;
  isLoading: boolean;
  error?: string;
  selectedTokenIndex: number;
  selectedLayerIndex: number;
  selectedHeadIndex: number;
  selectedChapter: string;
  setPrompt: (prompt: string) => void;
  setTrace: (trace: TransformerTrace) => void;
  setLoading: (loading: boolean) => void;
  setError: (error?: string) => void;
  setSelectedTokenIndex: (index: number) => void;
  setSelectedLayerIndex: (index: number) => void;
  setSelectedHeadIndex: (index: number) => void;
}

export const useTraceStore = create<TraceState>((set) => ({
  currentPrompt: '', selectedTokenIndex: 0, selectedLayerIndex: 0, selectedHeadIndex: 0, selectedChapter: 'tokens', isLoading: false,
  setPrompt: (currentPrompt) => set({ currentPrompt }),
  setTrace: (trace) => set({ trace, selectedTokenIndex: 0, selectedLayerIndex: 0, selectedHeadIndex: 0 }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setSelectedTokenIndex: (selectedTokenIndex) => set({ selectedTokenIndex }),
  setSelectedLayerIndex: (selectedLayerIndex) => set({ selectedLayerIndex }),
  setSelectedHeadIndex: (selectedHeadIndex) => set({ selectedHeadIndex })
}));
