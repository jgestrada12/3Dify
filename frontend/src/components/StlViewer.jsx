import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Center } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

// Renders an arbitrary STL Blob (e.g. from the AI photo pipeline, which
// isn't built from our own Z-up template geometry, so no axis correction
// is applied here — unlike ModelPreview.jsx).
export default function StlViewer({ blob }) {
  const [geometry, setGeometry] = useState(null);

  useEffect(() => {
    if (!blob) return;
    let cancelled = false;
    blob.arrayBuffer().then((buf) => {
      const loader = new STLLoader();
      const geo = loader.parse(buf);
      geo.computeVertexNormals();
      if (!cancelled) setGeometry(geo);
    });
    return () => {
      cancelled = true;
    };
  }, [blob]);

  if (!geometry) {
    return (
      <div className="canvas-wrap" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#8794a3" }}>
        Loading preview…
      </div>
    );
  }

  return (
    <div className="canvas-wrap">
      <Canvas camera={{ position: [80, 80, 80], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[50, 80, 50]} intensity={0.8} />
        <Center>
          <mesh geometry={geometry}>
            <meshStandardMaterial color="#5b5be0" roughness={0.45} metalness={0.05} />
          </mesh>
        </Center>
        <OrbitControls enablePan={false} />
      </Canvas>
    </div>
  );
}
