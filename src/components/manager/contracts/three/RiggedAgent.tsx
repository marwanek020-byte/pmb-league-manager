"use client";

import { useEffect, useRef } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Props {
  modelUrl: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  mood: "HAPPY" | "NEUTRAL" | "FRUSTRATED" | "ANGRY";
  talking?: boolean;
}

export function RiggedAgent({
  modelUrl,
  position,
  rotation = [0, 0, 0],
  scale = 1,
  mood,
  talking = false,
}: Props) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(modelUrl);
  const { actions, names } = useAnimations(animations, group);

  // Play animation if the GLB includes animations (e.g. from Tripo / Mixamo)
  useEffect(() => {
    if (names.length > 0 && actions) {
      // Find idle / talking / sit animation
      const animName = names[0];
      actions[animName]?.reset().fadeIn(0.5).play();
    }
  }, [actions, names]);

  // Procedural breathing and mood tilting in useFrame
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();

    // Natural breathing
    group.current.position.y = position[1] + Math.sin(t * 1.2) * 0.006;

    // Mood rotations
    if (mood === "ANGRY") {
      group.current.rotation.z = rotation[2] + Math.sin(t * 5) * 0.02;
    } else if (mood === "HAPPY") {
      group.current.rotation.x = rotation[0] + Math.sin(t * 1.5) * 0.015;
    } else if (talking) {
      group.current.rotation.y = rotation[1] + Math.sin(t * 3) * 0.02;
    }
  });

  return (
    <group ref={group} position={position} rotation={rotation} scale={scale}>
      <primitive object={scene} />
    </group>
  );
}

// Preload helper
useGLTF.preload("/models/agent.glb");
