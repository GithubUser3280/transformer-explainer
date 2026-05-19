import { Html, OrbitControls, Text } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useMemo } from 'react';
import type { TransformerTrace } from '../transformer-ir/traceTypes';
import { buildLayerViewModelsFromTrace, buildOutputLogitViewModelsFromTrace, buildTokenViewModelsFromTrace, getSelectedAttentionHeadFromTrace, getSelectedLayerFromTrace } from './traceViewModels';

interface Props {
  trace: TransformerTrace;
  selectedTokenIndex: number;
  selectedLayerIndex: number;
  selectedHeadIndex: number;
  onSelectToken: (i: number) => void;
  onSelectLayer: (i: number) => void;
  onSelectHead: (i: number) => void;
}

export function TransformerScene({ trace, selectedTokenIndex, selectedLayerIndex, selectedHeadIndex, onSelectToken, onSelectLayer, onSelectHead }: Props) {
  const tokenVM = useMemo(() => buildTokenViewModelsFromTrace(trace, selectedTokenIndex), [trace, selectedTokenIndex]);
  const layerVM = useMemo(() => buildLayerViewModelsFromTrace(trace, selectedLayerIndex), [trace, selectedLayerIndex]);
  const selectedLayer = getSelectedLayerFromTrace(trace, selectedLayerIndex);
  const selectedHead = getSelectedAttentionHeadFromTrace(trace, selectedLayerIndex, selectedHeadIndex);
  const logits = buildOutputLogitViewModelsFromTrace(trace);
  const residual = selectedLayer?.residualStream?.tokenNormsAfterMlp ?? [];

  return <div className='scene-shell'><Canvas camera={{ position: [0, 4, 13], fov: 45 }}>
    <ambientLight intensity={0.9} />
    <pointLight position={[4, 8, 8]} intensity={15} />
    <group position={[-5, 0, 0]}>
      <Text position={[0, 2.2, 0]} fontSize={0.25}>Tokens</Text>
      {tokenVM.map((t, idx) => <group key={t.index} position={[idx * 1.1, 1.6, 0]}>
        <mesh onClick={() => onSelectToken(t.index)}><boxGeometry args={[0.9, 0.4, 0.3]} /><meshStandardMaterial color={t.selected ? '#f59e0b' : '#38bdf8'} /></mesh>
        <Text position={[0, 0, 0.2]} fontSize={0.12}>{t.label.slice(0, 12)}</Text>
      </group>)}
    </group>

    <group position={[-1.5, -0.3, 0]}>
      <mesh><boxGeometry args={[2, 1.2, 0.6]} /><meshStandardMaterial color='#2563eb' /></mesh>
      <Text position={[0, 0.9, 0]} fontSize={0.16}>Token + Position Embedding</Text>
    </group>

    <group position={[2.2, 0, 0]}>
      <Text position={[0, 2.2, 0]} fontSize={0.25}>Layer Stack (sampled)</Text>
      {layerVM.map((l, i) => <group key={l.layerIndex} position={[0, 1.6 - i * 0.8, 0]}>
        <mesh onClick={() => onSelectLayer(l.layerIndex)}><boxGeometry args={[2, 0.55, 0.7]} /><meshStandardMaterial color={l.selected ? '#22c55e' : '#7c3aed'} /></mesh>
        <Text position={[0, 0, 0.4]} fontSize={0.14}>{l.label}</Text>
      </group>)}
    </group>

    <group position={[6.2, 1.2, 0]}>
      <Text position={[0, 1.8, 0]} fontSize={0.2}>Attention Head {selectedHead?.headIndex ?? 'N/A'}</Text>
      {selectedHead ? selectedHead.weights.slice(0, 12).map((row, r) => row.slice(0, 12).map((v, c) => <mesh key={`${r}-${c}`} position={[c * 0.22, -r * 0.22, 0]}><boxGeometry args={[0.19,0.19,0.08]} /><meshStandardMaterial color={`hsl(${220 - Math.min(1, v) * 220} 85% 55%)`} /></mesh>)) : <Text position={[0, 0, 0]} fontSize={0.15}>attention unavailable</Text>}
    </group>

    <group position={[6.2, -1.9, 0]}>
      <Text position={[0, 0.8, 0]} fontSize={0.16}>Heads</Text>
      {(selectedLayer?.attention?.heads ?? []).map((h, i) => <mesh key={h.headIndex} position={[i * 0.5, 0, 0]} onClick={() => onSelectHead(h.headIndex)}><boxGeometry args={[0.38, 0.38, 0.2]} /><meshStandardMaterial color={h.headIndex === (selectedHead?.headIndex ?? -1) ? '#f97316' : '#334155'} /></mesh>)}
    </group>

    <group position={[9.2, -0.3, 0]}>
      <Text position={[0, 1.7, 0]} fontSize={0.18}>Residual / Hidden Summary</Text>
      {residual.slice(0, 12).map((v, i) => <mesh key={i} position={[i * 0.22, Math.min(2, v) * 0.25, 0]}><boxGeometry args={[0.14, Math.max(0.05, Math.min(2, v) * 0.5), 0.12]} /><meshStandardMaterial color='#14b8a6' /></mesh>)}
    </group>

    <group position={[12.5, -0.5, 0]}>
      <Text position={[0, 2, 0]} fontSize={0.2}>Output Top-K</Text>
      {logits.slice(0, 8).map((l, i) => <group key={`${l.rank}-${l.tokenId}`} position={[0, 1.5 - i * 0.35, 0]}><mesh position={[Math.min(2, l.probability * 4), 0, 0]}><boxGeometry args={[Math.max(0.05, l.probability * 4), 0.22, 0.1]} /><meshStandardMaterial color='#22c55e' /></mesh><Text position={[-0.2, 0, 0.1]} fontSize={0.1} anchorX='right'>{`${l.rank}. ${l.text} ${(l.pct).toFixed(1)}%`}</Text></group>)}
    </group>
    <OrbitControls enablePan enableZoom />
  </Canvas>
  <div className='scene-hud'>
    <div><strong>{trace.model.name}</strong></div>
    <div>Prompt: {trace.input.prompt}</div>
    <div>Tokens: {trace.input.tokens.length} · Layers: {trace.layers.length}</div>
    <div>Selected token/layer/head: {selectedTokenIndex}/{selectedLayer?.layerIndex ?? 'n/a'}/{selectedHead?.headIndex ?? 'n/a'}</div>
    {trace.warnings?.map((w, i) => <div key={i}>⚠ {w}</div>)}
  </div>
  </div>;
}
