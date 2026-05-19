import type { TransformerTrace } from '../transformer-ir/traceTypes';

export function normalizeTokenText(text: string): string {
  return text.replace(/^Ġ/, ' ␠').replace(/^▁/, ' ␠');
}

export function buildTokenViewModelsFromTrace(trace: TransformerTrace, selectedTokenIndex: number) {
  return trace.input.tokens.map((token) => ({ ...token, label: `${token.index}: ${normalizeTokenText(token.text)}`, selected: token.index === selectedTokenIndex }));
}

export function buildLayerViewModelsFromTrace(trace: TransformerTrace, selectedLayerIndex: number) {
  return trace.layers.map((layer) => ({ layerIndex: layer.layerIndex, label: `Layer ${layer.layerIndex}`, selected: layer.layerIndex === selectedLayerIndex }));
}

export function getSelectedLayerFromTrace(trace: TransformerTrace, selectedLayerIndex: number) {
  return trace.layers.find((layer) => layer.layerIndex === selectedLayerIndex) ?? trace.layers[0];
}

export function getSelectedAttentionHeadFromTrace(trace: TransformerTrace, selectedLayerIndex: number, selectedHeadIndex: number) {
  const layer = getSelectedLayerFromTrace(trace, selectedLayerIndex);
  if (!layer) return undefined;
  const heads = layer.attention?.heads ?? [];
  return heads.find((h) => h.headIndex === selectedHeadIndex) ?? heads[0];
}

export function buildOutputLogitViewModelsFromTrace(trace: TransformerTrace) {
  return trace.output.nextTokenTopK.map((item, index) => ({ ...item, rank: index + 1, pct: item.probability * 100 }));
}
