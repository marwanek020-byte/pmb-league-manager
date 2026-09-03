"use client";

import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

interface Props {
  playerIndex?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  reaction?: "idle" | "thinking" | "pleased" | "worried";
  phase?: "NEGOTIATING" | "ACCEPTED" | "BREAKDOWN";
}

export function MixamoPlayer({
  playerIndex = 0,
  position = [-1.20, -0.92, -0.42],
  rotation = [0, 0.22, 0],
  scale = 0.0098,
  reaction = "idle",
  phase = "NEGOTIATING",
}: Props) {
  const group = useRef<THREE.Group>(null);

  // Model index (1: Lewis, 2: Josh)
  const modelNum = (Math.abs(playerIndex) % 2) + 1;

  // 🎯 CRITICAL USER RULE:
  // "Thumbs Up" (👍) ONLY activates when agreement is reached and contract is signed (phase === "ACCEPTED")!
  // During normal negotiations, players remain seated naturally listening and breathing.
  const isAccepted = phase === "ACCEPTED";
  const modelUrl = isAccepted
    ? `/models/player_thumbs_up_${modelNum}.glb`
    : `/models/player_${modelNum}.glb`;

  const { scene, animations } = useGLTF(modelUrl);
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const mixer = useMemo(() => new THREE.AnimationMixer(clone), [clone]);

  useEffect(() => {
    if (!animations || animations.length === 0) return;
    const clip = animations[0];
    const action = mixer.clipAction(clip);
    action.reset();
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.play();

    if (isAccepted) {
      action.timeScale = 1.15; // Celebration thumbs up!
    } else if (reaction === "thinking") {
      action.timeScale = 0.75;
    } else if (reaction === "worried") {
      action.timeScale = 0.85;
    } else {
      action.timeScale = 0.95;
    }

    return () => {
      mixer.stopAllAction();
    };
  }, [animations, mixer, isAccepted, reaction]);

  // Ensure shadows & materials
  useEffect(() => {
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [clone]);

  // Update mixer every frame
  useFrame((state, delta) => {
    mixer.update(delta);

    if (group.current) {
      const t = state.clock.getElapsedTime();
      group.current.position.y = position[1] + Math.sin(t * 1.1) * 0.004;

      if (isAccepted) {
        group.current.rotation.x = rotation[0] + Math.sin(t * 2) * 0.015;
      }
    }
  });

  return (
    <group ref={group} position={position} rotation={rotation} scale={scale}>
      <primitive object={clone} dispose={null} />
    </group>
  );
}

useGLTF.preload("/models/player_1.glb");
useGLTF.preload("/models/player_2.glb");
useGLTF.preload("/models/player_thumbs_up_1.glb");
useGLTF.preload("/models/player_thumbs_up_2.glb");
