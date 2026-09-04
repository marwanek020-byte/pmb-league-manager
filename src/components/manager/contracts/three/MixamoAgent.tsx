"use client";

import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

interface Props {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  mood: "HAPPY" | "NEUTRAL" | "FRUSTRATED" | "ANGRY";
  phase: "NEGOTIATING" | "ACCEPTED" | "BREAKDOWN";
  talking?: boolean;
}

export function MixamoAgent({
  position = [-0.10, -0.92, -0.42],
  rotation = [0, -0.22, 0],
  scale = 0.0098,
  mood,
  phase,
  talking = false,
}: Props) {
  const group = useRef<THREE.Group>(null);

  const isAccepted = phase === "ACCEPTED";
  const modelUrl = isAccepted
    ? "/models/agent_handshake.glb"
    : "/models/agent_sitting_talking.glb";

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
            // Warm Mediterranean / Moroccan natural skin tone
            mat.color.set("#c88f6b");
            mat.roughness = 0.52;
            mat.metalness = 0.02;
          } else if (name.includes("hair")) {
            // Dark groomed executive hair
            mat.color.set("#1a1512");
            mat.roughness = 0.82;
            mat.metalness = 0.05;
          } else if (name.includes("suit") || name.includes("pants")) {
            // Elegant Midnight Navy wool suit & trousers
            mat.color.set("#151f33");
            mat.roughness = 0.65;
            mat.metalness = 0.1;
          } else if (name.includes("shirt")) {
            // Crisp clean dress shirt
            mat.color.set("#f4f5f8");
            mat.roughness = 0.5;
            mat.metalness = 0.0;
          } else if (name.includes("tie")) {
            // Regal burgundy silk tie
            mat.color.set("#82182b");
            mat.roughness = 0.35;
            mat.metalness = 0.22;
          } else if (name.includes("shoes") || name.includes("belt")) {
            // Polished leather
            mat.color.set("#111111");
            mat.roughness = 0.28;
            mat.metalness = 0.3;
          } else if (name.includes("eyelashes")) {
            mat.color.set("#111111");
            mat.roughness = 0.9;
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
      action.timeScale = 1.1;
    } else if (phase === "BREAKDOWN" || mood === "ANGRY") {
      action.timeScale = 1.4;
    } else if (mood === "FRUSTRATED") {
      action.timeScale = 0.8;
    } else if (talking) {
      action.timeScale = 1.05;
    } else {
      action.timeScale = 0.7;
    }

    return () => {
      mixer.stopAllAction();
    };
  }, [animations, mixer, mood, phase, talking, isAccepted]);

  useFrame((state, delta) => {
    mixer.update(delta);

    if (group.current) {
      const t = state.clock.getElapsedTime();
      group.current.position.y = position[1] + Math.sin(t * 1.3) * 0.004;

      if (mood === "ANGRY" || phase === "BREAKDOWN") {
        group.current.rotation.z = rotation[2] + Math.sin(t * 6) * 0.02;
      } else if (mood === "HAPPY" || isAccepted) {
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

useGLTF.preload("/models/agent_sitting_talking.glb");
useGLTF.preload("/models/agent_handshake.glb");
