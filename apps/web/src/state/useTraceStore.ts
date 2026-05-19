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
  usingFixtureFallback: boolean;
  setPrompt: (prompt: string) => void;
  setTrace: (trace: TransformerTrace) => void;
  setLoading: (loading: boolean) => void;
  setError: (error?: string) => void;
  setUsingFixtureFallback: (using: boolean) => void;
  setSelectedTokenIndex: (index: number) => void;
  setSelectedLayerIndex: (index: number) => void;
  setSelectedHeadIndex: (index: number) => void;
  selectNextLayer: () => void;
  selectPreviousLayer: () => void;
  selectNextHead: () => void;
  selectPreviousHead: () => void;
}

export const useTraceStore = create<TraceState>((set, get) => ({
  currentPrompt: '', selectedTokenIndex: 0, selectedLayerIndex: 0, selectedHeadIndex: 0, selectedChapter: 'tokens', isLoading: false, usingFixtureFallback: false,
  setPrompt: (currentPrompt) => set({ currentPrompt }),
  setTrace: (trace) => set({ trace, selectedTokenIndex: 0, selectedLayerIndex: trace.layers[0]?.layerIndex ?? 0, selectedHeadIndex: trace.layers[0]?.attention.heads[0]?.headIndex ?? 0 }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setUsingFixtureFallback: (usingFixtureFallback) => set({ usingFixtureFallback }),
  setSelectedTokenIndex: (selectedTokenIndex) => set({ selectedTokenIndex }),
  setSelectedLayerIndex: (selectedLayerIndex) => set({ selectedLayerIndex }),
  setSelectedHeadIndex: (selectedHeadIndex) => set({ selectedHeadIndex }),
  selectNextLayer: () => {
    const { trace, selectedLayerIndex } = get(); if (!trace) return;
    const indices = trace.layers.map((l) => l.layerIndex); const i = Math.max(0, indices.indexOf(selectedLayerIndex));
    set({ selectedLayerIndex: indices[Math.min(i + 1, indices.length - 1)] });
  },
  selectPreviousLayer: () => {
    const { trace, selectedLayerIndex } = get(); if (!trace) return;
    const indices = trace.layers.map((l) => l.layerIndex); const i = Math.max(0, indices.indexOf(selectedLayerIndex));
    set({ selectedLayerIndex: indices[Math.max(i - 1, 0)] });
  },
  selectNextHead: () => set({ selectedHeadIndex: get().selectedHeadIndex + 1 }),
  selectPreviousHead: () => set({ selectedHeadIndex: Math.max(0, get().selectedHeadIndex - 1) })
}));
