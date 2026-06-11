"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Line, OrbitControls, Text } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";
import * as THREE from "three";
import type { GeometrySceneSpec } from "@/lib/geometry/geometry-scene-types";

type GeometryR3FSceneProps = {
  scene: GeometrySceneSpec;
  selectedRefs: string[];
  activeTimelineId: string | null;
  onSelectRef: (refId: string) => void;
};

export function GeometryR3FScene({
  scene,
  selectedRefs,
  activeTimelineId,
  onSelectRef,
}: GeometryR3FSceneProps) {
  return (
    <div className="h-[min(58vh,620px)] min-h-[420px] w-full overflow-hidden rounded-md border border-border/70 bg-slate-950">
      <Canvas
        camera={{ position: [4.4, -5.2, 3.6], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color args={["#020617"]} attach="background" />
        <ambientLight intensity={0.65} />
        <directionalLight intensity={1.25} position={[4, -5, 7]} />
        <GeometryScene3D
          activeTimelineId={activeTimelineId}
          onSelectRef={onSelectRef}
          scene={scene}
          selectedRefs={selectedRefs}
        />
        <OrbitControls
          enableDamping
          maxDistance={9}
          minDistance={3.2}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}

function GeometryScene3D({
  scene,
  selectedRefs,
  activeTimelineId,
  onSelectRef,
}: GeometryR3FSceneProps) {
  const rootRef = useRef<THREE.Group | null>(null);
  const pulseRef = useRef(0);
  const selected = useMemo(() => new Set(selectedRefs), [selectedRefs]);
  const activeTimeline = useMemo(
    () => scene.timeline.find((item) => item.id === activeTimelineId) ?? null,
    [activeTimelineId, scene.timeline]
  );
  const activeRefs = useMemo(
    () => new Set(activeTimeline?.refs ?? []),
    [activeTimeline]
  );
  const pointMap = useMemo(
    () =>
      new Map(
        scene.vertices.map((vertex) => [
          vertex.id,
          new THREE.Vector3(...vertex.position),
        ])
      ),
    [scene.vertices]
  );

  useEffect(() => {
    if (!rootRef.current || !activeTimeline) {
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) {
      return;
    }

    const timeline = gsap.timeline({
      defaults: { duration: 0.52, ease: "power3.inOut" },
    });
    if (activeTimeline.action === "rotate_camera") {
      timeline.to(rootRef.current.rotation, {
        x: -0.14,
        y: rootRef.current.rotation.y + 0.68,
      });
    } else {
      timeline
        .to(rootRef.current.rotation, { y: rootRef.current.rotation.y + 0.18 })
        .to(rootRef.current.scale, { x: 1.035, y: 1.035, z: 1.035 }, "<")
        .to(rootRef.current.scale, { x: 1, y: 1, z: 1 }, ">");
    }

    gsap.fromTo(
      pulseRef,
      { current: 0.15 },
      { current: 1, duration: 0.7, ease: "power2.out", overwrite: "auto" }
    );

    return () => {
      timeline.kill();
    };
  }, [activeTimeline]);

  useFrame((state) => {
    if (!rootRef.current) {
      return;
    }
    rootRef.current.position.z = Math.sin(state.clock.elapsedTime * 0.7) * 0.015;
  });

  return (
    <group ref={rootRef} rotation={[-0.08, 0.28, 0]}>
      <GridFloor />
      {scene.faces.map((face) => {
        const vertices = face.vertices
          .map((vertexId) => pointMap.get(vertexId))
          .filter((point): point is THREE.Vector3 => Boolean(point));
        if (vertices.length < 3) {
          return null;
        }
        return (
          <FaceMesh
            active={activeRefs.has(face.id)}
            faceKind={face.kind}
            key={face.id}
            onSelect={() => onSelectRef(face.id)}
            selected={selected.has(face.id)}
            vertices={vertices}
          />
        );
      })}
      {scene.edges.map((edge) => {
        const from = pointMap.get(edge.from);
        const to = pointMap.get(edge.to);
        if (!from || !to) {
          return null;
        }
        return (
          <EdgeLine
            active={activeRefs.has(edge.id)}
            edgeKind={edge.kind}
            from={from}
            key={edge.id}
            onSelect={() => onSelectRef(edge.id)}
            selected={selected.has(edge.id)}
            to={to}
          />
        );
      })}
      {scene.vertices
        .filter((vertex) => vertex.visible !== false)
        .map((vertex) => {
          const point = pointMap.get(vertex.id);
          if (!point) {
            return null;
          }
          return (
            <VertexPoint
              active={activeRefs.has(vertex.id)}
              key={vertex.id}
              label={vertex.label}
              onSelect={() => onSelectRef(vertex.id)}
              position={point}
              selected={selected.has(vertex.id)}
            />
          );
        })}
    </group>
  );
}

function FaceMesh({
  vertices,
  faceKind,
  selected,
  active,
  onSelect,
}: {
  vertices: THREE.Vector3[];
  faceKind?: GeometrySceneSpec["faces"][number]["kind"];
  selected: boolean;
  active: boolean;
  onSelect: () => void;
}) {
  const geometry = useMemo(() => {
    const shapeGeometry = new THREE.BufferGeometry();
    const triangles: number[] = [];
    for (let index = 1; index < vertices.length - 1; index += 1) {
      triangles.push(
        ...vertices[0].toArray(),
        ...vertices[index].toArray(),
        ...vertices[index + 1].toArray()
      );
    }
    shapeGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(triangles, 3)
    );
    shapeGeometry.computeVertexNormals();
    return shapeGeometry;
  }, [vertices]);

  return (
    <mesh geometry={geometry} onClick={onSelect}>
      <meshStandardMaterial
        color={faceColor(faceKind, selected, active)}
        opacity={selected || active ? 0.42 : 0.18}
        side={THREE.DoubleSide}
        transparent
      />
    </mesh>
  );
}

function EdgeLine({
  from,
  to,
  edgeKind,
  selected,
  active,
  onSelect,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  edgeKind?: GeometrySceneSpec["edges"][number]["kind"];
  selected: boolean;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <Line
      color={edgeColor(edgeKind, selected, active)}
      dashed={edgeKind === "hidden"}
      lineWidth={selected || active ? 5 : 2.5}
      onClick={onSelect}
      points={[from, to]}
    />
  );
}

function VertexPoint({
  position,
  label,
  selected,
  active,
  onSelect,
}: {
  position: THREE.Vector3;
  label: string;
  selected: boolean;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <group position={position}>
      <mesh onClick={onSelect}>
        <sphereGeometry args={[selected || active ? 0.085 : 0.06, 24, 24]} />
        <meshStandardMaterial color={selected || active ? "#22d3ee" : "#f8fafc"} />
      </mesh>
      <Text
        anchorX="left"
        anchorY="middle"
        color="#e2e8f0"
        fontSize={0.16}
        position={[0.09, 0.08, 0.08]}
      >
        {label}
      </Text>
    </group>
  );
}

function GridFloor() {
  return (
    <group position={[0, 0, -1.03]}>
      {Array.from({ length: 9 }).map((_, index) => {
        const value = -2 + index * 0.5;
        return (
          <group key={value}>
            <Line color="#1e293b" lineWidth={1} points={[[value, -2.2, 0], [value, 2.2, 0]]} />
            <Line color="#1e293b" lineWidth={1} points={[[-2.2, value, 0], [2.2, value, 0]]} />
          </group>
        );
      })}
    </group>
  );
}

function faceColor(
  kind: GeometrySceneSpec["faces"][number]["kind"] | undefined,
  selected: boolean,
  active: boolean
) {
  if (selected || active) {
    return "#22d3ee";
  }
  if (kind === "section") {
    return "#f59e0b";
  }
  if (kind === "auxiliary") {
    return "#34d399";
  }
  if (kind === "base") {
    return "#94a3b8";
  }
  return "#3b82f6";
}

function edgeColor(
  kind: GeometrySceneSpec["edges"][number]["kind"] | undefined,
  selected: boolean,
  active: boolean
) {
  if (selected || active) {
    return "#22d3ee";
  }
  if (kind === "auxiliary") {
    return "#f59e0b";
  }
  if (kind === "projection") {
    return "#34d399";
  }
  if (kind === "hidden") {
    return "#64748b";
  }
  return "#e2e8f0";
}
