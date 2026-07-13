import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Center } from "@react-three/drei";
import * as THREE from "three";
import { buildModel } from "../utils/modelBuilder.js";

// Gives every mesh in the generated group a consistent, pleasant material
// for the preview (the backend ignores materials entirely — STL files only
// store geometry).
function paint(group) {
  group.traverse((child) => {
    if (child.isMesh) {
      child.material = new THREE.MeshStandardMaterial({
        color: "#5b5be0",
        roughness: 0.45,
        metalness: 0.05,
      });
    }
  });
  return group;
}

export default function ModelPreview({ template, measurements }) {
  const group = useMemo(() => paint(buildModel(template, measurements)), [template, measurements]);

  return (
    <div className="canvas-wrap">
      <Canvas camera={{ position: [80, 80, 80], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[50, 80, 50]} intensity={0.8} />
        {/* Our models are built with Z as "up" (the print bed is z=0),
            but three.js cameras default to Y as "up" — rotate -90° on X
            so the model appears standing the right way in the viewer. */}
        <Center>
          <group rotation={[-Math.PI / 2, 0, 0]}>
            <primitive object={group} />
          </group>
        </Center>
        <Grid args={[200, 200]} cellColor="#dcdcf0" sectionColor="#b8b8e0" position={[0, -0.01, 0]} />
        <OrbitControls enablePan={false} />
      </Canvas>
    </div>
  );
}
