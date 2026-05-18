import { OrbitControls } from '@react-three/drei';

export function CameraRig() {
  return <OrbitControls enableDamping minDistance={4} maxDistance={12} maxPolarAngle={Math.PI * 0.72} />;
}
