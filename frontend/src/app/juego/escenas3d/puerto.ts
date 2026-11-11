/**
 * Escena 1 en 3D: Puerto de las gaviotas (propuesta aprobada por Eva el 11/11/2026).
 * Se juega igual que la versión plana: una gaviota grazna, vuela hacia el poste y se posa
 * un pulso después; justo entonces el pescador le lanza una sardina.
 *
 * Cada movimiento tiene los tres tiempos de la animación clásica:
 * anticipación (el pescador lleva el brazo atrás mientras la gaviota llega),
 * acción (el lanzamiento) y reacción (la gaviota atrapa la sardina o se ofende).
 */
import * as THREE from 'three';

import { VistaEscena } from '../escenarios/tipos';
import { acercar, arco, frenar, golpe, limitar, mezclar, rebote, suave, tramo } from './animacion';
import {
  aro,
  caja,
  capsula,
  casquete,
  cilindro,
  cono,
  deformar,
  esfera,
  grupo,
  malla,
  sinSombra,
  torno,
  TuboFlexible,
  V3,
} from './formas';
import { latido, notaAcertada, ultimaJuzgada } from './golpes';
import {
  luminoso,
  material,
  plastico,
  tela,
  texturaMadera,
  texturaRayas,
  texturaRuido,
} from './materiales';
import { Chispas, cubo, espuma, halo, Mar, nube, pez, pilote, Salpicadura } from './objetos';
import { Personaje } from './personaje';
import { Motor } from './motor';
import { Definicion3d, Escena3d } from './tipos';

const PI = Math.PI;

/** Pulsos antes de su nota en los que la gaviota aparece volando. */
const LLEGADA = 1.6;
/** Pulsos que la gaviota sigue en escena después de su nota. */
const SALIDA = 1.5;
/** Pulsos que espera posada antes de irse con la sardina. */
const ESPERA = 0.35;
/** Segundos que tarda la sardina en llegar de la mano al pico. */
const VUELO_SARDINA = 0.18;
/** Si nadie la atrapa, segundos que tarda en caer al agua, y dónde cae. */
const CAIDA_SARDINA = 0.45;
const AGUA: V3 = [4.6, 0, -6];
/** Altura a la que queda el suelo del muelle. */
const ALTURA_MUELLE = 1.11;
const ESCALA_GAVIOTA = 1.3;
const ESCALA_PESCADOR = 1.38;
/** Giro del pescador: mira hacia el poste y un poco hacia la cámara. */
const GIRO_PESCADOR = 0.8;

// Puntos clave del vuelo de la gaviota
const POSTE: V3 = [3.3, 2.27, 0.3];
const VIENE_DE: V3 = [8, 6.6, -7];
const SE_VA_A: V3 = [7, 7.4, -9];
const HUYE_A: V3 = [-6.5, 5.6, -12];
/** Giro con el que queda posada: mira hacia el pescador y un poco hacia la cámara. */
const GIRO_POSADA = PI + 0.7;

/** Gaviota articulada: alas que baten y se pliegan, pico que se abre y cejas de enfado. */
class Gaviota {
  readonly g: THREE.Group;
  /** Punta del pico: ahí llega la sardina. */
  readonly pico: THREE.Group;
  private readonly cabeza: THREE.Group;
  private readonly picoAbajo: THREE.Mesh;
  private readonly sardina: THREE.Group;
  private readonly cejas: THREE.Mesh[] = [];
  private readonly alas: { pliegue: THREE.Group; batir: THREE.Group }[] = [];
  private readonly patas: THREE.Group;

  constructor(padre: THREE.Object3D, escala: number) {
    this.g = grupo(padre, [0, 0, 0], [0, 0, 0], escala);
    const blanco = material(0xffffff, { rugoso: 0.6, pelusa: 0.6 });
    const gris = material(0xa9b8cc, { rugoso: 0.7, pelusa: 0.5 });
    const oscuro = material(0x4a4458, { rugoso: 0.7 });
    const naranja = plastico(0xff9a2e);

    // Cuerpo en forma de gota, con el pecho por delante (mira hacia +X), y cola
    const cuerpo = deformar(esfera(0.25, 24, 18), (v) => {
      const t = v.x / 0.25;
      const fino = t < 0 ? 1 + t * 0.45 : 1;
      v.x *= 1.45;
      v.y = v.y * 0.95 * fino + (t < 0 ? -t * 0.06 : 0);
      v.z *= 0.92 * fino;
    });
    malla(this.g, cuerpo, blanco, [0, 0.36, 0], [0, 0, 0.12]);
    malla(this.g, esfera(0.08, 12, 10), gris, [-0.42, 0.35, 0], [0, 0, 0.1], [1.6, 0.35, 1.3]);

    this.cabeza = grupo(this.g, [0.27, 0.66, 0]);
    malla(this.cabeza, esfera(0.19, 20, 16), blanco);
    // El cono del pico tiene la punta hacia arriba: se tumba y se cuelga de una bisagra en su base
    const picoArriba = grupo(this.cabeza, [0.15, 0, 0], [0, 0, 0.12]);
    malla(picoArriba, cono(0.065, 0.24, 14), naranja, [0.12, 0, 0], [0, 0, -PI / 2]);
    this.picoAbajo = malla(
      this.cabeza,
      cono(0.05, 0.19, 14).translate(0, 0.095, 0),
      naranja,
      [0.15, -0.04, 0],
      [0, 0, -PI / 2],
    );
    this.pico = grupo(this.cabeza, [0.34, -0.03, 0]);
    // Sardina que se lleva en el pico, colgando
    this.sardina = pez(this.pico, [0.03, -0.24, 0], [0, 0, -PI / 2], 0.62);
    for (const lado of [1, -1]) {
      malla(
        this.cabeza,
        esfera(0.058, 12, 10),
        material(0xffffff, { rugoso: 0.15, barniz: 1 }),
        [0.115, 0.055, lado * 0.125],
        [0, lado * -0.5, 0],
        [0.6, 1.1, 1],
      );
      malla(
        this.cabeza,
        esfera(0.034, 10, 8),
        material(0x1d1626, { rugoso: 0.2, barniz: 1 }),
        [0.145, 0.055, lado * 0.145],
        [0, lado * -0.5, 0],
        [0.6, 1.1, 1],
      );
      this.cejas.push(
        malla(
          this.cabeza,
          capsula(0.012, 0.09, 6),
          oscuro,
          [0.15, 0.125, lado * 0.12],
          [lado * 0.5 + PI / 2, 0, lado * -0.45],
        ),
      );
    }

    // Alas: una hoja plana gris con la punta oscura. Cuelgan de dos bisagras: una las
    // sube y las baja (batir) y otra las recoge hacia la cola (pliegue)
    for (const lado of [1, -1]) {
      const pliegue = grupo(this.g, [0, 0.47, lado * 0.13]);
      const batir = grupo(pliegue);
      const perfil = (t: number) => 0.03 + 0.19 * Math.sin(PI * (0.14 + 0.86 * t)) ** 0.7;
      const hoja = new TuboFlexible(perfil, 10, 10, 0.2);
      const raiz: V3 = [0, 0, 0];
      const control: V3 = [-0.02, 0, lado * 0.42];
      const punta: V3 = [-0.16, 0, lado * 0.8];
      hoja.colocar(raiz, control, punta);
      malla(batir, hoja.geometria, gris);
      // La punta oscura es el último tercio de la misma curva, un pelín más gruesa
      const tercio: V3 = [-0.067, 0, lado * 0.58];
      const puntaOscura = new TuboFlexible((t) => perfil(0.7 + 0.3 * t) + 0.008, 5, 10, 0.26);
      puntaOscura.colocar(tercio, [-0.105, 0, lado * 0.69], punta);
      malla(batir, puntaOscura.geometria, oscuro);
      this.alas.push({ pliegue, batir });
    }

    this.patas = grupo(this.g);
    for (const lado of [1, -1]) {
      malla(this.patas, cilindro(0.018, 0.018, 0.2, 8), naranja, [0.02, 0.1, lado * 0.08]);
      malla(
        this.patas,
        esfera(0.06, 10, 8),
        naranja,
        [0.06, 0.012, lado * 0.08],
        [0, 0, 0],
        [1.3, 0.25, 1],
      );
    }
  }

  /**
   * @param altura ángulo de las alas: positivo arriba, negativo abajo
   * @param plegadas de 0 (abiertas) a 1 (recogidas junto al cuerpo)
   */
  moverAlas(altura: number, plegadas: number): void {
    this.alas.forEach(({ pliegue, batir }, i) => {
      const lado = i === 0 ? 1 : -1;
      batir.rotation.x = -lado * mezclar(altura, 0, plegadas);
      // Plegada: se recoge hacia la cola y se pone de canto, pegada al costado
      pliegue.rotation.y = -lado * 1.35 * plegadas;
      batir.rotation.z = lado * 1.25 * plegadas;
      pliegue.position.y = 0.47 - 0.08 * plegadas;
      pliegue.scale.setScalar(1 - 0.32 * plegadas);
    });
  }

  /** @param abierto de 0 a 1 */
  abrirPico(abierto: number): void {
    this.picoAbajo.rotation.z = -PI / 2 - 0.55 * abierto;
  }

  /** Giro de la cabeza: `lado` la vuelve hacia un lado y `arriba` la levanta. */
  girarCabeza(lado: number, arriba: number): void {
    this.cabeza.rotation.set(0, lado, arriba);
  }

  estado(conSardina: boolean, enfadada: boolean, volando: boolean): void {
    this.sardina.visible = conSardina;
    for (const ceja of this.cejas) ceja.visible = enfadada;
    // En vuelo recoge las patas
    this.patas.scale.y = volando ? 0.4 : 1;
    this.patas.position.y = volando ? 0.12 : 0;
  }
}

class Puerto implements Escena3d {
  readonly palabra: Escena3d['palabra'];
  private readonly mar: Mar;
  private readonly barca: THREE.Group;
  private readonly boyas: THREE.Group[] = [];
  private readonly nubes: THREE.Group[] = [];
  private readonly linterna: THREE.MeshStandardMaterial;
  private readonly pescador: Personaje;
  private readonly sardinaEnMano: THREE.Group;
  private readonly sardinaEnVuelo: THREE.Group;
  /** Cuatro gaviotas que se van turnando: nunca hay más de cuatro notas a la vista. */
  private readonly gaviotas: Gaviota[] = [];
  private readonly lejanas: Gaviota[] = [];
  private readonly chispas: Chispas;
  private readonly salpicadura: Salpicadura;
  /** Desde dónde sale la sardina y adónde llega, en coordenadas de la escena. */
  private readonly salidaSardina = new THREE.Vector3();
  private readonly llegadaSardina = new THREE.Vector3();
  /** Cuánto tiene el pescador el brazo preparado (0 a 1); cambia poco a poco. */
  private prepara = 0;
  // Vectores de trabajo: se reutilizan para no crear objetos nuevos en cada fotograma
  private readonly objetivo = new THREE.Vector3();
  private readonly cabezaMundo = new THREE.Vector3();

  constructor(motor: Motor) {
    const S = motor.escena;
    this.mar = new Mar(S, 0x27b3c6);
    this.palabra = { ...motor.proyectar([3.85, 2.15, 0.3]), aciertos: ['¡Ñam!', '¡Hop!', '¡Zas!'] };

    // Sol bajo, con su halo
    const sol = malla(
      S,
      esfera(3.4, 24, 16),
      material(0xffe9a0, { luz: 0xffe9a0, fuerzaLuz: 3, niebla: false }),
      [3.5, 4.2, -70],
    );
    sinSombra(sol);
    halo(S, [3.5, 4.2, -69], 11, 0xfff0c0, 0.55);

    this.nubes.push(
      nube(S, [-14, 10.5, -40], 2.6),
      nube(S, [7, 12.5, -45], 3.2),
      nube(S, [1, 8, -55], 1.8, 0xfff4e0),
      nube(S, [19, 9.5, -42], 2.2, 0xfff4e0),
    );

    // Islote con el faro
    const isla = grupo(S, [5.2, 0, -24]);
    malla(
      isla,
      esfera(3, 24, 14),
      material(0x8f8aa0, { rugoso: 0.95, textura: texturaRuido(0x8f8aa0, 0.25, [3, 2]) }),
      [0, -0.9, 0],
      [0, 0, 0],
      [1.5, 0.6, 1],
    );
    malla(
      isla,
      esfera(1.6, 20, 12),
      material(0x6fbf73, { rugoso: 0.95 }),
      [-0.6, 0.55, 0.2],
      [0, 0, 0],
      [1.6, 0.35, 1],
    );
    const rayas = texturaRayas(0xff6b6b, 0xffffff, 6);
    rayas.rotation = PI / 2;
    malla(
      isla,
      torno(
        [
          [0.9, 0],
          [0.82, 0.3],
          [0.6, 3.6],
          [0.72, 3.7],
          [0.72, 3.85],
          [0.001, 3.85],
        ],
        28,
      ),
      material(0xffffff, { rugoso: 0.6, textura: rayas }),
      [0.4, 0.7, 0],
    );
    this.linterna = luminoso(0xfff2b0, 2.4);
    malla(isla, cilindro(0.5, 0.5, 0.7, 20), this.linterna, [0.4, 4.9, 0]);
    malla(isla, cono(0.75, 0.7, 20), plastico(0xff6b6b), [0.4, 5.6, 0]);

    // Barca al fondo
    this.barca = grupo(S, [0.6, 0.05, -10], [0, 0.35, 0.03]);
    const crema = material(0xfff3dc, { rugoso: 0.7 });
    malla(
      this.barca,
      esfera(1, 24, 14),
      plastico(0xff8f5a),
      [0, 0.1, 0],
      [0, 0, 0],
      [1.9, 0.5, 0.75],
    );
    malla(this.barca, caja(3.3, 0.14, 1.25, 0.06), crema, [0, 0.42, 0]);
    malla(this.barca, caja(0.9, 0.7, 0.8, 0.1), crema, [-0.5, 0.85, 0]);
    malla(this.barca, caja(1.1, 0.12, 1, 0.05), plastico(0x4f9fd8), [-0.5, 1.25, 0]);
    malla(this.barca, cilindro(0.04, 0.04, 2, 8), material(0x8a5a3a), [0.7, 1.4, 0]);
    malla(
      this.barca,
      new THREE.ConeGeometry(0.5, 0.5, 3),
      tela(0xffc93c),
      [1, 2.1, 0],
      [0, 0, -PI / 2],
      [1, 1, 0.1],
    );

    const boyas: [number, number, number][] = [
      [-4.5, -4.5, 0xff6b6b],
      [4.8, -6, 0xffc93c],
      [1.2, -13, 0xff6b6b],
    ];
    for (const [x, z, color] of boyas) {
      const boya = grupo(S, [x, 0, z], [0.1, 0, 0.12]);
      malla(boya, esfera(0.32, 18, 12), plastico(color), [0, 0.12, 0]);
      malla(boya, cilindro(0.05, 0.05, 0.5, 8), material(0xffffff), [0, 0.55, 0]);
      malla(boya, esfera(0.07, 10, 8), luminoso(0xfff2b0, 2), [0, 0.84, 0]);
      espuma(S, x, z, 0.42);
      this.boyas.push(boya);
    }

    // Muelle de tablones sobre pilotes
    const muelle = grupo(S, [-3.2, 0, 0.2]);
    const tablones = texturaMadera(0xd9a06a, 7);
    tablones.rotation = PI / 2;
    malla(
      muelle,
      caja(6.6, 0.22, 3, 0.05),
      material(0xd9a06a, { rugoso: 0.78, textura: tablones }),
      [0, 1, 0],
    );
    malla(muelle, caja(6.7, 0.2, 0.2, 0.05), material(0xa8703f, { rugoso: 0.85 }), [0, 0.86, 1.42]);
    const maderaOscura = material(0x9a6a45, {
      rugoso: 0.9,
      textura: texturaMadera(0x9a6a45, 1, [1, 3]),
    });
    for (const x of [-2.9, -0.9, 1.1, 3.05])
      for (const z of [-1.25, 1.25]) {
        pilote(muelle, maderaOscura, x, z, 0.22, 2.6);
        // Los de las esquinas de delante sobresalen, con su tapa clara
        if (z > 0 && (x < -2 || x > 3)) {
          malla(muelle, cilindro(0.2, 0.2, 0.75, 16), maderaOscura, [x, 1.45, z]);
          malla(muelle, esfera(0.22, 14, 10), crema, [x, 1.84, z], [0, 0, 0], [1, 0.5, 1]);
        }
      }
    // Barandilla de cuerda al fondo, entre dos postes
    const cuerda = material(0xf2e2c0, { rugoso: 1 });
    const soga = new TuboFlexible(() => 0.035, 12, 8);
    soga.colocar([-2.9, 1.75, -1.25], [0, 1.05, -1.25], [3.05, 1.75, -1.25]);
    malla(muelle, soga.geometria, cuerda);
    for (const x of [-2.9, 3.05])
      malla(muelle, cilindro(0.16, 0.18, 0.8, 14), maderaOscura, [x, 1.45, -1.25]);
    // Salvavidas, caja de pesca y cubo de sardinas
    malla(
      muelle,
      aro(0.3, 0.1),
      material(0xff6b6b, { rugoso: 0.5, textura: texturaRayas(0xff6b6b, 0xffffff, 8) }),
      [3.05, 1.2, 1.5],
      [0, 0.2, 0],
    );
    malla(
      muelle,
      caja(0.9, 0.55, 0.6, 0.06),
      material(0x4f9fd8, { rugoso: 0.6, textura: texturaMadera(0x4f9fd8, 3) }),
      [-2.6, 1.39, -0.5],
      [0, 0.3, 0],
    );
    malla(
      muelle,
      caja(0.95, 0.1, 0.65, 0.04),
      material(0x3d7ea3, { rugoso: 0.6 }),
      [-2.6, 1.7, -0.5],
      [0, 0.3, 0],
    );
    const cuboSardinas = cubo(muelle, [0.25, 1.11, 0.95], 1.05, 0xa9bccf);
    pez(cuboSardinas, [0.02, 0.5, 0], [0, 0.4, 1.2], 0.8);
    pez(cuboSardinas, [-0.08, 0.46, 0.08], [0, 2, 1], 0.8, 0x9fc8f0);
    pez(cuboSardinas, [0.1, 0.44, -0.08], [0, -1, 0.9], 0.8);

    // Pescador: gorro de lana con pompón, bigote blanco y chubasquero amarillo
    this.pescador = new Personaje(muelle, {
      pos: [1.2, ALTURA_MUELLE, 0.25],
      giro: GIRO_PESCADOR,
      escala: ESCALA_PESCADOR,
      piel: 0xf0b48a,
      ropa: 0xffc93c,
      pantalon: 0x3d6f9c,
      zapatos: 0xff7a4a,
      cuello: 0xff6b6b,
      cejas: 0xf4f1ea,
      barriga: 0.55,
    });
    const cab = this.pescador.cabeza;
    const R = this.pescador.radioCabeza;
    malla(
      cab,
      casquete(R * 1.07, 0.47, 28, 12),
      tela(0x3d7ea3),
      [0, R * 0.06, -R * 0.04],
      [-0.28, 0, 0],
    );
    malla(
      cab,
      aro(R * 1.02, R * 0.13),
      tela(0x5aa0c8),
      [0, R * 0.22, -R * 0.02],
      [PI / 2 - 0.28, 0, 0],
    );
    malla(cab, esfera(R * 0.26, 14, 10), tela(0xfff3dc), [0, R * 1.12, -R * 0.3]);
    for (const lado of [1, -1]) {
      malla(
        cab,
        esfera(R * 0.17, 12, 10),
        material(0xf4f1ea, { rugoso: 0.9 }),
        [lado * R * 0.17, -R * 0.3, R * 0.9],
        [0, 0, lado * 0.5],
        [1.5, 0.7, 0.7],
      );
    }
    for (const y of [0.62, 0.78, 0.94]) {
      malla(this.pescador.cuerpo, esfera(0.03, 10, 8), plastico(0x3a2e4a), [
        0,
        y,
        0.165 + (0.94 - y) * 0.05,
      ]);
    }
    this.sardinaEnMano = pez(this.pescador.objetoManoD, [0, 0.06, 0.02], [0, -PI / 2, 0.5], 0.55);
    this.sardinaEnVuelo = pez(S, [0, 0, 0], [0, 0, 0], 0.95);

    // Poste donde se posa la gaviota
    const poste = grupo(S, [POSTE[0], 0, POSTE[2]]);
    malla(poste, cilindro(0.3, 0.34, 3.4, 18), maderaOscura, [0, 0.5, 0]);
    malla(poste, cilindro(0.36, 0.36, 0.14, 18), crema, [0, 2.2, 0]);
    for (const y of [1.5, 1.38]) malla(poste, aro(0.33, 0.05), cuerda, [0, y, 0], [PI / 2, 0, 0]);
    espuma(poste, 0, 0, 0.5);

    for (let i = 0; i < 4; i++) this.gaviotas.push(new Gaviota(S, ESCALA_GAVIOTA));
    for (let i = 0; i < 2; i++) this.lejanas.push(new Gaviota(S, 0.9));
    this.chispas = new Chispas(S);
    this.salpicadura = new Salpicadura(S, AGUA[0], AGUA[2], 2);

    // Se mide una vez de dónde sale la sardina (la mano en la pose de lanzar) y adónde
    // llega (el pico de una gaviota posada)
    this.pescador.manoD.splice(0, 3, ...MANO_LANZA);
    this.pescador.actualizar(0, 1);
    this.colocarGaviota(this.gaviotas[0], POSTE, GIRO_POSADA, 0);
    S.updateMatrixWorld(true);
    this.pescador.objetoManoD.getWorldPosition(this.salidaSardina);
    this.gaviotas[0].pico.getWorldPosition(this.llegadaSardina);
  }

  actualizar(v: VistaEscena, reloj: number, dt: number): void {
    this.ambiente(reloj);
    const pulsoASegundos = 60 / v.bpm;
    const acertada = notaAcertada(v);

    // --- Gaviotas: una por cada nota que esté cerca en el tiempo ---
    for (const g of this.gaviotas) g.g.visible = false;
    /** La gaviota que más pronto necesita la sardina: el pescador la mira y se prepara. */
    let faltaMinima = Infinity;
    const objetivo = this.objetivo.set(8, 4, -2);
    v.notas.forEach((nota, i) => {
      const falta = nota.pulso - v.pulso;
      if (falta > LLEGADA || falta < -SALIDA) return;
      const g = this.gaviotas[i % this.gaviotas.length];
      g.g.visible = true;
      const aleteo = Math.sin(reloj * 17 + i);
      if (falta > 0) {
        this.llegar(g, falta, aleteo);
        if (falta < faltaMinima) {
          faltaMinima = falta;
          objetivo.copy(g.g.position);
        }
      } else if (nota.juicio === 'perfect' || nota.juicio === 'great') {
        // Si la acertó la última pulsación, la sardina todavía puede estar en el aire
        const yaLaTiene = acertada !== i || v.desdePulsacion >= VUELO_SARDINA;
        this.celebrar(g, -falta, yaLaTiene, aleteo, v.desdePulsacion);
      } else {
        this.quedarse(g, -falta, nota.juicio === 'miss', aleteo);
        // Posada y sin juzgar: sigue siendo el momento de lanzar
        if (nota.juicio === null) {
          faltaMinima = 0;
          objetivo.set(...POSTE);
        }
      }
    });

    // --- Sardina lanzada ---
    const d = v.desdePulsacion;
    const sardina = this.sardinaEnVuelo;
    if (acertada !== null) {
      // La atrapa la gaviota: vuelo corto y tenso hasta el pico
      const k = d / VUELO_SARDINA;
      sardina.visible = k < 1;
      sardina.position.lerpVectors(this.salidaSardina, this.llegadaSardina, k);
      sardina.position.y += arco(limitar(k)) * 0.45;
      sardina.rotation.z = -k * 5;
    } else {
      // Nadie la atrapa: hace un arco más alto y cae al agua
      const k = d / CAIDA_SARDINA;
      sardina.visible = k < 1;
      sardina.position.set(
        mezclar(this.salidaSardina.x, AGUA[0], k),
        mezclar(this.salidaSardina.y, AGUA[1], k * k) + arco(limitar(k)) * 1.1,
        mezclar(this.salidaSardina.z, AGUA[2], k),
      );
      sardina.rotation.z = -k * 9;
    }
    const perfecta = acertada !== null && v.notas[acertada].juicio === 'perfect';
    this.chispas.actualizar(
      this.llegadaSardina,
      acertada === null ? -1 : d - VUELO_SARDINA,
      perfecta ? 1.5 : 1,
    );
    this.salpicadura.actualizar(acertada === null ? d - CAIDA_SARDINA : -1);

    this.moverPescador(v, reloj, dt, faltaMinima, objetivo, pulsoASegundos);
  }

  /** La gaviota llega volando: velocidad constante para que se pueda prever cuándo se posa. */
  private llegar(g: Gaviota, falta: number, aleteo: number): void {
    const k = 1 - falta / LLEGADA;
    const frenada = tramo(falta, 0.3, 0);
    const pos: V3 = [
      mezclar(VIENE_DE[0], POSTE[0], k),
      POSTE[1] + (VIENE_DE[1] - POSTE[1]) * (1 - k) ** 1.5 + Math.sin(k * PI) * 0.6,
      mezclar(VIENE_DE[2], POSTE[2], k),
    ];
    // Al final abre las alas hacia arriba y echa el cuerpo atrás para frenar
    this.colocarGaviota(g, pos, GIRO_POSADA, mezclar(-0.15, 0.45, frenada));
    g.moverAlas(mezclar(0.25 + aleteo * 0.75, 1.05, frenada), 0);
    g.abrirPico(0.2 + 0.6 * frenada);
    g.girarCabeza(0, mezclar(0, -0.3, frenada));
    g.estado(false, false, falta > 0.12);
  }

  /** Acierto: espera la sardina, la atrapa y se va volando con ella. */
  private celebrar(
    g: Gaviota,
    hace: number,
    yaLaTiene: boolean,
    aleteo: number,
    desdePulsacion: number,
  ): void {
    if (hace < ESPERA) {
      // Al atraparla da un respingo y aletea de alegría
      const respingo = yaLaTiene ? golpe(desdePulsacion - VUELO_SARDINA, 0.25) : 0;
      this.colocarGaviota(g, POSTE, GIRO_POSADA, 0.1 * respingo, 1 - 0.12 * golpe(hace, 0.3));
      g.moverAlas(yaLaTiene ? 0.95 + aleteo * 0.3 : 0.3, yaLaTiene ? 0 : 1);
      g.abrirPico(yaLaTiene ? 0.15 : 1);
      g.girarCabeza(0, yaLaTiene ? 0.25 * respingo : 0.15);
      g.estado(yaLaTiene, false, false);
      return;
    }
    const k = tramo(hace, ESPERA, SALIDA);
    const subida = suave(k);
    const pos: V3 = [
      mezclar(POSTE[0], SE_VA_A[0], subida),
      mezclar(POSTE[1], SE_VA_A[1], subida),
      mezclar(POSTE[2], SE_VA_A[2], subida),
    ];
    // Se da la vuelta enseguida para salir mirando hacia donde va
    this.colocarGaviota(g, pos, mezclar(GIRO_POSADA, PI * 2, tramo(k, 0, 0.3)), 0.3);
    g.moverAlas(0.3 + aleteo * 0.8, 0);
    g.abrirPico(0.15);
    g.girarCabeza(0, 0);
    g.estado(true, false, true);
  }

  /** Sin sardina: mientras no hay juicio espera con el pico abierto; con fallo, se ofende y se va. */
  private quedarse(g: Gaviota, hace: number, fallo: boolean, aleteo: number): void {
    const seVa = fallo ? tramo(hace, 0.55, SALIDA) : 0;
    if (seVa === 0) {
      this.colocarGaviota(g, POSTE, GIRO_POSADA, 0, 1 - 0.12 * golpe(hace, 0.3));
      g.moverAlas(0.3, 1);
      g.abrirPico(fallo ? 0 : 1);
      // Ofendida: aparta la cara con un par de sacudidas
      g.girarCabeza(
        fallo ? 0.9 + 0.15 * Math.sin(hace * 30) * golpe(hace - 0.1, 0.4) : 0,
        fallo ? 0.2 : 0.15,
      );
      g.estado(false, fallo, false);
      return;
    }
    const pos: V3 = [
      mezclar(POSTE[0], HUYE_A[0], suave(seVa)),
      mezclar(POSTE[1], HUYE_A[1], suave(seVa)) + arco(seVa) * 0.8,
      mezclar(POSTE[2], HUYE_A[2], suave(seVa)),
    ];
    this.colocarGaviota(g, pos, PI + 0.5, 0.25);
    g.moverAlas(0.3 + aleteo * 0.8, 0);
    g.abrirPico(0);
    g.girarCabeza(0, 0);
    g.estado(false, true, true);
  }

  private colocarGaviota(
    g: Gaviota,
    pos: V3 | THREE.Vector3,
    giro: number,
    cabeceo: number,
    aplastar = 1,
  ): void {
    if (Array.isArray(pos)) g.g.position.set(...pos);
    else g.g.position.copy(pos);
    g.g.rotation.set(0, giro, cabeceo);
    // Al aplastarse se ensancha lo mismo que se achata, para que no pierda volumen
    const ancho = ESCALA_GAVIOTA / Math.sqrt(aplastar);
    g.g.scale.set(ancho, ESCALA_GAVIOTA * aplastar, ancho);
  }

  private moverPescador(
    v: VistaEscena,
    reloj: number,
    dt: number,
    falta: number,
    objetivo: THREE.Vector3,
    pulsoASegundos: number,
  ): void {
    const p = this.pescador;
    const d = v.desdePulsacion;
    // Anticipación: unos tres cuartos de pulso antes de la nota lleva el brazo atrás con la sardina
    this.prepara = acercar(this.prepara, suave(tramo(falta, 0.75, 0.2)), 14, dt);
    const prepara = this.prepara;
    const lanzando = d < 0.5;
    // Acción: el brazo sale disparado en 0,09 s; después vuelve despacio a donde le toque
    const disparo = frenar(limitar(d / 0.09));
    const vuelta = suave(tramo(d, 0.09, 0.5));

    const vaiven = Math.sin(reloj * 1.3) * 0.015;
    for (let i = 0; i < 3; i++) {
      const baseD = mezclar(MANO_REPOSO_D[i] + (i === 0 ? vaiven : 0), MANO_ATRAS[i], prepara);
      const baseI = mezclar(
        MANO_REPOSO_I[i] - (i === 0 ? vaiven : 0),
        MANO_EQUILIBRIO_ATRAS[i],
        prepara,
      );
      if (d < 0.09) {
        p.manoD[i] = mezclar(MANO_ATRAS[i], MANO_LANZA[i], disparo);
        p.manoI[i] = mezclar(MANO_EQUILIBRIO_ATRAS[i], MANO_EQUILIBRIO_LANZA[i], disparo);
      } else {
        p.manoD[i] = mezclar(MANO_LANZA[i], baseD, vuelta);
        p.manoI[i] = mezclar(MANO_EQUILIBRIO_LANZA[i], baseI, vuelta);
      }
    }
    this.sardinaEnMano.visible = !lanzando && prepara > 0.15;

    // El cuerpo acompaña: se echa atrás al preparar y adelante al lanzar, y marca el compás
    const empuje = d < 0.09 ? disparo : 1 - vuelta;
    const compas = v.notas.length ? latido(v.pulso) : 0;
    p.torso.rotation.x = mezclar(-0.16 * prepara, 0.22, empuje);
    // Como un lanzador: primero gira el pecho hacia la cámara (se «enrosca») y luego lo suelta hacia el poste
    p.torso.rotation.y = mezclar(-0.75 * prepara, 0.25, empuje);
    p.raiz.scale.y = ESCALA_PESCADOR * (1 - 0.025 * compas);

    // Reacción al último juicio: salta de alegría o se encoge
    const juzgada = ultimaJuzgada(v, 1);
    const hace = juzgada ? juzgada.hace * pulsoASegundos : Infinity;
    const acierto = juzgada !== null && juzgada.juicio !== 'miss';
    const salto = acierto ? arco(tramo(hace, 0.12, 0.42)) : 0;
    const pena =
      juzgada && !acierto ? rebote(tramo(hace, 0, 0.25)) * (1 - tramo(hace, 0.5, 0.7)) : 0;
    p.raiz.position.y = ALTURA_MUELLE + salto * 0.14;
    p.torso.rotation.x += pena * 0.1;
    if (salto > 0) {
      // Puño arriba con la mano libre
      p.manoI[0] = mezclar(p.manoI[0], -0.36, salto);
      p.manoI[1] = mezclar(p.manoI[1], 1.3, salto);
    }

    // La cabeza sigue a la gaviota que llega, pero solo un poco para no dar la espalda a la
    // cámara: el resto del giro lo hacen los ojos. En reposo mira el mar con calma
    const cabezaMundo = p.cabeza.getWorldPosition(this.cabezaMundo);
    const haciaGaviota =
      Math.atan2(objetivo.x - cabezaMundo.x, objetivo.z - cabezaMundo.z) - GIRO_PESCADOR;
    const sigue = falta < LLEGADA;
    const giroCabeza = sigue ? limitar(haciaGaviota, -0.5, 0.4) : 0.1 + 0.2 * Math.sin(reloj * 0.5);
    const alzaCabeza = sigue ? -limitar((objetivo.y - cabezaMundo.y) * 0.1, -0.1, 0.35) : -0.05;
    const rapidez = Math.min(1, dt * 9);
    // La cabeza cuelga del torso: se le descuenta su giro para que siga mirando al mismo sitio
    const giroFinal = limitar(giroCabeza - p.torso.rotation.y, -0.5, 0.9);
    p.cabeza.rotation.y += (giroFinal - p.cabeza.rotation.y) * rapidez;
    p.cabeza.rotation.x += (alzaCabeza + pena * 0.14 - p.cabeza.rotation.x) * rapidez;
    p.cabeza.rotation.z = pena > 0 ? pena * 0.12 * Math.sin(hace * 22) : 0;
    p.mirada[0] = sigue ? limitar(haciaGaviota - giroCabeza, -1, 1) : 0;
    p.mirada[1] = sigue ? 0.4 : 0;

    if (juzgada && hace < 0.75)
      p.expresion = juzgada.juicio === 'perfect' ? 'risa' : acierto ? 'feliz' : 'triste';
    else if (prepara > 0.3 || lanzando) p.expresion = 'concentrado';
    else p.expresion = v.notas.length ? 'neutral' : 'feliz';
    p.actualizar(reloj, dt);
  }

  /** Todo lo que se mueve aunque no pase nada: olas, barca, boyas, nubes, faro y gaviotas lejanas. */
  private ambiente(t: number): void {
    this.mar.actualizar(t);
    this.barca.position.y = 0.05 + Math.sin(t * 1.1) * 0.05;
    this.barca.rotation.z = 0.03 + Math.sin(t * 0.9) * 0.035;
    this.boyas.forEach((boya, i) => {
      boya.position.y = Math.sin(t * 1.4 + i * 2) * 0.05;
      boya.rotation.z = 0.12 + Math.sin(t * 1.1 + i) * 0.1;
    });
    this.nubes.forEach((n, i) => {
      // Cruzan el cielo muy despacio y vuelven a entrar por el otro lado
      n.position.x = ((((i * 13 + t * 0.25) % 60) + 60) % 60) - 30 + i * 3;
    });
    this.linterna.emissiveIntensity = 1.6 + 1.4 * Math.max(0, Math.sin(t * 2));
    this.lejanas.forEach((g, i) => {
      const a = t * 0.22 + i * 2.4;
      g.g.position.set(
        -5 + Math.cos(a) * (5 + i * 2),
        5.2 + i * 0.6 + Math.sin(a * 2) * 0.3,
        -13 - i * 4 + Math.sin(a) * 2.5,
      );
      g.g.rotation.set(0, -a - PI / 2, 0.1);
      g.moverAlas(0.2 + Math.sin(t * 5 + i) * 0.5, 0);
      g.abrirPico(0);
      g.estado(false, false, true);
    });
  }
}

// Posiciones de las manos del pescador, en coordenadas del personaje
const MANO_REPOSO_D: V3 = [0.34, 0.6, 0.08];
const MANO_REPOSO_I: V3 = [-0.34, 0.6, 0.08];
/** Brazo atrás y arriba, con la sardina lista. */
const MANO_ATRAS: V3 = [0.52, 1.3, -0.12];
/** Brazo extendido hacia el poste: aquí suelta la sardina. */
const MANO_LANZA: V3 = [0.42, 1.22, 0.5];
const MANO_EQUILIBRIO_ATRAS: V3 = [-0.26, 0.95, 0.36];
const MANO_EQUILIBRIO_LANZA: V3 = [-0.38, 0.72, -0.12];

export const puerto3d: Definicion3d = {
  motor: {
    cielo: [
      [0, 0x3f9be0],
      [0.38, 0x8fd0f2],
      [0.56, 0xffe9c4],
      [0.62, 0xffe2b4],
      [1, 0xffe2b4],
    ],
    niebla: [0xffe2b4, 30, 95],
    camara: [0.5, 2.7, 9.2],
    mira: [0.5, 2.25, 0],
    angulo: 30,
    sol: { pos: [7, 6, 3], color: 0xffcf96, fuerza: 3.4 },
    contraluz: { pos: [-6, 5, -5], color: 0x9fd0ff, fuerza: 1.4 },
    ambiente: { cielo: 0xbfe2ff, suelo: 0x4fb0b8, fuerza: 0.8 },
    exposicion: 0.92,
    reflejos: 0.3,
    resplandor: 0.3,
    foco: 9.3,
  },
  crear: (motor) => new Puerto(motor),
};
