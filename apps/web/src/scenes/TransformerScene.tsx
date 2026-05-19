import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { CameraRig } from './CameraRig';
import { MatrixBlock } from './MatrixBlock';
import { TokenStrip } from './TokenStrip';
import type { TransformerTrace } from '../transformer-ir/traceTypes';

interface TransformerSceneProps { trace: TransformerTrace; onTokenSelect?: (tokenIndex: number) => void; }

export function TransformerScene({ trace, onTokenSelect }: TransformerSceneProps) {
  return <div className='scene-shell' data-testid='scene-shell'>
    <Canvas camera={{ position: [0, 2.4, 6.4], fov: 48 }}>
      <ambientLight intensity={0.7} />
      <Suspense fallback={null}>
        <TokenStrip tokens={trace.input.tokens.map((t) => ({ tokenIndex: t.index, text: t.text, normalizedPosition: [t.index / Math.max(1, trace.input.tokens.length - 1), 0, 0] as [number, number, number] }))} onTokenSelect={onTokenSelect} />
        <MatrixBlock label={`Emb ${trace.embedding.previewDimensions}d`} color='#2563eb' position={[-2.8, 0.4, 0]} />
        {trace.layers.map((layer, index) => <group key={layer.layerIndex} position={[index * 1.6 - 0.8, 0.4, 0]}><MatrixBlock label={`L${layer.layerIndex}`} color='#7c3aed' position={[0, 0, 0]} blockScale={[1, 0.75, 0.9]} /></group>)}
        <MatrixBlock label={`TopK ${trace.output.nextTokenTopK.length}`} color='#16a34a' position={[trace.layers.length * 1.6 + 0.2, 0.4, 0]} />
      </Suspense>
      <CameraRig />
    </Canvas>
  </div>;
}
