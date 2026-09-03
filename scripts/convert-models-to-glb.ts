class MockImage {
  addEventListener(event: string, cb: () => void) {
    if (event === "load") setImmediate(cb);
  }
  removeEventListener() {}
  src = "";
}

class MockFileReader {
  result: any = null;
  onloadend: (() => void) | null = null;
  async readAsArrayBuffer(blob: any) {
    this.result = await blob.arrayBuffer();
    if (this.onloadend) this.onloadend();
  }
}

(global as any).window = global;
(global as any).self = global;
(global as any).HTMLImageElement = MockImage;
(global as any).Image = MockImage;
(global as any).FileReader = MockFileReader;
(global as any).document = {
  createElementNS: (_ns: string, tag: string) => {
    if (tag === "img") return new MockImage();
    return {
      getContext: () => null,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  },
  createElement: (tag: string) => {
    if (tag === "img") return new MockImage();
    return {
      getContext: () => null,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  },
};

import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import fs from "fs";
import path from "path";

const MODELS = [
  "agent_sitting_talking",
  "agent_handshake",
  "player_1",
  "player_2",
  "player_thumbs_up_1",
  "player_thumbs_up_2",
];

async function convertFile(name: string) {
  const src = path.join("public/models", `${name}.fbx`);
  const dest = path.join("public/models", `${name}.glb`);

  if (!fs.existsSync(src)) {
    console.log(`Skipping ${name}: source file not found`);
    return;
  }

  console.log(`Converting ${name}.fbx ...`);
  const buffer = fs.readFileSync(src);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const loader = new FBXLoader();

  const fbx = loader.parse(arrayBuffer, "");

  fbx.traverse((child: any) => {
    if (child.isMesh && child.material) {
      const origColor = child.material.color ? child.material.color.clone() : new THREE.Color(0x888888);
      child.material = new THREE.MeshStandardMaterial({
        color: origColor,
        roughness: 0.5,
        metalness: 0.1,
      });
    }
  });

  const exporter = new GLTFExporter();
  await new Promise<void>((resolve, reject) => {
    exporter.parse(
      fbx,
      (gltf) => {
        const glbBuffer = Buffer.from(gltf as ArrayBuffer);
        fs.writeFileSync(dest, glbBuffer);
        console.log(`✅ Finished ${name}.glb: ${(glbBuffer.length / (1024 * 1024)).toFixed(2)} MB`);
        resolve();
      },
      (err) => {
        console.error(`❌ Error exporting ${name}:`, err);
        reject(err);
      },
      { binary: true, animations: fbx.animations }
    );
  });
}

async function main() {
  for (const model of MODELS) {
    try {
      await convertFile(model);
    } catch (e) {
      console.error(`Failed ${model}:`, e);
    }
  }
  console.log("All models converted successfully!");
}

main();
