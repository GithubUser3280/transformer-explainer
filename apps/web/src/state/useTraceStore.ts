import { create } from 'zustand';
import type { TransformerTrace } from '../transformer-ir/traceTypes';

export type TraceSourceStatus = 'idle' | 'loading' | 'live-success' | 'fixture-success' | 'failed' | 'fallback-after-failure';

export interface TraceDiagnostics {
  sourceStatus: TraceSourceStatus;
  traceId?: string;
  modelName?: string;
  tokenCount: number;
  normalizedLayerCount: number;
  hasAttentionWeights: boolean;
  hasResidualSummary: boolean;
  hasOutputTopK: boolean;
  hasRawQkv: boolean;
  warnings: string[];
  lastError?: string;
}

interface TraceState {
  trace?: TransformerTrace;
  selectedTokenIndex: number;
  selectedLayerIndex: number;
  selectedHeadIndex: number;
  traceDiagnostics: TraceDiagnostics;
  pipelineDebug?: {
    buttonClicks: number;
    lastRequestUrl?: string;
    lastResponseStatus?: number;
    rawTraceId?: string;
    rawAttention: boolean;
    rawTopK: boolean;
    rawResidual: boolean;
    normalizedAttention: boolean;
    normalizedTopK: boolean;
    normalizedResidual: boolean;
    fallbackUsed: boolean;
    authLoggedIn: boolean;
  };
  setPipelineDebug: (value: TraceState["pipelineDebug"]) => void;

  setTrace: (trace: TransformerTrace) => void;
  setTraceSourceStatus: (status: TraceSourceStatus) => void;
  setTraceError: (error?: string) => void;
  setSelectedTokenIndex: (index: number) => void;
  setSelectedLayerIndex: (index: number) => void;
  setSelectedHeadIndex: (index: number) => void;
  selectNextLayer: () => void;
  selectPreviousLayer: () => void;
  selectNextHead: () => void;
  selectPreviousHead: () => void;

}

const defaultDiagnostics: TraceDiagnostics = {
  sourceStatus: 'idle', tokenCount: 0, normalizedLayerCount: 0, hasAttentionWeights: false, hasResidualSummary: false, hasOutputTopK: false, hasRawQkv: false, warnings: []
};

function buildDiagnostics(trace: TransformerTrace, sourceStatus: TraceSourceStatus, lastError?: string): TraceDiagnostics {
  const heads = trace.layers.flatMap((l) => l.attention?.heads ?? []);
  return {
    sourceStatus,
    traceId: (trace as unknown as { traceId?: string }).traceId,
    modelName: trace.model.name,
    tokenCount: trace.input.tokens.length,
    normalizedLayerCount: trace.layers.length,
    hasAttentionWeights: heads.some((h) => h.weights.length > 0),
    hasResidualSummary: trace.layers.some((l) => l.residualStream.tokenNormsAfterMlp.length > 0),
    hasOutputTopK: trace.output.nextTokenTopK.length > 0,
    hasRawQkv: heads.some((h) => !!h.queryPreview || !!h.keyPreview || !!h.valuePreview),
    warnings: trace.warnings ?? [],
    lastError
  };
}

export const useTraceStore = create<TraceState>((set, get) => ({
  selectedTokenIndex: 0,
  selectedLayerIndex: 0,
  selectedHeadIndex: 0,
  traceDiagnostics: defaultDiagnostics,
  pipelineDebug: { buttonClicks: 0, rawAttention: false, rawTopK: false, rawResidual: false, normalizedAttention: false, normalizedTopK: false, normalizedResidual: false, fallbackUsed: false, authLoggedIn: false },
  setTrace: (trace) => set((state) => ({
    trace,
    selectedTokenIndex: 0,
    selectedLayerIndex: trace.layers[0]?.layerIndex ?? 0,
    selectedHeadIndex: trace.layers[0]?.attention.heads[0]?.headIndex ?? 0,
    traceDiagnostics: buildDiagnostics(trace, state.traceDiagnostics.sourceStatus, state.traceDiagnostics.lastError)
  })),
  setTraceSourceStatus: (status) => set((state) => ({ traceDiagnostics: { ...state.traceDiagnostics, sourceStatus: status } })),
  setTraceError: (lastError) => set((state) => ({ traceDiagnostics: { ...state.traceDiagnostics, lastError } })),
  setPipelineDebug: (pipelineDebug) => set({ pipelineDebug }),
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
