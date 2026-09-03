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

  // Switch to Handshake / Agreement on contract finalized
  const isAccepted = phase === "ACCEPTED";
  const modelUrl = isAccepted
    ? "/models/agent_handshake.glb"
    : "/models/agent_sitting_talking.glb";

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

    // Adjust playback speed based on mood
    if (isAccepted) {
      action.timeScale = 1.1; // Deal finalized
    } else if (phase === "BREAKDOWN" || mood === "ANGRY") {
      action.timeScale = 1.4; // Tense and irritated
    } else if (mood === "FRUSTRATED") {
      action.timeScale = 0.8;
    } else if (talking) {
      action.timeScale = 1.05;
    } else {
      action.timeScale = 0.7; // Calm listening
    }

    return () => {
      mixer.stopAllAction();
    };
  }, [animations, mixer, mood, phase, talking, isAccepted]);

  // Shadows
  useEffect(() => {
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [clone]);

  // Frame update
  useFrame((state, delta) => {
    mixer.update(delta);

    if (group.current) {
      const t = state.clock.getElapsedTime();
      group.current.position.y = position[1] + Math.sin(t * 1.3) * 0.004;

      // Micro head nods or shakes
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
