import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, PresentationControls } from '@react-three/drei';

export function RocketModel() {
  const meshRef = useRef<any>();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <PresentationControls
      global
      config={{ mass: 2, tension: 500 }}
      snap={{ mass: 4, tension: 1500 }}
      rotation={[0, 0.3, 0]}
      polar={[-Math.PI / 3, Math.PI / 3]}
      azimuth={[-Math.PI / 1.4, Math.PI / 2]}
    >
      <Float speed={2} rotationIntensity={1.5} floatIntensity={2}>
        <mesh ref={meshRef} scale={1.5}>
          <cylinderGeometry args={[0.5, 1, 3, 32]} />
          <meshStandardMaterial color="#00ffd5" wireframe={true} />
        </mesh>
        <mesh position={[0, 2, 0]}>
          <coneGeometry args={[0.5, 1, 32]} />
          <meshStandardMaterial color="#8b5cf6" wireframe={true} />
        </mesh>
        <mesh position={[-0.8, -1, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.2, 1, 0.5]} />
          <meshStandardMaterial color="#ff0080" wireframe={true} />
        </mesh>
        <mesh position={[0.8, -1, 0]} rotation={[0, 0, -Math.PI / 4]}>
          <boxGeometry args={[0.2, 1, 0.5]} />
          <meshStandardMaterial color="#ff0080" wireframe={true} />
        </mesh>
      </Float>
    </PresentationControls>
  );
}
