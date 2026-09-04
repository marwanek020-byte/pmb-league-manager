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

  // Model 2 has separated sub-meshes (Body, Hair, Suit, Shirt, Pants, Shoes)
  // which allows rich, realistic PBR materials, skin tones, and clothing.
  const isAccepted = phase === "ACCEPTED";
  const modelUrl = isAccepted
    ? "/models/player_thumbs_up_2.glb"
    : "/models/player_2.glb";

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

  // Apply rich PBR materials, athletic skin tones, stylish clothing
  useEffect(() => {
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const name = (mesh.name || "").toLowerCase();

        if (name.includes("body")) {
          // Athletic natural skin tone with subtle warmth
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color("#cb9272"),
            roughness: 0.5,
            metalness: 0.02,
          });
        } else if (name.includes("hair")) {
          // Modern styled dark hair
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color("#1c1815"),
            roughness: 0.8,
            metalness: 0.05,
          });
        } else if (name.includes("suit")) {
          // Modern Charcoal / Anthracite sports-luxe designer blazer
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color("#252830"),
            roughness: 0.6,
            metalness: 0.12,
          });
        } else if (name.includes("shirt")) {
          // Crisp clean shirt
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color("#eff2f6"),
            roughness: 0.55,
            metalness: 0.0,
          });
        } else if (name.includes("pants")) {
          // Tailored dark slim trousers
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color("#1a1c21"),
            roughness: 0.68,
            metalness: 0.08,
          });
        } else if (name.includes("shoes")) {
          // Designer dark leather shoes
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color("#161618"),
            roughness: 0.3,
            metalness: 0.25,
          });
        } else if (name.includes("belt")) {
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color("#141414"),
            roughness: 0.35,
            metalness: 0.2,
          });
        } else if (name.includes("eyelashes")) {
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color("#111111"),
            roughness: 0.9,
          });
        } else {
          // Fallback if single mesh or unknown part
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color("#cb9272"),
            roughness: 0.55,
            metalness: 0.05,
          });
        }
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

useGLTF.preload("/models/player_2.glb");
useGLTF.preload("/models/player_thumbs_up_2.glb");
