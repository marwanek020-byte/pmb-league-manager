"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

interface Props {
  mood: "HAPPY" | "NEUTRAL" | "FRUSTRATED" | "ANGRY";
  talking: boolean;
  photoUrl: string | null;
  position: [number, number, number];
  rotation?: [number, number, number];
  name: string;
  isAgent?: boolean;
}

export function CharacterMesh({
  mood,
  talking,
  photoUrl,
  position,
  rotation = [0, 0, 0],
  name,
  isAgent = false,
}: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Group>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);

  // Mood-based color mapping
  const moodAura = useMemo(() => {
    switch (mood) {
      case "HAPPY":      return new THREE.Color(0.2, 0.82, 0.6);
      case "FRUSTRATED": return new THREE.Color(0.98, 0.57, 0.24);
      case "ANGRY":      return new THREE.Color(0.94, 0.27, 0.27);
      default:           return new THREE.Color(0.83, 0.68, 0.21);
    }
  }, [mood]);

  const suitColor = useMemo(() => {
    if (isAgent) {
      switch (mood) {
        case "ANGRY":      return new THREE.Color(0.12, 0.05, 0.05);
        case "FRUSTRATED": return new THREE.Color(0.1, 0.08, 0.05);
        case "HAPPY":      return new THREE.Color(0.08, 0.12, 0.2);
        default:           return new THREE.Color(0.07, 0.09, 0.18);
      }
    }
    return new THREE.Color(0.05, 0.05, 0.12);
  }, [mood, isAgent]);

  // Animation loop
  useFrame((state) => {
    if (!groupRef.current || !headRef.current) return;
    const t = state.clock.getElapsedTime();

    // Breathing animation
    groupRef.current.position.y = position[1] + Math.sin(t * 0.8) * 0.008;

    // Mood-based head animations
    if (mood === "ANGRY") {
      headRef.current.rotation.z = Math.sin(t * 4) * 0.04;
    } else if (mood === "FRUSTRATED") {
      headRef.current.rotation.y = Math.sin(t * 1.5) * 0.06;
      headRef.current.position.x = Math.sin(t * 1.5) * 0.02;
    } else if (mood === "HAPPY") {
      headRef.current.rotation.z = Math.sin(t * 1.2) * 0.015;
      // Nod
      headRef.current.rotation.x = Math.sin(t * 1.0) * 0.025;
    } else {
      headRef.current.rotation.z = Math.sin(t * 0.5) * 0.008;
    }

    // Talking mouth animation
    if (mouthRef.current) {
      const mouthMat = mouthRef.current.material as THREE.MeshStandardMaterial;
      if (talking) {
        const openAmount = Math.abs(Math.sin(t * 12)) * 0.015 + 0.005;
        mouthRef.current.scale.y = 1 + openAmount * 20;
        mouthRef.current.position.y = -0.055 - openAmount * 0.5;
      } else {
        mouthRef.current.scale.y = mood === "HAPPY" ? 1.8 : mood === "ANGRY" ? 0.5 : 1;
        mouthRef.current.position.y = -0.055;
      }
    }

    // Eye blink
    if (leftEyeRef.current && rightEyeRef.current) {
      const blinkCycle = Math.sin(t * 0.3);
      const blink = blinkCycle > 0.97 ? Math.max(0, 1 - (blinkCycle - 0.97) * 100) : 1;
      leftEyeRef.current.scale.y  = blink * (mood === "ANGRY" ? 0.6 : 1);
      rightEyeRef.current.scale.y = blink * (mood === "ANGRY" ? 0.6 : 1);

      // Eyebrow-like tilt on angry
      if (mood === "ANGRY" || mood === "FRUSTRATED") {
        leftEyeRef.current.position.z  = 0.001;
        rightEyeRef.current.position.z = 0.001;
      }
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* ── BODY / TORSO ── */}
      <mesh ref={bodyRef} position={[0, -0.55, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.7, 12]} />
        <meshStandardMaterial
          color={suitColor}
          roughness={0.7}
          metalness={0.05}
        />
      </mesh>

      {/* ── ARMS RESTING FORWARD ON TABLE ── */}
      {/* Left arm */}
      <group position={[-0.2, -0.42, 0.1]} rotation={[0.6, -0.2, -0.2]}>
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.045, 0.04, 0.35, 8]} />
          <meshStandardMaterial color={suitColor} roughness={0.7} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.34, 0.02]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color={new THREE.Color(0.78, 0.58, 0.42)} roughness={0.6} />
        </mesh>
      </group>

      {/* Right arm */}
      <group position={[0.2, -0.42, 0.1]} rotation={[0.6, 0.2, 0.2]}>
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.045, 0.04, 0.35, 8]} />
          <meshStandardMaterial color={suitColor} roughness={0.7} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.34, 0.02]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color={new THREE.Color(0.78, 0.58, 0.42)} roughness={0.6} />
        </mesh>
      </group>

      {/* Shirt collar */}
      <mesh position={[0, -0.22, 0.14]}>
        <boxGeometry args={[0.12, 0.06, 0.04]} />
        <meshStandardMaterial color={new THREE.Color(0.95, 0.95, 0.92)} roughness={0.9} />
      </mesh>

      {/* Tie (agent only) */}
      {isAgent && (
        <mesh position={[0, -0.35, 0.17]}>
          <boxGeometry args={[0.035, 0.22, 0.01]} />
          <meshStandardMaterial color={new THREE.Color(0.5, 0.05, 0.05)} roughness={0.8} />
        </mesh>
      )}

      {/* ── NECK ── */}
      <mesh position={[0, -0.16, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.12, 10]} />
        <meshStandardMaterial color={new THREE.Color(0.78, 0.58, 0.42)} roughness={0.6} />
      </mesh>

      {/* ── HEAD GROUP ── */}
      <group ref={headRef} position={[0, 0, 0]}>
        {/* Skull */}
        <mesh>
          <sphereGeometry args={[0.16, 16, 16]} />
          <meshStandardMaterial
            color={new THREE.Color(0.78, 0.6, 0.44)}
            roughness={0.55}
            metalness={0.0}
          />
        </mesh>

        {/* Hair */}
        <mesh position={[0, 0.08, -0.02]}>
          <sphereGeometry args={[0.155, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshStandardMaterial
            color={isAgent ? new THREE.Color(0.12, 0.1, 0.08) : new THREE.Color(0.08, 0.06, 0.03)}
            roughness={0.95}
          />
        </mesh>

        {/* LEFT EYE */}
        <group position={[-0.055, 0.02, 0.14]}>
          <mesh>
            <sphereGeometry args={[0.022, 10, 10]} />
            <meshStandardMaterial color={new THREE.Color(0.95, 0.95, 0.95)} roughness={0.1} />
          </mesh>
          <mesh ref={leftEyeRef} position={[0, 0, 0.015]}>
            <sphereGeometry args={[0.013, 8, 8]} />
            <meshStandardMaterial
              color={mood === "ANGRY" ? new THREE.Color(0.3, 0.05, 0.05) : new THREE.Color(0.08, 0.06, 0.04)}
              roughness={0.1}
            />
          </mesh>
        </group>

        {/* RIGHT EYE */}
        <group position={[0.055, 0.02, 0.14]}>
          <mesh>
            <sphereGeometry args={[0.022, 10, 10]} />
            <meshStandardMaterial color={new THREE.Color(0.95, 0.95, 0.95)} roughness={0.1} />
          </mesh>
          <mesh ref={rightEyeRef} position={[0, 0, 0.015]}>
            <sphereGeometry args={[0.013, 8, 8]} />
            <meshStandardMaterial
              color={mood === "ANGRY" ? new THREE.Color(0.3, 0.05, 0.05) : new THREE.Color(0.08, 0.06, 0.04)}
              roughness={0.1}
            />
          </mesh>
        </group>

        {/* Eyebrows */}
        {[-0.055, 0.055].map((x, i) => (
          <mesh
            key={i}
            position={[x, 0.055, 0.14]}
            rotation={[0, 0, mood === "ANGRY" ? (i === 0 ? 0.3 : -0.3) : mood === "FRUSTRATED" ? (i === 0 ? 0.15 : -0.15) : 0]}
          >
            <boxGeometry args={[0.04, 0.008, 0.005]} />
            <meshStandardMaterial color={new THREE.Color(0.1, 0.08, 0.05)} roughness={0.9} />
          </mesh>
        ))}

        {/* NOSE */}
        <mesh position={[0, -0.01, 0.155]}>
          <sphereGeometry args={[0.022, 8, 8]} />
          <meshStandardMaterial color={new THREE.Color(0.72, 0.53, 0.38)} roughness={0.65} />
        </mesh>

        {/* MOUTH */}
        <mesh ref={mouthRef} position={[0, -0.055, 0.145]}>
          <boxGeometry args={[
            0.06,
            mood === "HAPPY" ? 0.012 : mood === "ANGRY" ? 0.006 : 0.008,
            0.005
          ]} />
          <meshStandardMaterial
            color={
              mood === "HAPPY"
                ? new THREE.Color(0.3, 0.1, 0.05)
                : new THREE.Color(0.2, 0.08, 0.04)
            }
            roughness={0.8}
          />
        </mesh>

        {/* Mood aura glow ring */}
        <mesh position={[0, 0, 0]}>
          <ringGeometry args={[0.20, 0.24, 32]} />
          <meshBasicMaterial
            color={moodAura}
            transparent
            opacity={mood === "NEUTRAL" ? 0 : 0.25}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* ── 3D FLOATING CHARACTER IDENTIFIER & PHOTO CARD ── */}
      <Html position={[0, 0.42, 0]} center distanceFactor={5} style={{ pointerEvents: "none" }}>
        <div className="flex flex-col items-center select-none" dir="rtl">
          <div
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] border backdrop-blur-md transition-all duration-300"
            style={{
              background: "rgba(10, 8, 4, 0.92)",
              borderColor:
                mood === "ANGRY"
                  ? "#ef4444"
                  : mood === "HAPPY"
                  ? "#34d399"
                  : mood === "FRUSTRATED"
                  ? "#fb923c"
                  : "#d4af37",
              boxShadow:
                mood === "ANGRY"
                  ? "0 0 20px rgba(239,68,68,0.4)"
                  : mood === "HAPPY"
                  ? "0 0 20px rgba(52,211,153,0.4)"
                  : "0 0 15px rgba(212,175,55,0.25)",
            }}
          >
            {/* Real Photo Avatar */}
            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-pmb-gold/40 flex-shrink-0">
              {photoUrl ? (
                <img src={photoUrl} alt={name} className="w-full h-full object-cover object-top" />
              ) : (
                <div className="w-full h-full bg-gradient-to-b from-pmb-gold/20 to-black/90 flex items-center justify-center text-sm">
                  {isAgent ? "🕴️" : "👤"}
                </div>
              )}
            </div>

            {/* Name and title */}
            <div className="text-right">
              <p className="text-white text-xs font-black truncate max-w-[110px] leading-tight">{name}</p>
              <p className="text-[9px] text-pmb-gold font-bold">{isAgent ? "وكيل أعمال" : "لاعب الفريق"}</p>
            </div>

            {/* Reaction emoji */}
            <span className="text-sm">
              {mood === "HAPPY" ? "😊" : mood === "ANGRY" ? "😠" : mood === "FRUSTRATED" ? "😤" : "🤝"}
            </span>
          </div>
        </div>
      </Html>
    </group>
  );
}
