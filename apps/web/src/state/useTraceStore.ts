import { create } from 'zustand';
import type { TransformerOperation, TransformerTrace } from '../transformer-ir/traceTypes';

export interface TraceSelection {
  tokenIndex?: number;
  layerIndex?: number;
  headIndex?: number;
  operationId?: string;
}

interface TraceState {
  trace?: TransformerTrace;
  selection: TraceSelection;
  setTrace: (trace: TransformerTrace) => void;
  setSelection: (selection: TraceSelection) => void;
  selectedOperation?: () => TransformerOperation | undefined;
}

export const useTraceStore = create<TraceState>((set, get) => ({
  selection: {},
  setTrace: (trace) => set({ trace, selection: { tokenIndex: 0, layerIndex: trace.layers[0]?.layerIndex } }),
  setSelection: (selection) => set({ selection: { ...get().selection, ...selection } }),
  selectedOperation: () => {
    const { trace, selection } = get();
    return trace?.layers
      .find((layer) => layer.layerIndex === selection.layerIndex)
      ?.operations.find((operation) => operation.operationId === selection.operationId);
  }
}));
