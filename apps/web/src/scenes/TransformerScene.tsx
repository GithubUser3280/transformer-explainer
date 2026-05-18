import { Canvas } from '@react-three/fiber';
import { Suspense, useMemo } from 'react';
import { AttentionLinks } from './AttentionLinks';
import { CameraRig } from './CameraRig';
import { MatrixBlock } from './MatrixBlock';
import { TokenStrip } from './TokenStrip';
import type { AttentionOperation, TransformerTrace } from '../transformer-ir/traceTypes';

interface TransformerSceneProps {
  trace: TransformerTrace;
  onTokenSelect?: (tokenIndex: number) => void;
}

function TraceObjects({ trace, onTokenSelect }: TransformerSceneProps) {
  const firstAttention = useMemo(() => {
    for (const layer of trace.layers) {
      const attention = layer.operations.find((operation) => operation.kind === 'attention') as AttentionOperation | undefined;
      if (attention) return attention;
    }
    return undefined;
  }, [trace.layers]);

  return (
    <group>
      <TokenStrip tokens={trace.tokens} onTokenSelect={onTokenSelect} />
      {firstAttention ? <AttentionLinks links={firstAttention.topAttentionLinks} tokens={trace.tokens} /> : null}
      <MatrixBlock label="Embedding" color="#2563eb" position={[-2.8, 0.4, 0]} />
      {trace.layers.map((layer, index) => (
        <group key={layer.layerIndex} position={[index * 1.6 - 0.8, 0.4, 0]}>
          <MatrixBlock label={`L${layer.layerIndex}`} color="#7c3aed" position={[0, 0, 0]} blockScale={[1, 0.75, 0.9]} />
          <MatrixBlock label="Attn" color="#0891b2" position={[0, 0.85, -0.2]} blockScale={[0.8, 0.28, 0.55]} />
          <MatrixBlock label="MLP" color="#db2777" position={[0, -0.85, -0.2]} blockScale={[0.8, 0.28, 0.55]} />
        </group>
      ))}
      <MatrixBlock label="Logits" color="#16a34a" position={[trace.layers.length * 1.6 + 0.2, 0.4, 0]} />
    </group>
  );
}

export function TransformerScene(props: TransformerSceneProps) {
  return (
    <div className="scene-shell" data-testid="scene-shell">
      <Canvas camera={{ position: [0, 2.4, 6.4], fov: 48 }} dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: 'high-performance' }}>
        <color attach="background" args={["#020617"]} />
        <ambientLight intensity={0.65} />
        <directionalLight position={[3, 4, 5]} intensity={1.2} />
        <Suspense fallback={null}>
          <TraceObjects {...props} />
        </Suspense>
        <CameraRig />
      </Canvas>
    </div>
  );
}
