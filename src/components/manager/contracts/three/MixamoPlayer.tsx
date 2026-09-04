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

  const isAccepted = phase === "ACCEPTED";
  const modelUrl = isAccepted
    ? "/models/player_thumbs_up_2.glb"
    : "/models/player_2.glb";

  const { scene, animations } = useGLTF(modelUrl);

  const clone = useMemo(() => {
    const c = SkeletonUtils.clone(scene);
    c.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (mesh.material) {
          const mat = (mesh.material as THREE.Material).clone() as THREE.MeshStandardMaterial;
          const name = (mesh.name || "").toLowerCase();

          if (name.includes("body")) {
            // Athletic natural skin tone with subtle warmth
            mat.color.set("#cb9272");
            mat.roughness = 0.5;
            mat.metalness = 0.02;
          } else if (name.includes("hair")) {
            // Modern styled dark hair
            mat.color.set("#1c1815");
            mat.roughness = 0.8;
            mat.metalness = 0.05;
          } else if (name.includes("suit")) {
            // Modern Charcoal / Anthracite sports-luxe designer blazer
            mat.color.set("#252830");
            mat.roughness = 0.6;
            mat.metalness = 0.12;
          } else if (name.includes("shirt")) {
            // Crisp clean shirt
            mat.color.set("#eff2f6");
            mat.roughness = 0.55;
            mat.metalness = 0.0;
          } else if (name.includes("pants")) {
            // Tailored dark slim trousers
            mat.color.set("#1a1c21");
            mat.roughness = 0.68;
            mat.metalness = 0.08;
          } else if (name.includes("shoes") || name.includes("belt")) {
            // Designer dark leather shoes
            mat.color.set("#161618");
            mat.roughness = 0.3;
            mat.metalness = 0.25;
          } else if (name.includes("eyelashes")) {
            mat.color.set("#111111");
            mat.roughness = 0.9;
          } else {
            // Fallback
            mat.color.set("#cb9272");
            mat.roughness = 0.55;
            mat.metalness = 0.05;
          }

          mat.needsUpdate = true;
          mesh.material = mat;
        }
      }
    });
    return c;
  }, [scene]);

  const mixer = useMemo(() => new THREE.AnimationMixer(clone), [clone]);

  useEffect(() => {
    if (!animations || animations.length === 0) return;
    const clip = animations[0];
    const action = mixer.clipAction(clip);
    action.reset();
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.play();

    if (isAccepted) {
      action.timeScale = 1.15;
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

useGLTF.preload("/models/player_2.glb");
useGLTF.preload("/models/player_thumbs_up_2.glb");
