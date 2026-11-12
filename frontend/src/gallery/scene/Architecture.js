/* eslint-disable react/no-unknown-property, react/prop-types */
import * as React from "react";
import * as THREE from "three";
import {MeshReflectorMaterial, useTexture} from "@react-three/drei";
import {RoundedBoxGeometry} from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {runtime} from "../runtime";
import {plasterTexture, concreteTexture, woodTexture, radialTexture, haloTexture, SURFACES, setupSurfaceTexture} from "../textures";
import {
  BOUNDARY, PERIMETER_WALLS, SOUTH_WALL, PARTITIONS, PARTITION_HEIGHT, PARTITION_THICKNESS,
  WALL_HEIGHT, BENCHES, BENCH_SIZE, PLATFORM, ARC, SLOT_PLACEMENTS, BAY, WALL_BAYS, partitionCenterline,
} from "../layout/mainHall";

const BENCH_WOOD = {night: "#4a3426", white: "#d9c3a0", warm: "#7a4c2c"};

// A texture copy with its own repeat; copies share the source image.
const repeated = (texture, x, y) => {
  const copy = texture.clone();
  copy.repeat.set(x, y);
  copy.needsUpdate = true;
  return copy;
};

const SURFACE_URLS = {
  concreteAlbedo: SURFACES.concrete.albedo,
  concreteNormal: SURFACES.concrete.normal,
  concreteArm: SURFACES.concrete.arm,
  woodAlbedo: SURFACES.wood.albedo,
  woodNormal: SURFACES.wood.normal,
  woodArm: SURFACES.wood.arm,
  plasterNormal: SURFACES.plaster.normal,
};
useTexture.preload(Object.values(SURFACE_URLS));

// Loads the scanned PBR surfaces. Suspends until they are ready, so callers
// render the canvas-texture version as the fallback.
export const useSurfaces = () => {
  const loaded = useTexture(SURFACE_URLS);
  return React.useMemo(() => ({
    concrete: {
      albedo: setupSurfaceTexture(loaded.concreteAlbedo, true),
      normal: setupSurfaceTexture(loaded.concreteNormal),
      arm: setupSurfaceTexture(loaded.concreteArm),
    },
    wood: {
      albedo: setupSurfaceTexture(loaded.woodAlbedo, true),
      normal: setupSurfaceTexture(loaded.woodNormal),
      arm: setupSurfaceTexture(loaded.woodArm),
    },
    plaster: {normal: setupSurfaceTexture(loaded.plasterNormal)},
  }), [loaded]);
};

// Fine paint texture on walls: a plaster normal map sized in meters.
const PLASTER_NORMAL_SCALE = new THREE.Vector2(0.45, 0.45);
const usePlasterNormal = (surfaces) => {
  const maps = React.useMemo(() => new Map(), [surfaces]);
  return (width, height) => {
    if (!surfaces) return null;
    const x = Math.max(1, Math.round(width / SURFACES.plaster.size));
    const y = Math.max(1, Math.round(height / SURFACES.plaster.size));
    const key = `${x}:${y}`;
    if (!maps.has(key)) maps.set(key, repeated(surfaces.plaster.normal, x, y));
    return maps.get(key);
  };
};

// A soft dark patch on the floor under furniture: baked ambient occlusion that
// grounds the object even where screen-space AO is off or too faint.
const CONTACT_MARGIN = 0.45;
const ContactShadow = ({width, depth, opacity = 0.5}) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} renderOrder={1}>
    <planeGeometry args={[width + CONTACT_MARGIN * 2, depth + CONTACT_MARGIN * 2]} />
    <meshBasicMaterial map={haloTexture()} color="#000000" transparent opacity={opacity} depthWrite={false} />
  </mesh>
);

const roundedBox = (width, height, depth, radius) => new RoundedBoxGeometry(width, height, depth, 3, radius);

// A wall that follows a centerline in plan ([x, z] pairs): given thickness,
// rounded ends and softened top edges. Its UVs are in meters.
const bandGeometry = (points, thickness, height, bevel = 0.012) => {
  // work in the extrusion's 2D space, where y is -z
  const centerline = points.map(([x, z]) => new THREE.Vector2(x, -z));
  const last = centerline.length - 1;
  const half = thickness / 2 - bevel;
  const normals = centerline.map((_, i) => {
    const a = centerline[Math.max(0, i - 1)];
    const b = centerline[Math.min(last, i + 1)];
    const tangent = b.clone().sub(a).normalize();
    return new THREE.Vector2(-tangent.y, tangent.x);
  });
  const side = (sign) => centerline.map((point, i) => point.clone().addScaledVector(normals[i], sign * half));
  const left = side(1);
  const right = side(-1).reverse();
  const shape = new THREE.Shape();
  shape.moveTo(left[0].x, left[0].y);
  left.slice(1).forEach((point) => shape.lineTo(point.x, point.y));
  // round caps that bulge outward past each end
  const endAngle = Math.atan2(normals[last].y, normals[last].x);
  shape.absarc(centerline[last].x, centerline[last].y, half, endAngle, endAngle - Math.PI, true);
  right.forEach((point) => shape.lineTo(point.x, point.y));
  const startAngle = Math.atan2(normals[0].y, normals[0].x);
  shape.absarc(centerline[0].x, centerline[0].y, half, startAngle + Math.PI, startAngle, true);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 10,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, bevel, 0);
  return geometry;
};

const segmentPose = (start, end) => {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  return {
    length: Math.hypot(dx, dz),
    mid: [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2],
    // turns local +x onto the segment direction
    rotationY: Math.atan2(-dz, dx),
  };
};

// A mesh that fades out when it hides the robot from the camera.
const Occluder = ({children, ...props}) => {
  const ref = React.useRef();
  React.useEffect(() => {
    const mesh = ref.current;
    runtime.occluders.add(mesh);
    return () => runtime.occluders.delete(mesh);
  }, []);
  return <mesh ref={ref} {...props}>{children}</mesh>;
};

const FLOOR_NORMAL_SCALE = new THREE.Vector2(0.7, 0.7);

export const Floor = ({theme, reflective, surfaces}) => {
  const geometry = React.useMemo(() => {
    const shape = new THREE.Shape(BOUNDARY.map(([x, z]) => new THREE.Vector2(x, -z)));
    return new THREE.ShapeGeometry(shape);
  }, []);
  // the floor's UVs are in meters
  const maps = React.useMemo(() => {
    const kind = theme.floorTexture === "wood" ? "wood" : "concrete";
    if (!surfaces) return {map: repeated(kind === "wood" ? woodTexture() : concreteTexture(), 0.16, 0.16)};
    const scale = 1 / SURFACES[kind].size;
    const surface = surfaces[kind];
    const arm = repeated(surface.arm, scale, scale);
    return {
      map: repeated(surface.albedo, scale, scale),
      normalMap: repeated(surface.normal, scale, scale),
      normalScale: FLOOR_NORMAL_SCALE,
      roughnessMap: arm,
      aoMap: arm,
      aoMapIntensity: 0.7,
    };
  }, [theme.floorTexture, surfaces]);
  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
      {reflective ? (
        <MeshReflectorMaterial
          {...maps}
          color={theme.floor}
          roughness={0.85}
          metalness={0.35}
          blur={[400, 120]}
          resolution={1024}
          mixBlur={1}
          mixStrength={1.6}
          mirror={0.6}
          depthScale={1.1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.3}
        />
      ) : (
        <meshStandardMaterial {...maps} color={theme.floor} roughness={theme.floorRoughness} />
      )}
    </mesh>
  );
};

export const Ceiling = ({theme}) => {
  const geometry = React.useMemo(() => {
    const shape = new THREE.Shape(BOUNDARY.map(([x, z]) => new THREE.Vector2(x, z)));
    return new THREE.ShapeGeometry(shape);
  }, []);
  // light strips that follow the curved wall, plus two straight runs
  const strips = React.useMemo(() => {
    const arcStrips = Array.from({length: 12}, (_, i) => {
      const angle = ARC.from + ((ARC.to - ARC.from) * (i + 0.5)) / 12;
      const radius = ARC.radius - 2.2;
      return {
        position: [ARC.center[0] + Math.sin(angle) * radius, ARC.center[1] - Math.cos(angle) * radius],
        rotationY: -angle,
        length: 1.25,
      };
    });
    return [
      ...arcStrips,
      {position: [-7.5, 3], rotationY: Math.PI / 2, length: 9},
      {position: [7.5, 3], rotationY: Math.PI / 2, length: 9},
    ];
  }, []);
  return (
    <group>
      <mesh geometry={geometry} rotation={[Math.PI / 2, 0, 0]} position={[0, WALL_HEIGHT, 0]}>
        <meshStandardMaterial color={theme.ceiling} roughness={1} />
      </mesh>
      {strips.map((strip, i) => (
        <mesh key={i} position={[strip.position[0], WALL_HEIGHT - 0.03, strip.position[1]]} rotation={[0, strip.rotationY, 0]}>
          <boxGeometry args={[strip.length, 0.04, 0.09]} />
          <meshBasicMaterial color={theme.dark ? "#ffe2b8" : "#ffffff"} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
};

// Painted walls: with the PBR surfaces loaded they are flat paint over a fine
// plaster relief, otherwise the older blotchy canvas texture.
const wallMaterialProps = (surfaces, plasterNormal, canvasMap, width, height) => (surfaces ?
  {normalMap: plasterNormal(width, height), normalScale: PLASTER_NORMAL_SCALE} :
  {map: canvasMap});

// Vertical shadow joints between wall panels, spaced evenly around the room.
const JOINT_SPACING = 2.5;
const JOINTS = (() => {
  const joints = [];
  let travelled = 0;
  PERIMETER_WALLS.forEach((wall) => {
    const pose = segmentPose(wall.start, wall.end);
    // keep joints off the corners
    for (let at = Math.ceil((travelled + 0.3) / JOINT_SPACING) * JOINT_SPACING; at < travelled + pose.length - 0.3; at += JOINT_SPACING) {
      const t = (at - travelled) / pose.length;
      joints.push({
        position: [
          wall.start[0] + (wall.end[0] - wall.start[0]) * t + wall.normal[0] * 0.003,
          wall.start[1] + (wall.end[1] - wall.start[1]) * t + wall.normal[1] * 0.003,
        ],
        rotationY: Math.atan2(wall.normal[0], wall.normal[1]),
      });
    }
    travelled += pose.length;
  });
  return joints;
})();

export const PerimeterWalls = ({theme, surfaces}) => {
  const plaster = plasterTexture();
  const plasterNormal = usePlasterNormal(surfaces);
  const maps = React.useMemo(() => new Map(), []);
  const mapFor = (length) => {
    const key = Math.max(1, Math.round(length / 4));
    if (!maps.has(key)) maps.set(key, repeated(plaster, key, 1.2));
    return maps.get(key);
  };
  return (
    <group>
      {PERIMETER_WALLS.map((wall, i) => {
        const pose = segmentPose(wall.start, wall.end);
        const rotationY = Math.atan2(wall.normal[0], wall.normal[1]);
        return (
          <group key={i} position={[pose.mid[0], 0, pose.mid[1]]} rotation={[0, rotationY, 0]}>
            <mesh position={[0, WALL_HEIGHT / 2, 0]}>
              <planeGeometry args={[pose.length + 0.02, WALL_HEIGHT]} />
              <meshStandardMaterial
                {...wallMaterialProps(surfaces, plasterNormal, mapFor(pose.length), pose.length, WALL_HEIGHT)}
                color={theme.wall}
                roughness={0.92}
              />
            </mesh>
            {/* shadow gaps where the wall meets the floor and the ceiling */}
            <mesh position={[0, 0.04, 0.004]}>
              <planeGeometry args={[pose.length + 0.02, 0.08]} />
              <meshBasicMaterial color={theme.trim} />
            </mesh>
            <mesh position={[0, WALL_HEIGHT - 0.03, 0.004]}>
              <planeGeometry args={[pose.length + 0.02, 0.06]} />
              <meshBasicMaterial color={theme.trim} />
            </mesh>
          </group>
        );
      })}
      {JOINTS.map((joint, i) => (
        <mesh key={`joint${i}`} position={[joint.position[0], WALL_HEIGHT / 2, joint.position[1]]} rotation={[0, joint.rotationY, 0]}>
          <planeGeometry args={[0.014, WALL_HEIGHT - 0.14]} />
          <meshBasicMaterial color={theme.trim} />
        </mesh>
      ))}
    </group>
  );
};

// The south wall is built from boxes around a window and the entrance door, so it
// also reads correctly from outside during the entrance sequence.
export const SouthWall = ({theme, surfaces}) => {
  const {thickness, window: win, door} = SOUTH_WALL;
  const z = SOUTH_WALL.start[1] + thickness / 2;
  const pieces = [
    [-14, win.from, 0, WALL_HEIGHT],
    [win.from, win.to, 0, win.bottom],
    [win.from, win.to, win.top, WALL_HEIGHT],
    [win.to, door.from, 0, WALL_HEIGHT],
    [door.from, door.to, door.top, WALL_HEIGHT],
    [door.to, 14, 0, WALL_HEIGHT],
  ];
  const plaster = React.useMemo(() => repeated(plasterTexture(), 2, 1), []);
  const plasterNormal = usePlasterNormal(surfaces);
  const sign = React.useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    context.fillStyle = "#1a1714";
    context.fillRect(0, 0, 1024, 256);
    context.fillStyle = "#f2e6d0";
    context.font = "600 120px \"Noto Serif TC\", serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("IGallery", 512, 128);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
  const windowWidth = win.to - win.from;
  const windowHeight = win.top - win.bottom;
  const windowCenter = [(win.from + win.to) / 2, (win.bottom + win.top) / 2];
  return (
    <group>
      {pieces.map(([x0, x1, y0, y1], i) => (
        <Occluder key={i} position={[(x0 + x1) / 2, (y0 + y1) / 2, z]}>
          <boxGeometry args={[x1 - x0, y1 - y0, thickness]} />
          <meshStandardMaterial
            {...wallMaterialProps(surfaces, plasterNormal, plaster, x1 - x0, y1 - y0)}
            color={theme.wall}
            roughness={0.92}
          />
        </Occluder>
      ))}
      {/* shadow gap along the floor on the inside */}
      {pieces.filter(([, , y0]) => y0 === 0).map(([x0, x1], i) => (
        <mesh key={i} position={[(x0 + x1) / 2, 0.04, z - thickness / 2 - 0.004]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[x1 - x0, 0.08]} />
          <meshBasicMaterial color={theme.trim} />
        </mesh>
      ))}
      {/* window glass and mullions */}
      <mesh position={[windowCenter[0], windowCenter[1], z]}>
        <planeGeometry args={[windowWidth, windowHeight]} />
        <meshStandardMaterial color="#cfe3f5" transparent opacity={0.1} roughness={0.05} metalness={0.2} depthWrite={false} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[windowCenter[0] + (side * windowWidth) / 6, windowCenter[1], z]}>
          <boxGeometry args={[0.06, windowHeight, 0.08]} />
          <meshStandardMaterial color={theme.trim} />
        </mesh>
      ))}
      <mesh position={[windowCenter[0], win.bottom - 0.02, z - 0.1]}>
        <boxGeometry args={[windowWidth + 0.1, 0.05, 0.3]} />
        <meshStandardMaterial color={theme.trim} />
      </mesh>
      {/* door frame */}
      {[door.from, door.to].map((x) => (
        <mesh key={x} position={[x, door.top / 2, z]}>
          <boxGeometry args={[0.08, door.top, thickness + 0.04]} />
          <meshStandardMaterial color={theme.trim} />
        </mesh>
      ))}
      {/* sign above the door, outside */}
      <mesh position={[(door.from + door.to) / 2, door.top + 0.75, z + thickness / 2 + 0.02]}>
        <planeGeometry args={[2.6, 0.65]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
      {/* entrance mat */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(door.from + door.to) / 2, 0.006, SOUTH_WALL.start[1] - 0.9]}>
        <planeGeometry args={[door.to - door.from - 0.2, 1.4]} />
        <meshStandardMaterial color={theme.trim} roughness={1} />
      </mesh>
    </group>
  );
};

export const WindowLight = ({color, strength}) => {
  const {window: win} = SOUTH_WALL;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(win.from + win.to) / 2, 0.01, SOUTH_WALL.start[1] - 2.4]} renderOrder={1}>
      <planeGeometry args={[(win.to - win.from) * 1.3, 5]} />
      <meshBasicMaterial map={radialTexture()} color={color} transparent opacity={strength} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  );
};

const PLINTH_HEIGHT = 0.06;

// Plaster normal map for geometry whose UVs are in meters.
const usePlasterNormalMeters = (surfaces) => React.useMemo(
    () => surfaces && repeated(surfaces.plaster.normal, 1 / SURFACES.plaster.size, 1 / SURFACES.plaster.size),
    [surfaces],
);

// A sculpted relief for the back of a partition: rounded vertical flutes that
// sway gently as they rise, easing back into the flat wall at the border. The
// back of a partition gets almost no direct light, so the grazing light from the
// LED strip above it is baked into vertex colors, relative to the flat wall so
// only the relief itself changes brightness.
const RELIEF = {depth: 0.035, period: 0.15, border: 0.25, inset: 0.35, bottom: 0.3, top: 0.45};
const GRAZING_LIGHT = new THREE.Vector3(-0.6, 0.35, 0.7).normalize();
const reliefGeometry = (width, height) => {
  const geometry = new THREE.PlaneGeometry(width, height, Math.round(width * 150), Math.round(height * 24));
  const position = geometry.attributes.position;
  const smooth = (t) => {
    const x = Math.max(0, Math.min(1, t));
    return x * x * (3 - 2 * x);
  };
  const heights = new Float32Array(position.count);
  const edges = new Float32Array(position.count);
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    edges[i] = smooth(Math.min(x + width / 2, width / 2 - x, y + height / 2, height / 2 - y) / RELIEF.border);
    // a half-round profile per flute, with narrow grooves between them
    const sway = 0.09 * Math.sin(y * 1.6 + x * 0.45);
    const f = ((x + sway) / RELIEF.period) % 1;
    const across = (f < 0 ? f + 1 : f) * 2 - 1;
    heights[i] = Math.sqrt(Math.max(0, 1 - across * across));
    position.setZ(i, RELIEF.depth * heights[i] * edges[i]);
  }
  geometry.computeVertexNormals();
  const normal = geometry.attributes.normal;
  const colors = new Float32Array(position.count * 3);
  const n = new THREE.Vector3();
  const flat = GRAZING_LIGHT.z;
  for (let i = 0; i < position.count; i++) {
    n.fromBufferAttribute(normal, i);
    const lit = 1 + 0.7 * (Math.max(0, n.dot(GRAZING_LIGHT)) - flat);
    const groove = 1 - 0.25 * (1 - heights[i]) * edges[i];
    colors.fill(Math.max(0, lit * groove), i * 3, i * 3 + 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
};

// Painting-side feature panel, matching the bays on the perimeter walls.
const PANEL_INSET = 0.25;

// Freestanding walls: a straight face for the painting with curved wings that
// fold toward the viewer, rounded ends, a colored panel behind the painting,
// and a dark recessed plinth so the wall seems to float.
export const Partitions = ({theme, surfaces}) => {
  const plaster = React.useMemo(() => repeated(plasterTexture(), 1, 1), []);
  const plasterNormal = usePlasterNormalMeters(surfaces);
  const shapes = React.useMemo(() => PARTITIONS.map((partition) => {
    const {length} = segmentPose(partition.start, partition.end);
    const centerline = partitionCenterline(length);
    const panelLength = Math.min(BAY.width, length - PANEL_INSET * 2);
    const panelOffset = PARTITION_THICKNESS / 2 + BAY.depth / 2;
    return {
      length,
      wall: bandGeometry(centerline, PARTITION_THICKNESS, PARTITION_HEIGHT),
      plinth: bandGeometry(centerline, PARTITION_THICKNESS - 0.08, PLINTH_HEIGHT, 0),
      panel: bandGeometry([[-panelLength / 2, panelOffset], [panelLength / 2, panelOffset]], BAY.depth, PARTITION_HEIGHT - 0.3, 0.006),
      relief: reliefGeometry(length - RELIEF.inset * 2, PARTITION_HEIGHT - RELIEF.bottom - RELIEF.top),
    };
  }), []);
  const material = surfaces ? {normalMap: plasterNormal, normalScale: PLASTER_NORMAL_SCALE} : {map: plaster};
  return (
    <group>
      {PARTITIONS.map((partition, i) => {
        const pose = segmentPose(partition.start, partition.end);
        const {wall, plinth, panel, relief, length} = shapes[i];
        return (
          <group key={i} position={[pose.mid[0], 0, pose.mid[1]]} rotation={[0, pose.rotationY, 0]}>
            <Occluder geometry={wall} position={[0, PLINTH_HEIGHT, 0]}>
              <meshStandardMaterial {...material} color={theme.partition} roughness={0.9} />
            </Occluder>
            <Occluder geometry={panel} position={[0, PLINTH_HEIGHT + 0.15, 0]}>
              <meshStandardMaterial {...material} color={theme.feature} roughness={0.85} />
            </Occluder>
            {/* the relief on the back, facing away from the painting */}
            <Occluder
              geometry={relief}
              position={[0, PLINTH_HEIGHT + RELIEF.bottom + (PARTITION_HEIGHT - RELIEF.bottom - RELIEF.top) / 2, -PARTITION_THICKNESS / 2 - 0.002]}
              rotation={[0, Math.PI, 0]}
            >
              <meshStandardMaterial color={theme.partition} roughness={0.8} vertexColors />
            </Occluder>
            {/* the LED grazing strip that lights the relief */}
            <mesh position={[0, PLINTH_HEIGHT + PARTITION_HEIGHT - RELIEF.top + 0.12, -PARTITION_THICKNESS / 2 - 0.02]}>
              <boxGeometry args={[length - RELIEF.inset * 2, 0.025, 0.04]} />
              <meshBasicMaterial color={theme.dark ? "#ffe2b8" : "#ffffff"} toneMapped={false} />
            </mesh>
            <mesh geometry={plinth}>
              <meshBasicMaterial color={theme.trim} />
            </mesh>
            <ContactShadow width={length} depth={PARTITION_THICKNESS + 0.2} opacity={theme.dark ? 0.6 : 0.35} />
          </group>
        );
      })}
    </group>
  );
};

// Colored panels behind the paintings on the perimeter walls.
export const WallBays = ({theme, surfaces}) => {
  const plasterNormal = usePlasterNormalMeters(surfaces);
  const geometries = React.useMemo(
      () => WALL_BAYS.map((path) => bandGeometry(path, BAY.depth, BAY.top - BAY.bottom, 0.006)),
      [],
  );
  const material = surfaces ? {normalMap: plasterNormal, normalScale: PLASTER_NORMAL_SCALE} : {};
  return (
    <group position={[0, BAY.bottom, 0]}>
      {geometries.map((geometry, i) => (
        <mesh key={i} geometry={geometry}>
          <meshStandardMaterial {...material} color={theme.feature} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
};

const BENCH_TOP = 0.07;
const LEG_INSET = 0.24;
const STEEL = {color: "#1c1c1e", metalness: 0.75, roughness: 0.32};

// A solid wood slab on two flat steel frames joined by a stretcher.
export const Benches = ({themeId, surfaces}) => {
  const top = React.useMemo(() => roundedBox(BENCH_SIZE.length, BENCH_TOP, BENCH_SIZE.depth, 0.018), []);
  const grain = React.useMemo(() => surfaces && {
    map: repeated(surfaces.wood.albedo, BENCH_SIZE.length / SURFACES.wood.size, 0.4),
    normalMap: repeated(surfaces.wood.normal, BENCH_SIZE.length / SURFACES.wood.size, 0.4),
  }, [surfaces]);
  const legHeight = BENCH_SIZE.height - BENCH_TOP;
  return (
    <group>
      {BENCHES.map((bench, i) => (
        <group key={i} position={[bench.position[0], 0, bench.position[1]]} rotation={[0, bench.rotationY, 0]}>
          <mesh geometry={top} position={[0, BENCH_SIZE.height - BENCH_TOP / 2, 0]}>
            <meshStandardMaterial {...grain} color={BENCH_WOOD[themeId]} roughness={0.5} />
          </mesh>
          {[-1, 1].map((side) => (
            <group key={side} position={[side * (BENCH_SIZE.length / 2 - LEG_INSET), 0, 0]}>
              {/* an open rectangular frame: two posts, a foot and a cap */}
              {[-1, 1].map((end) => (
                <mesh key={end} position={[0, legHeight / 2, end * (BENCH_SIZE.depth / 2 - 0.07)]}>
                  <boxGeometry args={[0.04, legHeight, 0.04]} />
                  <meshStandardMaterial {...STEEL} />
                </mesh>
              ))}
              <mesh position={[0, 0.012, 0]}>
                <boxGeometry args={[0.05, 0.024, BENCH_SIZE.depth - 0.1]} />
                <meshStandardMaterial {...STEEL} />
              </mesh>
              <mesh position={[0, legHeight - 0.012, 0]}>
                <boxGeometry args={[0.05, 0.024, BENCH_SIZE.depth - 0.1]} />
                <meshStandardMaterial {...STEEL} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, 0.14, 0]}>
            <boxGeometry args={[BENCH_SIZE.length - LEG_INSET * 2, 0.03, 0.03]} />
            <meshStandardMaterial {...STEEL} />
          </mesh>
          <ContactShadow width={BENCH_SIZE.length} depth={BENCH_SIZE.depth} opacity={0.85} />
        </group>
      ))}
    </group>
  );
};

// A lathed profile with a softened top edge and a slight flare at the base.
export const Platform = ({theme}) => {
  const geometry = React.useMemo(() => {
    const {radius: r, height: h} = PLATFORM;
    const profile = [
      [0, 0], [r + 0.05, 0], [r + 0.04, h - 0.03], [r + 0.03, h - 0.012], [r + 0.012, h - 0.002], [r, h], [0, h],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(profile, 96);
  }, []);
  return (
    <group position={[PLATFORM.center[0], 0, PLATFORM.center[1]]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial color={theme.partition} roughness={0.6} />
      </mesh>
      <mesh position={[0, PLATFORM.height + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[PLATFORM.radius - 0.08, PLATFORM.radius - 0.04, 96]} />
        <meshBasicMaterial color={theme.accent} toneMapped={false} />
      </mesh>
    </group>
  );
};

// How far out from the wall each picture light hangs, and how far it drops.
const FIXTURE_REACH = 1.7;
const FIXTURE_DROP = 0.55;
const UP = new THREE.Vector3(0, 1, 0);

// Ceiling-hung spotlights aimed at every wall slot. They give the baked light
// pools on the walls a visible source.
export const TrackLights = ({theme}) => {
  const fixtures = React.useMemo(() => Object.values(SLOT_PLACEMENTS).map(({position, normal}) => {
    const x = position[0] + normal[0] * FIXTURE_REACH;
    const z = position[2] + normal[1] * FIXTURE_REACH;
    const head = new THREE.Vector3(x, WALL_HEIGHT - FIXTURE_DROP, z);
    // aim a little above the painting's center, where the light pool starts
    const target = new THREE.Vector3(position[0], position[1] + 0.6, position[2]);
    const aim = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(target, head, UP));
    return {x, z, head, aim};
  }), []);
  const body = theme.dark ? "#1c1c1e" : "#ecebe8";
  return (
    <group>
      {fixtures.map(({x, z, head, aim}, i) => (
        <group key={i}>
          <mesh position={[x, WALL_HEIGHT - 0.012, z]}>
            <cylinderGeometry args={[0.055, 0.055, 0.024, 24]} />
            <meshStandardMaterial color={body} metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[x, WALL_HEIGHT - FIXTURE_DROP / 2, z]}>
            <cylinderGeometry args={[0.007, 0.007, FIXTURE_DROP, 8]} />
            <meshStandardMaterial color={body} metalness={0.6} roughness={0.35} />
          </mesh>
          <group position={head} quaternion={aim}>
            {/* the head's axis runs along +z, toward the painting */}
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.02]}>
              <cylinderGeometry args={[0.05, 0.042, 0.2, 24, 1, true]} />
              <meshStandardMaterial color={body} metalness={0.6} roughness={0.35} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, 0, -0.08]} rotation={[0, Math.PI, 0]}>
              <circleGeometry args={[0.042, 24]} />
              <meshStandardMaterial color={body} metalness={0.6} roughness={0.35} />
            </mesh>
            <mesh position={[0, 0, 0.1]}>
              <circleGeometry args={[0.04, 24]} />
              <meshBasicMaterial color={theme.pool} toneMapped={false} />
            </mesh>
            <mesh position={[0, 0.062, 0]}>
              <sphereGeometry args={[0.014, 12, 8]} />
              <meshStandardMaterial color={body} metalness={0.6} roughness={0.35} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
};
