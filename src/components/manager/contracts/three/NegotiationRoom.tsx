"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

export function NegotiationRoom({ offset = [-0.45, 0, 0] }: { offset?: [number, number, number] }) {
  const tableRef = useRef<THREE.Mesh>(null);

  // ── MATERIALS ──────────────────────────────────────────────────────────
  const darkWood = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.06, 0.04, 0.02),
    roughness: 0.35,
    metalness: 0.08,
    envMapIntensity: 1.2,
  }), []);

  const tableTop = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.08, 0.055, 0.025),
    roughness: 0.15,
    metalness: 0.12,
    envMapIntensity: 1.5,
  }), []);

  const floorMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.055, 0.04, 0.025),
    roughness: 0.85,
    metalness: 0.02,
  }), []);

  const ceilMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.1, 0.07, 0.04),
    roughness: 0.95,
  }), []);

  const wallMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.07, 0.055, 0.035),
    roughness: 0.9,
  }), []);

  const glassMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.4, 0.6, 0.8),
    transparent: true,
    opacity: 0.12,
    roughness: 0.05,
    metalness: 0.1,
    side: THREE.DoubleSide,
  }), []);

  const goldMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.83, 0.68, 0.21),
    roughness: 0.3,
    metalness: 0.85,
  }), []);

  const leatherMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.1, 0.06, 0.03),
    roughness: 0.8,
    metalness: 0.0,
  }), []);

  const paperMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.96, 0.92, 0.84),
    roughness: 0.95,
    metalness: 0.0,
  }), []);

  // Stadium window glow - animated
  const stadiumGlowRef = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((state) => {
    if (stadiumGlowRef.current) {
      stadiumGlowRef.current.opacity = 0.85 + Math.sin(state.clock.getElapsedTime() * 0.5) * 0.08;
    }
    if (tableRef.current) {
      // Subtle table pulse with ceiling light
      const mat = tableRef.current.material as THREE.MeshStandardMaterial;
      mat.envMapIntensity = 1.4 + Math.sin(state.clock.getElapsedTime() * 0.3) * 0.1;
    }
  });

  return (
    <group>
      {/* ══════════════════════════════════════════════════
          ROOM STRUCTURE
      ══════════════════════════════════════════════════ */}

      {/* FLOOR */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]} receiveShadow>
        <planeGeometry args={[10, 8]} />
        <primitive object={floorMat} />
      </mesh>

      {/* Floor reflection overlay */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.19, 0]}>
        <planeGeometry args={[10, 8]} />
        <meshBasicMaterial color={new THREE.Color(0.83, 0.68, 0.21)} transparent opacity={0.03} />
      </mesh>

      {/* CEILING */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 2.8, 0]}>
        <planeGeometry args={[10, 8]} />
        <primitive object={ceilMat} />
      </mesh>

      {/* LEFT WALL */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-5, 0.8, 0]}>
        <planeGeometry args={[8, 4]} />
        <primitive object={wallMat} />
      </mesh>

      {/* RIGHT WALL */}
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[5, 0.8, 0]}>
        <planeGeometry args={[8, 4]} />
        <primitive object={wallMat} />
      </mesh>

      {/* ══════════════════════════════════════════════════
          BACK WALL: STADIUM PANORAMIC WINDOW
      ══════════════════════════════════════════════════ */}

      {/* Back wall panels beside windows */}
      <mesh position={[-4.2, 0.8, -3.9]}>
        <boxGeometry args={[1.5, 4, 0.1]} />
        <primitive object={darkWood} />
      </mesh>
      <mesh position={[4.2, 0.8, -3.9]}>
        <boxGeometry args={[1.5, 4, 0.1]} />
        <primitive object={darkWood} />
      </mesh>

      {/* Window frame top/bottom */}
      <mesh position={[0, 2.5, -3.9]}>
        <boxGeometry args={[7.5, 0.15, 0.12]} />
        <primitive object={goldMat} />
      </mesh>
      <mesh position={[0, -0.95, -3.9]}>
        <boxGeometry args={[7.5, 0.15, 0.12]} />
        <primitive object={goldMat} />
      </mesh>

      {/* Window vertical dividers */}
      {[-2.5, 0, 2.5].map((x, i) => (
        <mesh key={i} position={[x, 0.78, -3.9]}>
          <boxGeometry args={[0.08, 3.5, 0.1]} />
          <primitive object={goldMat} />
        </mesh>
      ))}

      {/* Glass panes */}
      {[-3.1, -0.6, 1.85].map((x, i) => (
        <mesh key={i} position={[x + 0.55, 0.78, -3.88]}>
          <planeGeometry args={[2.2, 3.45]} />
          <primitive object={glassMat} />
        </mesh>
      ))}

      {/* Stadium / City night sky - background plane */}
      <mesh position={[0, 0.8, -4.5]}>
        <planeGeometry args={[10, 6]} />
        <meshBasicMaterial color={new THREE.Color(0.015, 0.02, 0.04)} />
      </mesh>

      {/* Stadium floodlights & city bokeh */}
      {[-3.2, -1.6, 0, 1.6, 3.2].map((x, i) => (
        <group key={i} position={[x, 1.8, -4.4]}>
          <mesh position={[0, 0.65, 0]}>
            <circleGeometry args={[0.12, 16]} />
            <meshBasicMaterial color={new THREE.Color(1, 0.92, 0.7)} transparent opacity={0.65} />
          </mesh>
          <pointLight
            position={[0, 0.65, 0.1]}
            intensity={0.12}
            color={new THREE.Color(1, 0.9, 0.65)}
            distance={4}
          />
        </group>
      ))}

      {/* Luxury architectural bottom backlight (subtle amber/gold glow) */}
      <mesh position={[0, -0.6, -4.3]}>
        <planeGeometry args={[9, 1.5]} />
        <meshBasicMaterial ref={stadiumGlowRef} color={new THREE.Color(0.08, 0.06, 0.03)} transparent opacity={0.8} />
      </mesh>

      {/* ══════════════════════════════════════════════════
          CEILING LIGHTS
      ══════════════════════════════════════════════════ */}
      {[-2.5, 0, 2.5].map((x, i) => (
        <group key={i} position={[x, 2.75, -0.5]}>
          {/* Light housing */}
          <mesh>
            <cylinderGeometry args={[0.12, 0.1, 0.06, 16]} />
            <meshStandardMaterial color={new THREE.Color(0.15, 0.12, 0.08)} metalness={0.6} roughness={0.3} />
          </mesh>
          {/* Emissive light face */}
          <mesh position={[0, -0.04, 0]}>
            <circleGeometry args={[0.09, 16]} />
            <meshBasicMaterial color={new THREE.Color(1, 0.95, 0.85)} />
          </mesh>
          {/* Actual light */}
          <spotLight
            position={[0, -0.1, 0]}
            target-position={[x, -1.2, -0.5]}
            intensity={1.8}
            angle={0.55}
            penumbra={0.4}
            color={new THREE.Color(1, 0.95, 0.82)}
            castShadow
            shadow-mapSize={[512, 512]}
          />
        </group>
      ))}

      {/* ══════════════════════════════════════════════════
          CONFERENCE TABLE & CHAIRS (OFFSET POSITIONED)
      ══════════════════════════════════════════════════ */}
      <group position={offset}>
        {/* ── LUXURY EXECUTIVE BOARDROOM DESK (RECTANGULAR WITH GOLD ACCENTS) ── */}
        {/* Main Desktop */}
        <mesh ref={tableRef} position={[0, -0.48, 0.05]} castShadow receiveShadow>
          <boxGeometry args={[2.3, 0.05, 0.75]} />
          <primitive object={tableTop} />
        </mesh>

        {/* Gold Trim around Desktop */}
        <mesh position={[0, -0.48, 0.428]}>
          <boxGeometry args={[2.32, 0.02, 0.015]} />
          <primitive object={goldMat} />
        </mesh>
        <mesh position={[0, -0.48, -0.328]}>
          <boxGeometry args={[2.32, 0.02, 0.015]} />
          <primitive object={goldMat} />
        </mesh>
        <mesh position={[-1.155, -0.48, 0.05]}>
          <boxGeometry args={[0.015, 0.02, 0.76]} />
          <primitive object={goldMat} />
        </mesh>
        <mesh position={[1.155, -0.48, 0.05]}>
          <boxGeometry args={[0.015, 0.02, 0.76]} />
          <primitive object={goldMat} />
        </mesh>

        {/* Desk Front Modesty Panel (Facing Camera) */}
        <mesh position={[0, -0.82, 0.4]}>
          <boxGeometry args={[2.1, 0.65, 0.04]} />
          <primitive object={darkWood} />
        </mesh>
        {/* Gold Base Strip on Front Panel */}
        <mesh position={[0, -1.14, 0.41]}>
          <boxGeometry args={[2.12, 0.03, 0.02]} />
          <primitive object={goldMat} />
        </mesh>

        {/* Left & Right Desk Legs */}
        {[-0.95, 0.95].map((lx, i) => (
          <mesh key={i} position={[lx, -0.82, 0.05]}>
            <boxGeometry args={[0.1, 0.65, 0.65]} />
            <primitive object={darkWood} />
          </mesh>
        ))}

        {/* ── CONTRACT DOCUMENT ON TABLE ── */}
        <group position={[0, -0.45, 0.05]} rotation={[0, 0.05, 0]}>
          <mesh>
            <boxGeometry args={[0.22, 0.003, 0.3]} />
            <primitive object={paperMat} />
          </mesh>
          {[0.08, 0.04, 0, -0.04, -0.08].map((z, i) => (
            <mesh key={i} position={[0, 0.002, z]}>
              <boxGeometry args={[i === 0 ? 0.12 : 0.17, 0.001, 0.006]} />
              <meshBasicMaterial color={new THREE.Color(0.1, 0.08, 0.04)} transparent opacity={i === 0 ? 0.7 : 0.25} />
            </mesh>
          ))}
          <mesh position={[0.07, 0.003, -0.1]}>
            <cylinderGeometry args={[0.018, 0.018, 0.003, 16]} />
            <primitive object={goldMat} />
          </mesh>
          <mesh position={[-0.13, 0.004, -0.06]} rotation={[0, -0.3, Math.PI / 2]}>
            <cylinderGeometry args={[0.006, 0.004, 0.28, 8]} />
            <meshStandardMaterial color={new THREE.Color(0.1, 0.08, 0.04)} metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[-0.23, 0.004, -0.04]} rotation={[0, -0.3, Math.PI / 2]}>
            <coneGeometry args={[0.004, 0.015, 6]} />
            <meshStandardMaterial color={new THREE.Color(0.8, 0.7, 0.1)} metalness={0.9} roughness={0.1} />
          </mesh>
        </group>

        {/* ── WATER GLASSES ── */}
        {[[-0.55, 0.05], [0.55, 0.05]].map(([x, z], i) => (
          <group key={i} position={[x, -0.44, z]}>
            <mesh>
              <cylinderGeometry args={[0.035, 0.028, 0.1, 12, 1, true]} />
              <meshStandardMaterial
                color={new THREE.Color(0.6, 0.75, 0.9)}
                transparent opacity={0.25}
                roughness={0.05} metalness={0.1}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh position={[0, 0.045, 0]}>
              <circleGeometry args={[0.033, 12]} />
              <meshStandardMaterial color={new THREE.Color(0.5, 0.7, 0.85)} transparent opacity={0.7} roughness={0.05} />
            </mesh>
          </group>
        ))}

        {/* ── LUXURY EXECUTIVE ERGONOMIC CHAIRS (MID-BACK, ZERO CLIPPING) ── */}
        {[[-0.55, -0.56, -0.65, 0.12], [0.55, -0.56, -0.65, -0.12]].map(([x, y, z, rotY], i) => (
          <group key={i} position={[x as number, y as number, z as number]} rotation={[0, rotY as number, 0]}>
            {/* Seat Cushion (Plush curved leather) */}
            <mesh castShadow position={[0, 0, 0]}>
              <boxGeometry args={[0.62, 0.07, 0.54]} />
              <primitive object={leatherMat} />
            </mesh>

            {/* Backrest (Pushed back to z = -0.32, mid-back height ending below neck) */}
            <group position={[0, 0.24, -0.32]} rotation={[-0.08, 0, 0]}>
              {/* Main Padded Backrest */}
              <mesh castShadow>
                <boxGeometry args={[0.56, 0.48, 0.05]} />
                <primitive object={leatherMat} />
              </mesh>
              {/* Executive Horizontal Leather Ribs */}
              {[-0.14, 0, 0.14].map((ry, k) => (
                <mesh key={k} position={[0, ry, 0.028]}>
                  <boxGeometry args={[0.52, 0.04, 0.015]} />
                  <primitive object={leatherMat} />
                </mesh>
              ))}
              {/* Gold Top Accent Bar */}
              <mesh position={[0, 0.245, 0]}>
                <boxGeometry args={[0.57, 0.018, 0.055]} />
                <primitive object={goldMat} />
              </mesh>
            </group>

            {/* Continuous Sleek Chrome/Gold Side Arm Loops (Spaced 76cm wide - ZERO CLIPPING) */}
            {[-0.38, 0.38].map((ax, j) => (
              <group key={j} position={[ax, 0.04, -0.05]}>
                {/* Horizontal Armrest Pad */}
                <mesh position={[0, 0.04, 0]}>
                  <boxGeometry args={[0.045, 0.02, 0.32]} />
                  <primitive object={leatherMat} />
                </mesh>
                {/* Support frame */}
                <mesh position={[0, -0.04, 0.1]}>
                  <cylinderGeometry args={[0.008, 0.008, 0.12, 8]} />
                  <primitive object={goldMat} />
                </mesh>
                <mesh position={[0, -0.04, -0.1]}>
                  <cylinderGeometry args={[0.008, 0.008, 0.12, 8]} />
                  <primitive object={goldMat} />
                </mesh>
              </group>
            ))}

            {/* Chair Swivel Column */}
            <mesh position={[0, -0.22, 0]}>
              <cylinderGeometry args={[0.045, 0.045, 0.38, 12]} />
              <meshStandardMaterial color={new THREE.Color(0.15, 0.13, 0.1)} metalness={0.8} roughness={0.2} />
            </mesh>
            {/* 5-Star Executive Base with Gold Ring */}
            <mesh position={[0, -0.38, 0]}>
              <cylinderGeometry args={[0.32, 0.34, 0.04, 16]} />
              <primitive object={darkWood} />
            </mesh>
            <mesh position={[0, -0.36, 0]}>
              <torusGeometry args={[0.28, 0.01, 8, 32]} />
              <primitive object={goldMat} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}
