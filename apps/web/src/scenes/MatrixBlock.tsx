import { Text } from '@react-three/drei';
import type { ThreeElements } from '@react-three/fiber';

type MatrixBlockProps = ThreeElements['group'] & {
  label: string;
  color: string;
  blockScale?: [number, number, number];
};

export function MatrixBlock({ label, color, blockScale = [1.4, 0.5, 0.8], ...groupProps }: MatrixBlockProps) {
  return (
    <group {...groupProps}>
      <mesh scale={blockScale}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color} roughness={0.75} metalness={0.05} />
      </mesh>
      <Text position={[0, 0.45, 0]} fontSize={0.16} color="#e7f2ff" anchorX="center" anchorY="middle">
        {label}
      </Text>
    </group>
  );
}
