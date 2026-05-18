import { Text } from '@react-three/drei';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { InstancedMesh, Object3D } from 'three';
import type { TokenTrace } from '../transformer-ir/traceTypes';

interface TokenStripProps {
  tokens: TokenTrace[];
  onTokenSelect?: (tokenIndex: number) => void;
}

export function TokenStrip({ tokens, onTokenSelect }: TokenStripProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  useLayoutEffect(() => {
    tokens.forEach((token, index) => {
      dummy.position.set(token.tokenIndex * 0.72 - (tokens.length - 1) * 0.36, -1.3, 0);
      dummy.scale.set(0.58, 0.18, 0.34);
      dummy.updateMatrix();
      meshRef.current?.setMatrixAt(index, dummy.matrix);
    });
    if (meshRef.current) {
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [dummy, tokens]);

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, tokens.length]}
        onClick={(event) => {
          event.stopPropagation();
          if (typeof event.instanceId === 'number') {
            onTokenSelect?.(event.instanceId);
          }
        }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.8} />
      </instancedMesh>
      {tokens.slice(0, 8).map((token) => (
        <Text
          key={token.tokenIndex}
          position={[token.tokenIndex * 0.72 - (tokens.length - 1) * 0.36, -1.02, 0]}
          fontSize={0.12}
          color="#f8fafc"
          anchorX="center"
          anchorY="middle"
        >
          {token.text.slice(0, 10)}
        </Text>
      ))}
    </group>
  );
}
