// modelBuilder.js
//
// This file builds a THREE.Group (a small "scene" of one or more meshes)
// from a template name + a set of measurements.
//
// IMPORTANT: This exact file also lives at backend/src/modelBuilder.js
// so that the live 3D preview (frontend) and the downloaded STL file
// (backend) are always built from identical geometry. If you change the
// shapes here, copy the same change into the backend file.
//
// Every template is intentionally simple (boxes, flat plates with holes,
// tubes, and one bent-plate "L" bracket). This is the MVP: geometry is
// generated from numbers the user types in, not from the photo itself.

import * as THREE from "three";

// ---- small helpers -------------------------------------------------------

// A flat rectangle (centered at the origin) with 0, 1, 2 or 4 round holes.
function rectShapeWithHoles(length, width, holeCount, holeDiameter) {
  const l = Math.max(length, 1);
  const w = Math.max(width, 1);

  const shape = new THREE.Shape();
  shape.moveTo(-l / 2, -w / 2);
  shape.lineTo(l / 2, -w / 2);
  shape.lineTo(l / 2, w / 2);
  shape.lineTo(-l / 2, w / 2);
  shape.lineTo(-l / 2, -w / 2);

  const count = Math.max(0, Math.floor(holeCount || 0));
  const r = Math.max((holeDiameter || 0) / 2, 0);

  if (count > 0 && r > 0) {
    for (const [x, y] of holePositions(count, l, w)) {
      const hole = new THREE.Path();
      hole.absarc(x, y, r, 0, Math.PI * 2, true);
      shape.holes.push(hole);
    }
  }

  return shape;
}

// Decide where to put N screw holes on an l x w plate.
function holePositions(count, l, w) {
  const margin = Math.min(l, w) * 0.15;
  const insetX = l / 2 - margin;
  const insetY = w / 2 - margin;

  if (count === 1) return [[0, 0]];
  if (count === 2) return [[-insetX, 0], [insetX, 0]];
  if (count === 4) {
    return [
      [-insetX, -insetY],
      [insetX, -insetY],
      [insetX, insetY],
      [-insetX, insetY],
    ];
  }
  // Fallback for any other number: spread evenly along the length.
  const pts = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    pts.push([-insetX + t * 2 * insetX, 0]);
  }
  return pts;
}

function safeNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// ---- main entry point -----------------------------------------------------

/**
 * Build a THREE.Group representing the chosen template.
 * @param {string} template - one of: bracket, clip, keychain, mount, spacer, box, custom
 * @param {object} measurements - { length, width, height, thickness, holeDiameter, screwHoles }
 * @returns {THREE.Group}
 */
export function buildModel(template, measurements = {}) {
  const length = safeNumber(measurements.length, 50);
  const width = safeNumber(measurements.width, 30);
  const height = safeNumber(measurements.height, 20);
  const thickness = safeNumber(measurements.thickness, 3);
  const holeDiameter = safeNumber(measurements.holeDiameter, 5);
  const screwHoles = Math.max(0, Math.floor(Number(measurements.screwHoles) || 0));

  const group = new THREE.Group();
  group.name = `3dify-${template}`;

  switch (template) {
    case "box": {
      const geo = new THREE.BoxGeometry(length, width, height);
      const mesh = new THREE.Mesh(geo);
      mesh.position.z = height / 2; // sit on the print bed (z = 0)
      group.add(mesh);
      break;
    }

    case "spacer": {
      // "width" doubles as the outer diameter, "holeDiameter" the bore, "height" the spacer height.
      const outerR = width / 2;
      const innerR = holeDiameter / 2;
      const shape = new THREE.Shape();
      shape.absarc(0, 0, outerR, 0, Math.PI * 2, false);
      if (innerR > 0 && innerR < outerR) {
        const hole = new THREE.Path();
        hole.absarc(0, 0, innerR, 0, Math.PI * 2, true);
        shape.holes.push(hole);
      }
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: height,
        bevelEnabled: false,
        curveSegments: 48,
      });
      group.add(new THREE.Mesh(geo));
      break;
    }

    case "mount":
    case "custom": {
      const shape = rectShapeWithHoles(length, width, screwHoles, holeDiameter);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
      group.add(new THREE.Mesh(geo));
      break;
    }

    case "keychain": {
      const shape = new THREE.Shape();
      shape.moveTo(-length / 2, -width / 2);
      shape.lineTo(length / 2, -width / 2);
      shape.lineTo(length / 2, width / 2);
      shape.lineTo(-length / 2, width / 2);
      shape.lineTo(-length / 2, -width / 2);

      const r = Math.max(holeDiameter / 2, 1);
      const hy = width / 2 - r - Math.min(width, length) * 0.12;
      const hole = new THREE.Path();
      hole.absarc(0, hy, r, 0, Math.PI * 2, true);
      shape.holes.push(hole);

      const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
      group.add(new THREE.Mesh(geo));
      break;
    }

    case "bracket": {
      // Plate 1: flat, lying on the bed, length x width x thickness.
      const shape1 = rectShapeWithHoles(length, width, screwHoles, holeDiameter);
      const geo1 = new THREE.ExtrudeGeometry(shape1, { depth: thickness, bevelEnabled: false });
      group.add(new THREE.Mesh(geo1));

      // Plate 2: identical plate, rotated 90 degrees and attached to the
      // left edge of plate 1, so the two plates form an "L".
      const shape2 = rectShapeWithHoles(height, width, screwHoles, holeDiameter);
      const geo2 = new THREE.ExtrudeGeometry(shape2, { depth: thickness, bevelEnabled: false });
      const mesh2 = new THREE.Mesh(geo2);

      const wrapper = new THREE.Group();
      wrapper.add(mesh2);
      wrapper.rotation.y = Math.PI / 2;
      wrapper.position.set(-length / 2, 0, height / 2);
      group.add(wrapper);
      break;
    }

    case "clip": {
      // A "C" shaped channel cross-section (width x height, wall = thickness),
      // extruded along its length so an object can be clipped into the gap.
      const W = width;
      const H = height;
      const t = Math.min(thickness, Math.min(W, H) / 2 - 0.1);

      const shape = new THREE.Shape();
      shape.moveTo(-W / 2, -H / 2);
      shape.lineTo(W / 2, -H / 2);
      shape.lineTo(W / 2, -H / 2 + t);
      shape.lineTo(-W / 2 + t, -H / 2 + t);
      shape.lineTo(-W / 2 + t, H / 2 - t);
      shape.lineTo(W / 2, H / 2 - t);
      shape.lineTo(W / 2, H / 2);
      shape.lineTo(-W / 2, H / 2);
      shape.lineTo(-W / 2, -H / 2);

      const geo = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
      geo.translate(0, 0, -length / 2); // center along the extrusion axis
      group.add(new THREE.Mesh(geo));
      break;
    }

    default: {
      // Unknown template: fall back to a simple box so the app never crashes.
      const geo = new THREE.BoxGeometry(length, width, height);
      const mesh = new THREE.Mesh(geo);
      mesh.position.z = height / 2;
      group.add(mesh);
    }
  }

  return group;
}

// Which measurement fields matter for each template, and what to call them
// in the UI. Used by the frontend form; kept here so labels always match
// the geometry logic above.
export const TEMPLATE_FIELDS = {
  bracket: [
    { key: "length", label: "Plate 1 length (mm)", default: 50 },
    { key: "height", label: "Plate 2 length (mm)", default: 30 },
    { key: "width", label: "Width (mm)", default: 25 },
    { key: "thickness", label: "Thickness (mm)", default: 3 },
    { key: "screwHoles", label: "Screw holes (per plate)", default: 2, isInt: true },
    { key: "holeDiameter", label: "Screw hole diameter (mm)", default: 4 },
  ],
  clip: [
    { key: "width", label: "Outer width (mm)", default: 20 },
    { key: "height", label: "Outer height (mm)", default: 15 },
    { key: "thickness", label: "Wall thickness (mm)", default: 3 },
    { key: "length", label: "Length (mm)", default: 25 },
  ],
  keychain: [
    { key: "length", label: "Length (mm)", default: 50 },
    { key: "width", label: "Width (mm)", default: 25 },
    { key: "thickness", label: "Thickness (mm)", default: 4 },
    { key: "holeDiameter", label: "Keyring hole diameter (mm)", default: 6 },
  ],
  mount: [
    { key: "length", label: "Length (mm)", default: 60 },
    { key: "width", label: "Width (mm)", default: 40 },
    { key: "thickness", label: "Thickness (mm)", default: 4 },
    { key: "screwHoles", label: "Number of screw holes", default: 4, isInt: true },
    { key: "holeDiameter", label: "Screw hole diameter (mm)", default: 4 },
  ],
  spacer: [
    { key: "width", label: "Outer diameter (mm)", default: 15 },
    { key: "holeDiameter", label: "Inner hole diameter (mm)", default: 6 },
    { key: "height", label: "Height / length (mm)", default: 10 },
  ],
  box: [
    { key: "length", label: "
