/** Objetos que comparten varias escenas: nubes, mar, peces, estrellas y chispas de acierto. */
import * as THREE from 'three';

import { frenar, limitar } from './animacion';
import { aro, cilindro, esfera, grupo, malla, silueta, sinSombra, torno, V3 } from './formas';
import { crearAzar, luminoso, material, metal, texturaHalo } from './materiales';

const PI = Math.PI;

/** Nube de bolas blandas. Como está muy lejos, no le afecta la niebla ni da sombra. */
export function nube(padre: THREE.Object3D, pos: V3, escala = 1, color = 0xffffff): THREE.Group {
  const g = grupo(padre, pos, [0, 0, 0], escala);
  const m = material(color, { rugoso: 1, luz: color, fuerzaLuz: 0.75, niebla: false });
  const bolas: [number, number, number, number][] = [
    [0, 0, 0, 1],
    [1.1, -0.1, 0.1, 0.8],
    [-1.1, -0.15, 0, 0.75],
    [0.5, 0.45, -0.1, 0.75],
    [-0.5, 0.35, 0.1, 0.65],
    [1.9, -0.3, 0, 0.5],
    [-1.9, -0.3, 0, 0.45],
  ];
  for (const [x, y, z, r] of bolas)
    malla(g, esfera(r, 16, 12), m, [x, y, z], [0, 0, 0], [1, 0.8, 0.8]);
  return sinSombra(g);
}

/**
 * Mar con olas que se mueven. Es una rejilla plana: en cada fotograma se recalcula la
 * altura de cada punto sumando tres ondas, y también su inclinación para que brille bien.
 */
export class Mar {
  readonly malla: THREE.Mesh;
  private readonly puntos: THREE.BufferAttribute;
  private readonly normales: THREE.BufferAttribute;

  constructor(padre: THREE.Object3D, color: number, ancho = 120, fondo = 90) {
    const geometria = new THREE.PlaneGeometry(ancho, fondo, 96, 72);
    geometria.rotateX(-PI / 2);
    this.puntos = geometria.attributes['position'] as THREE.BufferAttribute;
    this.normales = geometria.attributes['normal'] as THREE.BufferAttribute;
    this.malla = malla(
      padre,
      geometria,
      material(color, { rugoso: 0.16, barniz: 1, barnizRugoso: 0.12 }),
      [0, 0, -fondo / 2 + 14],
    );
    this.malla.castShadow = false;
    this.actualizar(0);
  }

  actualizar(t: number): void {
    const p = this.puntos;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const a = x * 1.1 + z * 0.6 + t * 1.1;
      const b = x * 0.5 - z * 1.4 + t * 0.8;
      const c = x * 2.3 + z * 2.1 - t * 1.6;
      p.setY(i, Math.sin(a) * 0.045 + Math.sin(b) * 0.05 + Math.sin(c) * 0.018);
      // Pendiente de la ola en cada eje (la derivada de las tres ondas)
      const dx = Math.cos(a) * 0.0495 + Math.cos(b) * 0.025 + Math.cos(c) * 0.0414;
      const dz = Math.cos(a) * 0.027 - Math.cos(b) * 0.07 + Math.cos(c) * 0.0378;
      const largo = Math.hypot(dx, 1, dz);
      this.normales.setXYZ(i, -dx / largo, 1 / largo, -dz / largo);
    }
    p.needsUpdate = true;
    this.normales.needsUpdate = true;
  }
}

/** Aro de espuma alrededor de algo que sale del agua. */
export function espuma(
  padre: THREE.Object3D,
  x: number,
  z: number,
  radio: number,
  y = 0.06,
): THREE.Mesh {
  const e = malla(
    padre,
    aro(radio, radio * 0.16),
    material(0xffffff, { rugoso: 0.9, luz: 0xffffff, fuerzaLuz: 0.15 }),
    [x, y, z],
    [PI / 2, 0, 0],
    [1, 1, 0.35],
  );
  e.castShadow = false;
  return e;
}

/** Sardina mirando hacia +X. */
export function pez(
  padre: THREE.Object3D,
  pos: V3 = [0, 0, 0],
  giro: V3 = [0, 0, 0],
  escala = 1,
  color = 0x8fd0ff,
): THREE.Group {
  const g = grupo(padre, pos, giro, escala);
  const m = material(color, { rugoso: 0.22, metal: 0.55, barniz: 0.8 });
  malla(g, esfera(0.2, 20, 14), m, [0, 0, 0], [0, 0, 0], [2, 0.62, 0.45]);
  malla(
    g,
    esfera(0.19, 20, 14),
    material(0xf4fbff, { rugoso: 0.3, metal: 0.3 }),
    [0, -0.03, 0],
    [0, 0, 0],
    [1.9, 0.5, 0.42],
  );
  const cola = silueta(
    (s) => {
      s.moveTo(0, 0);
      s.lineTo(-0.2, 0.16);
      s.quadraticCurveTo(-0.13, 0, -0.2, -0.16);
      s.lineTo(0, 0);
    },
    0.03,
    0.012,
  );
  malla(g, cola, m, [-0.32, 0, -0.015]);
  for (const lado of [1, -1]) {
    malla(
      g,
      esfera(0.045, 10, 8),
      material(0xffffff, { rugoso: 0.15, barniz: 1 }),
      [0.24, 0.03, lado * 0.075],
      [0, 0, 0],
      [1, 1, 0.5],
    );
    malla(
      g,
      esfera(0.024, 8, 6),
      material(0x1d1626, { rugoso: 0.2 }),
      [0.25, 0.03, lado * 0.09],
      [0, 0, 0],
      [1, 1, 0.5],
    );
  }
  return g;
}

/** Cubo metálico con asa. */
export function cubo(padre: THREE.Object3D, pos: V3, escala = 1, color = 0x9fb3c8): THREE.Group {
  const g = grupo(padre, pos, [0, 0, 0], escala);
  const perfil: [number, number][] = [
    [0.2, 0],
    [0.22, 0.02],
    [0.29, 0.5],
    [0.31, 0.52],
    [0.29, 0.54],
    [0.26, 0.5],
    [0.19, 0.06],
    [0.001, 0.05],
  ];
  malla(g, torno(perfil, 28), material(color, { rugoso: 0.35, metal: 0.7, dobleCara: true }));
  malla(g, aro(0.3, 0.014, PI), metal(0x6f7f95), [0, 0.5, 0]);
  return g;
}

/** Estrella de cinco puntas con volumen y luz propia. */
export function estrella(
  padre: THREE.Object3D,
  radio = 0.3,
  color = 0xffd23c,
  fuerza = 1.2,
): THREE.Mesh {
  const geometria = silueta(
    (s) => {
      for (let i = 0; i < 10; i++) {
        const angulo = (i / 10) * PI * 2 + PI / 2;
        const r = i % 2 ? radio * 0.5 : radio;
        if (i === 0) s.moveTo(Math.cos(angulo) * r, Math.sin(angulo) * r);
        else s.lineTo(Math.cos(angulo) * r, Math.sin(angulo) * r);
      }
      s.closePath();
    },
    radio * 0.25,
    radio * 0.12,
  );
  geometria.translate(0, 0, -radio * 0.125);
  const m = malla(
    padre,
    geometria,
    material(color, { rugoso: 0.3, barniz: 0.6, luz: color, fuerzaLuz: fuerza }),
  );
  m.castShadow = false;
  return m;
}

/**
 * Chispas de acierto: estrellitas y bolitas que salen disparadas desde un punto, giran y
 * se encogen hasta desaparecer. Se crean una vez y se reutilizan en cada acierto. No
 * guardan nada: solo necesitan saber cuánto hace que empezó la explosión.
 */
export class Chispas {
  private readonly g: THREE.Group;
  private readonly piezas: { objeto: THREE.Mesh; angulo: number; lejos: number; giro: number }[] =
    [];

  constructor(padre: THREE.Object3D, cuantas = 10, colores = [0xffd23c, 0xffffff, 0xff8fa3]) {
    this.g = grupo(padre);
    this.g.visible = false;
    const azar = crearAzar(5);
    for (let i = 0; i < cuantas; i++) {
      const color = colores[i % colores.length];
      const objeto =
        i % 2
          ? estrella(this.g, 0.07 + azar() * 0.05, color, 1.6)
          : malla(this.g, esfera(0.035 + azar() * 0.03, 8, 6), luminoso(color, 1.6));
      objeto.castShadow = false;
      this.piezas.push({
        objeto,
        angulo: (i / cuantas) * PI * 2 + 0.3,
        lejos: 0.75 + azar() * 0.45,
        giro: azar() * 3,
      });
    }
  }

  /**
   * @param pos centro de la explosión
   * @param desde segundos desde que empezó (si es negativo o ya pasó, no se ve)
   * @param fuerza con más de 1 llegan más lejos (para un PERFECT)
   */
  actualizar(pos: THREE.Vector3, desde: number, fuerza = 1): void {
    const k = limitar(desde / 0.55);
    this.g.visible = desde >= 0 && k < 1;
    if (!this.g.visible) return;
    this.g.position.copy(pos);
    const salida = frenar(k);
    for (const p of this.piezas) {
      const d = p.lejos * 0.7 * fuerza * salida;
      // Suben un poco al principio y caen al final, como confeti
      p.objeto.position.set(
        Math.cos(p.angulo) * d,
        Math.sin(p.angulo) * d + 0.15 * salida - 0.3 * k * k,
        0,
      );
      p.objeto.rotation.z = p.giro + k * 4;
      p.objeto.scale.setScalar(k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85);
    }
  }
}

/** Salpicadura: un aro de espuma que se abre y unas gotas que saltan. */
export class Salpicadura {
  private readonly g: THREE.Group;
  private readonly aroEspuma: THREE.Mesh;
  private readonly gotas: THREE.Mesh[] = [];

  constructor(padre: THREE.Object3D, x: number, z: number, escala = 1) {
    this.g = grupo(padre, [x, 0, z], [0, 0, 0], escala);
    this.g.visible = false;
    this.aroEspuma = espuma(this.g, 0, 0, 0.3);
    const blanco = material(0xe8fbff, { rugoso: 0.2, barniz: 1 });
    for (let i = 0; i < 6; i++) {
      const gota = malla(this.g, esfera(0.05, 8, 6), blanco);
      gota.castShadow = false;
      this.gotas.push(gota);
    }
  }

  /** @param desde segundos desde que algo cayó al agua (si es negativo o ya pasó, no se ve) */
  actualizar(desde: number): void {
    const k = limitar(desde / 0.6);
    this.g.visible = desde >= 0 && k < 1;
    if (!this.g.visible) return;
    this.aroEspuma.scale.set(0.5 + k * 2, 0.5 + k * 2, 0.35);
    this.gotas.forEach((gota, i) => {
      const angulo = (i / this.gotas.length) * PI * 2;
      const d = 0.15 + k * 0.45;
      gota.position.set(
        Math.cos(angulo) * d,
        0.1 + 4 * k * (1 - k) * (0.5 + (i % 2) * 0.25),
        Math.sin(angulo) * d,
      );
      gota.scale.setScalar(1 - k);
    });
  }
}

/** Poste o pilote de madera clavado en el agua, con su aro de espuma. */
export function pilote(
  padre: THREE.Object3D,
  mat: THREE.Material,
  x: number,
  z: number,
  radio: number,
  alto: number,
  y = 0.05,
): THREE.Mesh {
  espuma(padre, x, z, radio * 1.5);
  return malla(padre, cilindro(radio * 0.92, radio, alto, 16), mat, [x, y, z]);
}

/** Halo de luz: un disco difuminado que siempre mira a la cámara (alrededor del sol, de un farol…). */
export function halo(
  padre: THREE.Object3D,
  pos: V3,
  radio: number,
  color: number,
  opacidad = 0.5,
): THREE.Sprite {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texturaHalo(color),
      transparent: true,
      opacity: opacidad,
      depthWrite: false,
      fog: false,
    }),
  );
  s.position.set(...pos);
  s.scale.setScalar(radio * 2);
  padre.add(s);
  return s;
}
