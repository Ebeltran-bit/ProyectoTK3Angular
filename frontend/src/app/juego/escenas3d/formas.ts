/**
 * Piezas para construir los modelos 3D por código: cada personaje u objeto es un grupo de
 * formas sencillas (esferas, cajas redondeadas, tubos…) colocadas una a una.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/** Posición, giro (en radianes) o escala en los tres ejes: [x, y, z]. */
export type V3 = [number, number, number];

const PI = Math.PI;

/** Añade una forma con su material a un grupo. Por defecto da y recibe sombra. */
export function malla(
  padre: THREE.Object3D,
  geometria: THREE.BufferGeometry,
  mat: THREE.Material,
  pos: V3 = [0, 0, 0],
  giro: V3 = [0, 0, 0],
  escala: number | V3 = 1,
): THREE.Mesh {
  const m = new THREE.Mesh(geometria, mat);
  m.position.set(...pos);
  m.rotation.set(...giro);
  if (typeof escala === 'number') m.scale.setScalar(escala);
  else m.scale.set(...escala);
  m.castShadow = true;
  m.receiveShadow = true;
  padre.add(m);
  return m;
}

/** Grupo vacío: sirve de articulación, porque al moverlo o girarlo se mueve todo lo que cuelga de él. */
export function grupo(
  padre: THREE.Object3D,
  pos: V3 = [0, 0, 0],
  giro: V3 = [0, 0, 0],
  escala: number | V3 = 1,
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(...pos);
  g.rotation.set(...giro);
  if (typeof escala === 'number') g.scale.setScalar(escala);
  else g.scale.set(...escala);
  padre.add(g);
  return g;
}

/** Marca un objeto y todo lo que cuelga de él para que no proyecte sombra. */
export function sinSombra<T extends THREE.Object3D>(objeto: T): T {
  objeto.traverse((o) => {
    o.castShadow = false;
    o.receiveShadow = false;
  });
  return objeto;
}

export const esfera = (radio = 1, gajos = 28, anillos = 20) =>
  new THREE.SphereGeometry(radio, gajos, anillos);
/** Casquete: la parte de arriba de una esfera, hasta `abertura` (0,5 = media esfera). */
export const casquete = (radio: number, abertura = 0.5, gajos = 28, anillos = 12) =>
  new THREE.SphereGeometry(radio, gajos, anillos, 0, PI * 2, 0, PI * abertura);
export const caja = (ancho: number, alto: number, fondo: number, canto = 0.03) =>
  new RoundedBoxGeometry(
    ancho,
    alto,
    fondo,
    3,
    Math.min(canto, ancho / 2.01, alto / 2.01, fondo / 2.01),
  );
export const cilindro = (radioArriba: number, radioAbajo: number, alto: number, lados = 24) =>
  new THREE.CylinderGeometry(radioArriba, radioAbajo, alto, lados);
export const capsula = (radio: number, largo: number, lados = 16) =>
  new THREE.CapsuleGeometry(radio, largo, 8, lados);
export const aro = (radio: number, grosor: number, arcoTotal = PI * 2) =>
  new THREE.TorusGeometry(radio, grosor, 10, 36, arcoTotal);
export const cono = (radio: number, alto: number, lados = 24) =>
  new THREE.ConeGeometry(radio, alto, lados);

/** Pieza torneada (jarrón, tronco, faro): un perfil [radio, altura] que gira sobre el eje vertical. */
export function torno(perfil: [number, number][], lados = 32): THREE.LatheGeometry {
  const curva = new THREE.SplineCurve(perfil.map(([r, y]) => new THREE.Vector2(r, y)));
  return new THREE.LatheGeometry(curva.getPoints(perfil.length * 5), lados);
}

/** Silueta plana con grosor y canto redondeado (aletas, estrellas, bocas). */
export function silueta(
  dibujar: (s: THREE.Shape) => void,
  grosor = 0.05,
  canto = 0.01,
): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  dibujar(s);
  return new THREE.ExtrudeGeometry(s, {
    depth: grosor,
    bevelEnabled: canto > 0,
    bevelSize: canto,
    bevelThickness: canto,
    bevelSegments: 2,
    curveSegments: 16,
  });
}

/** Cambia la forma de una geometría moviendo cada vértice con una función. */
export function deformar<T extends THREE.BufferGeometry>(
  geometria: T,
  mover: (v: THREE.Vector3) => void,
): T {
  const p = geometria.attributes['position'];
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    mover(v);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geometria.computeVertexNormals();
  return geometria;
}

/**
 * Tubo que se puede recolocar en cada fotograma: brazos, alas, cuerdas.
 * Va del punto `a` al punto `b` curvándose hacia `control` (una curva de Bézier), y su
 * grosor en cada tramo lo da la función `radio`. Para que animarlo no cueste nada, los
 * vértices se crean una sola vez y `colocar` solo cambia sus números.
 */
export class TuboFlexible {
  readonly geometria = new THREE.BufferGeometry();
  private readonly posiciones: Float32Array;
  private readonly normales: Float32Array;
  private ultimo = '';

  /**
   * @param radio grosor del tubo según el avance t (0 en `a`, 1 en `b`)
   * @param aplastado menos de 1 lo deja plano, como una hoja o un ala
   */
  constructor(
    private readonly radio: (t: number) => number,
    private readonly tramos = 12,
    private readonly lados = 12,
    private readonly aplastado = 1,
  ) {
    const vertices = (tramos + 1) * (lados + 1);
    this.posiciones = new Float32Array(vertices * 3);
    this.normales = new Float32Array(vertices * 3);
    const indices: number[] = [];
    for (let i = 0; i < tramos; i++)
      for (let j = 0; j < lados; j++) {
        const p = i * (lados + 1) + j;
        const q = p + lados + 1;
        indices.push(p, p + 1, q, q, p + 1, q + 1);
      }
    this.geometria.setAttribute('position', new THREE.BufferAttribute(this.posiciones, 3));
    this.geometria.setAttribute('normal', new THREE.BufferAttribute(this.normales, 3));
    this.geometria.setIndex(indices);
  }

  /** Recoloca el tubo. Si los tres puntos no han cambiado, no hace nada. */
  colocar(a: V3, control: V3, b: V3): void {
    const clave = `${a}|${control}|${b}`;
    if (clave === this.ultimo) return;
    this.ultimo = clave;
    // La curva está en un plano: su perpendicular (n) sirve de referencia fija para
    // repartir los vértices alrededor del tubo sin que se retuerza
    let [nx, ny, nz] = cruz(
      control[0] - a[0],
      control[1] - a[1],
      control[2] - a[2],
      b[0] - control[0],
      b[1] - control[1],
      b[2] - control[2],
    );
    if (Math.hypot(nx, ny, nz) < 1e-6) {
      // Tubo recto: vale cualquier perpendicular a su dirección
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const dz = b[2] - a[2];
      [nx, ny, nz] =
        Math.abs(dy) > Math.abs(dx) ? cruz(dx, dy, dz, 1, 0, 0) : cruz(dx, dy, dz, 0, 1, 0);
    }
    const largoN = Math.hypot(nx, ny, nz) || 1;
    nx /= largoN;
    ny /= largoN;
    nz /= largoN;
    let k = 0;
    for (let i = 0; i <= this.tramos; i++) {
      const t = i / this.tramos;
      const u = 1 - t;
      // Punto de la curva y dirección en la que avanza
      const px = u * u * a[0] + 2 * u * t * control[0] + t * t * b[0];
      const py = u * u * a[1] + 2 * u * t * control[1] + t * t * b[1];
      const pz = u * u * a[2] + 2 * u * t * control[2] + t * t * b[2];
      let tx = u * (control[0] - a[0]) + t * (b[0] - control[0]);
      let ty = u * (control[1] - a[1]) + t * (b[1] - control[1]);
      let tz = u * (control[2] - a[2]) + t * (b[2] - control[2]);
      const largoT = Math.hypot(tx, ty, tz) || 1;
      tx /= largoT;
      ty /= largoT;
      tz /= largoT;
      // Segunda perpendicular, para tener los dos ejes del círculo
      const [mx, my, mz] = cruz(tx, ty, tz, nx, ny, nz);
      const r = this.radio(t);
      for (let j = 0; j <= this.lados; j++) {
        const angulo = (j / this.lados) * PI * 2;
        const c = Math.cos(angulo);
        const s = Math.sin(angulo);
        const plano = this.aplastado;
        this.posiciones[k] = px + (nx * c * plano + mx * s) * r;
        this.posiciones[k + 1] = py + (ny * c * plano + my * s) * r;
        this.posiciones[k + 2] = pz + (nz * c * plano + mz * s) * r;
        // La normal dice hacia dónde mira la superficie; hace falta para iluminarla.
        // En un tubo aplastado se reparte al revés que la posición
        const ax = nx * c + mx * s * plano;
        const ay = ny * c + my * s * plano;
        const az = nz * c + mz * s * plano;
        const largo = Math.hypot(ax, ay, az) || 1;
        this.normales[k] = ax / largo;
        this.normales[k + 1] = ay / largo;
        this.normales[k + 2] = az / largo;
        k += 3;
      }
    }
    this.geometria.attributes['position'].needsUpdate = true;
    this.geometria.attributes['normal'].needsUpdate = true;
    this.geometria.computeBoundingSphere();
  }
}

/** Producto vectorial: da un vector perpendicular a los otros dos. */
function cruz(ax: number, ay: number, az: number, bx: number, by: number, bz: number): V3 {
  return [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx];
}
