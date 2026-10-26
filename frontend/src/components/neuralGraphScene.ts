/**
 * Simple Domain — Construcción de la escena neuronal 3D del pipeline (Three.js)
 * Neuronas principales (etapas) con halo, dendritas satélite y axones curvos entre etapas.
 */

import * as THREE from 'three';

export interface Stage { name: string; desc: string; color: number; r: number }

const canvasTexture = (w: number, h: number, paint: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  paint(c.getContext('2d')!);
  return new THREE.CanvasTexture(c);
};

const makeLabel = (text: string) => {
  const tex = canvasTexture(512, 96, (g) => {
    g.font = 'bold 40px monospace'; g.textAlign = 'center'; g.fillStyle = '#e2e8f0';
    g.shadowColor = '#000'; g.shadowBlur = 8; g.fillText(text, 256, 60);
  });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sp.scale.set(4, 0.75, 1);
  return sp;
};

export function buildNeuralScene(scene: THREE.Scene, stages: Stage[]) {
  const n = stages.length;
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const jitter = (k: number) => new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(k);
  const glow = canvasTexture(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });

  const halo = (color: number, size: number) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    sp.scale.setScalar(size);
    return sp;
  };
  const addCurve = (a: THREE.Vector3, b: THREE.Vector3, bend: number, color: number, opacity: number, pts: number) => {
    const curve = new THREE.QuadraticBezierCurve3(a, a.clone().lerp(b, 0.5).add(jitter(bend)), b);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(pts)), mat));
    return curve;
  };

  const nodes = stages.map((s, i) => {
    const mat = new THREE.MeshStandardMaterial({ color: s.color, emissive: s.color, emissiveIntensity: 0.3, roughness: 0.3, metalness: 0.4 });
    const m = new THREE.Mesh(new THREE.SphereGeometry(s.r, 32, 32), mat);
    m.position.set((i - (n - 1) / 2) * 2.4, Math.sin(i * 0.9) * 2.6, Math.cos(i * 0.9) * 3.2);
    const label = makeLabel(`${i + 1}. ${s.name}`);
    label.position.set(0, s.r + 0.8, 0);
    m.add(halo(s.color, s.r * 6), label);
    scene.add(m);
    // Dendritas: neuronas satélite unidas por sinapsis tenues
    for (let k = 0; k < 7; k++) {
      const p = jitter(1).normalize().multiplyScalar(1.6 + rnd() * 1.4).add(m.position);
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.08 + rnd() * 0.1, 10, 10), new THREE.MeshBasicMaterial({ color: s.color }));
      d.position.copy(p);
      d.add(halo(s.color, 0.9));
      scene.add(d);
      addCurve(m.position, p, 0.9, s.color, 0.3, 12);
    }
    return m;
  });

  // Axones: conexión principal entre etapas consecutivas (recorrida por el impulso)
  const curves = nodes.slice(1).map((m, i) => addCurve(nodes[i].position, m.position, 3, 0x00f0ff, 0.9, 32));
  // Conexiones laterales tenues que dan la apariencia de red neuronal
  for (let i = 0; i < n - 2; i++) addCurve(nodes[i].position, nodes[i + 2].position, 4, 0x9d4edd, 0.22, 24);

  return { nodes, curves, halo };
}
