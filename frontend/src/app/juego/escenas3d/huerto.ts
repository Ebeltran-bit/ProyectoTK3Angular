/**
 * Escena 3D «Huerto a compás» (fácil).
 *
 * Una abeja entra volando por la derecha, se queda un instante sobre la calabaza que tiene
 * sed y se posa en ella justo en el pulso; entonces la hortelana la riega. Cada nota se
 * cuenta en tres tiempos:
 *  - Anticipación: la hortelana espera junto a la calabaza, levanta la regadera y la echa
 *    un poco atrás mientras mira a la abeja que baja.
 *  - Acción: al pulsar inclina la regadera de golpe y cae un chorro de agua.
 *  - Reacción: si se acierta, la calabaza crece de un estirón, saltan chispas, la abeja da
 *    una voltereta y la hortelana da un saltito; si se falla, la calabaza se mustia, la abeja
 *    se escapa mareada y a la hortelana se le cae el alma a los pies.
 *
 * Entre nota y nota la hortelana camina hasta la calabaza siguiente. Como en las demás
 * escenas, todo se calcula en cada fotograma a partir de la `VistaEscena`.
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
  esfera,
  grupo,
  malla,
  silueta,
  sinSombra,
  TuboFlexible,
  V3,
} from './formas';
import { latido, notaAcertada, ultimaJuzgada } from './golpes';
import { crearAzar, luminoso, material, tela, texturaMadera, texturaRuido } from './materiales';
import { Motor } from './motor';
import { Chispas, nube } from './objetos';
import { Personaje } from './personaje';
import { Definicion3d, Escena3d } from './tipos';

const PI = Math.PI;

// --- Tiempos (en pulsos) ---
/** Pulsos que tarda la abeja desde que entra hasta que se posa: igual que en la versión plana. */
const LLEGA = 1.2;
/** Pulsos que la abeja sigue a la vista después de su nota, mientras se marcha. */
const SE_VA = 0.9;

// --- Riego (en segundos desde la pulsación) ---
/** Lo que tarda la regadera en inclinarse del todo: el gesto seco de la acción. */
const GOLPE_RIEGO = 0.09;
/** Desde cuándo y cada cuánto sale una tanda de gotas, y cuántas tandas hay. */
const PRIMERA_GOTA = 0.05;
const CADA_GOTA = 0.024;
const TANDAS = 9;
/** Lo que tarda cada gota en llegar de la boquilla a la calabaza. */
const VUELO_GOTA = 0.14;
/** Cuándo llega la primera gota: ahí crece la calabaza y saltan las chispas. */
const CAIDA = PRIMERA_GOTA + VUELO_GOTA;

// --- Lugares ---
const CALABAZAS = 5;
const X_CALABAZA = [-3.7, -2.1, -0.5, 1.1, 2.7];
/** Fila de las calabazas, altura de su base y altura de la tierra del bancal. */
const Z_FILA = 0.5;
const BASE = 0.3;
const TIERRA = 0.26;
/** Tamaño de cada calabaza al empezar, lo que crece con cada acierto y su tope. */
const TALLA_INICIAL = [0.85, 0.92, 0.95, 0.85, 0.72];
const CRECE = 0.08;
const TALLA_MAXIMA = 1.45;
/** Calabaza junto a la que espera la hortelana antes de empezar (la de la propuesta). */
const EN_REPOSO = 3;
const ESCALA_HORTELANA = 1.5;
/** Giro de la hortelana cuando riega hacia la derecha: de tres cuartos, mirando a la cámara. */
const GIRO_HORTELANA = 0.45;
/** Giro de la regadera en sus manos: el pitorro apunta hacia la derecha y un poco adelante. */
const GIRO_REGADERA = -0.85;
/** Inclinación de la regadera (positiva = pitorro arriba): quieta, preparada y regando. */
const INCLINA_QUIETA = 0.12;
const INCLINA_PREPARADA = 0.35;
const INCLINA_RIEGO = -0.42;
/** Por dónde entra la abeja, a qué altura espera sobre la calabaza y adónde se va. */
const VIENE_DE: V3 = [6.8, 3.4, -0.4];
const ALTO = 2.85;
const ESCALA_ABEJA = 1.2;
/** Segundos «desde» algo que no ha pasado: lo bastante lejos para que no anime nada. */
const NUNCA = 99;

// Posiciones de las manos de la hortelana (en coordenadas del personaje) para regar hacia
// la derecha. Hacia la izquierda se usan las mismas en espejo
/** La mano que coge el asa de la regadera. */
const AGARRE: V3 = [0.2, 1.06, 0.38];
/** La otra mano, debajo del cuerpo de la regadera. */
const APOYO: V3 = [0.36, 0.9, 0.48];
/** Al caminar lleva la regadera delante con las dos manos en el asa. */
const MARCHA_AGARRE: V3 = [0.07, 0.95, 0.34];
const MARCHA_APOYO: V3 = [-0.07, 0.95, 0.34];
const MARCHA_REGADERA: V3 = [0, 0.95, 0.34];

/** Contorno de una hoja de calabaza, de abajo arriba. */
const perfilHoja = (s: THREE.Shape) =>
  s
    .moveTo(0, 0)
    .bezierCurveTo(0.3, 0.1, 0.35, 0.5, 0, 0.8)
    .bezierCurveTo(-0.35, 0.5, -0.3, 0.1, 0, 0);
/** Contorno de una estaca de la valla, con su punta. */
const perfilEstaca = (s: THREE.Shape) =>
  s.moveTo(-0.15, 0).lineTo(0.15, 0).lineTo(0.15, 1.25).lineTo(0, 1.48).lineTo(-0.15, 1.25);

/**
 * Lado desde el que se riega cada calabaza: 1 desde su izquierda (regando hacia la derecha) y
 * −1 desde su derecha. Las dos de la izquierda se riegan desde la derecha porque, si no, la
 * hortelana se saldría del cuadro.
 */
const ladoDe = (c: number) => (c <= 1 ? -1 : 1);

/** Piezas que comparten las tres abejas: se crean una sola vez. */
function piezasAbeja() {
  const antena = new TuboFlexible(() => 0.012, 6, 6);
  antena.colocar([0.28, 0.14, 0.05], [0.32, 0.26, 0.08], [0.4, 0.3, 0.1]);
  return {
    cuerpo: esfera(0.2, 24, 18),
    raya: aro(0.185, 0.035),
    cabeza: esfera(0.15, 24, 18),
    bola: esfera(1, 12, 10),
    antena: antena.geometria,
    ala: esfera(0.16, 20, 14).scale(0.8, 1.1, 0.15),
    aguijon: cono(0.03, 0.1, 10),
    amarillo: material(0xffd23c, { rugoso: 0.6, pelusa: 0.6 }),
    oscuro: material(0x3a2e4a, { rugoso: 0.7 }),
    blanco: material(0xffffff, { rugoso: 0.15, barniz: 1 }),
    pupila: material(0x1d1626, { rugoso: 0.2, barniz: 1 }),
    mAla: material(0xe8f8ff, { rugoso: 0.1, opacidad: 0.6, barniz: 1 }),
    mEstela: luminoso(0xffffff, 1),
  };
}
type PiezasAbeja = ReturnType<typeof piezasAbeja>;

/** Abeja regordeta que mira hacia +X, con alas que baten y una estela de puntitos. */
class Abeja {
  readonly g: THREE.Group;
  /** Puntitos que dibujan el camino que acaba de recorrer. */
  readonly estela: THREE.Mesh[] = [];
  private readonly alas: THREE.Group[] = [];

  constructor(padre: THREE.Object3D, p: PiezasAbeja) {
    this.g = grupo(padre, [0, 0, 0], [0, 0, 0], ESCALA_ABEJA);
    // Primero el rumbo (Y) y luego los giros sobre su propio cuerpo: alabeo (X) y looping (Z)
    this.g.rotation.order = 'YXZ';
    malla(this.g, p.cuerpo, p.amarillo, [0, 0, 0], [0, 0, 0], [1.25, 1, 1]);
    for (const x of [-0.08, 0.06]) malla(this.g, p.raya, p.oscuro, [x, 0, 0], [0, PI / 2, 0]);
    malla(this.g, p.cabeza, p.amarillo, [0.24, 0.03, 0]);
    malla(this.g, p.aguijon, p.oscuro, [-0.28, 0, 0], [0, 0, PI / 2]);
    for (const lado of [1, -1]) {
      malla(this.g, p.bola, p.blanco, [0.34, 0.06, lado * 0.07], [0, 0, 0], [0.027, 0.045, 0.036]);
      malla(this.g, p.bola, p.pupila, [0.365, 0.06, lado * 0.075], [0, 0, 0], [0.016, 0.026, 0.02]);
      // La antena se dibuja hacia +Z y se da la vuelta para la del otro lado
      malla(this.g, p.antena, p.oscuro, [0, 0, 0], [0, 0, 0], [1, 1, lado]);
      malla(this.g, p.bola, p.oscuro, [0.4, 0.3, lado * 0.1], [0, 0, 0], 0.025);
      // Cada ala cuelga de una bisagra en la espalda para poder batir
      const bisagra = grupo(this.g, [-0.04, 0.14, lado * 0.06]);
      sinSombra(malla(bisagra, p.ala, p.mAla, [0, 0.08, lado * 0.06], [lado * 0.6, 0, 0.3]));
      this.alas.push(bisagra);
    }
    for (let i = 0; i < 6; i++) this.estela.push(sinSombra(malla(padre, p.bola, p.mEstela)));
  }

  /** @param batir de 0 (alas quietas y plegadas) a 1 (batiendo a toda prisa) */
  aletear(reloj: number, batir: number): void {
    const ala = Math.sin(reloj * 70) * 0.55 * batir;
    // Las dos alas baten a la vez, cada una hacia su lado
    this.alas[0].rotation.x = ala + 0.1 - 0.35 * (1 - batir);
    this.alas[1].rotation.x = -this.alas[0].rotation.x;
  }
}

class Huerto implements Escena3d {
  readonly palabra: Escena3d['palabra'];
  /** Cada calabaza (se escala entera para crecer) y la bisagra de su hoja de arriba. */
  private readonly calabazas: { g: THREE.Group; hoja: THREE.Group }[] = [];
  private readonly abejas: Abeja[] = [];
  private readonly gotas: THREE.Mesh[] = [];
  private readonly chispas: Chispas;
  private readonly hortelana: Personaje;
  /** Regadera: su origen es el asa, para que gire alrededor de la mano que la coge. */
  private readonly regadera: THREE.Group;
  /** Punta del pitorro y un punto algo más atrás: dan de dónde sale el agua y hacia dónde. */
  private readonly punta: THREE.Group;
  private readonly boquilla: THREE.Group;
  /** Dónde cae el agua respecto a los pies de la hortelana cuando riega hacia la derecha. */
  private readonly alcance = new THREE.Vector2();
  private readonly nubes: THREE.Group[] = [];
  private readonly copas: THREE.Group[] = [];
  private espantapajaros!: THREE.Group;
  /** Cuánto tiene la hortelana la regadera preparada (0 a 1); cambia poco a poco. */
  private prepara = 0;
  // Datos de trabajo que se rellenan en cada fotograma, sin crear objetos nuevos
  private readonly tallas = [...TALLA_INICIAL];
  private readonly desdeAcierto = new Array<number>(CALABAZAS).fill(NUNCA);
  private readonly desdeFallo = new Array<number>(CALABAZAS).fill(NUNCA);
  private readonly mira = new THREE.Vector3();
  private readonly salida = new THREE.Vector3();
  private readonly direccion = new THREE.Vector3();
  private readonly destino = new THREE.Vector3();
  private readonly cima = new THREE.Vector3();
  private readonly curva = new THREE.QuadraticBezierCurve3();

  constructor(motor: Motor) {
    const S = motor.escena;
    // La palabra sale entre las dos calabazas de la derecha, a la altura del chorro
    const aciertos = ['¡Glup!', '¡Chof!', '¡Plic!'];
    this.palabra = { ...motor.proyectar([1.75, 1.3, Z_FILA]), aciertos };
    this.decorado(S);

    // Bancal: tierra con grumos sobre un marco de madera
    const tierra = material(0xc9a184, { rugoso: 1, textura: texturaRuido(0x8a5a3c, 0.3, [5, 2]) });
    malla(S, caja(13.4, 0.36, 3.6, 0.16), tierra, [0, 0.08, 0.2]);
    const marco = material(0xc98d5a, { rugoso: 0.85, textura: texturaMadera(0xc98d5a, 2, [6, 1]) });
    malla(S, caja(13.8, 0.3, 4.0, 0.1), marco, [0, 0.02, 0.2]);
    this.crearCalabazas(S, tierra);
    // Tres abejas que se van turnando: nunca hay más de tres notas a la vista
    const piezas = piezasAbeja();
    for (let i = 0; i < 3; i++) this.abejas.push(new Abeja(S, piezas));
    this.chispas = new Chispas(S, 10, [0xffffff, 0x8fe4ff, 0xffd23c]);

    this.hortelana = this.crearHortelana(S);
    this.regadera = grupo(this.hortelana.cuerpo, [0, 0, 0], [0, 0, 0], 1.15 / ESCALA_HORTELANA);
    [this.punta, this.boquilla] = this.crearRegadera(this.regadera);

    const agua = material(0x8fe4ff, { rugoso: 0.05, barniz: 1, luz: 0x6fd0ff, opacidad: 0.9 });
    const gota = esfera(1, 10, 8);
    for (let i = 0; i < TANDAS * 3; i++) this.gotas.push(sinSombra(malla(S, gota, agua)));

    // Se mide una vez dónde cae el agua con la hortelana en el origen y la regadera
    // volcada: de ahí sale a qué distancia de cada calabaza tiene que ponerse
    const p = this.hortelana;
    p.raiz.position.set(0, TIERRA, 0);
    p.raiz.rotation.y = GIRO_HORTELANA;
    this.posarManos(1, 0, 0, INCLINA_RIEGO);
    p.actualizar(0, 1);
    S.updateMatrixWorld(true);
    this.chorro();
    this.alcance.set(this.destino.x, this.destino.z);
  }

  actualizar(v: VistaEscena, reloj: number, dt: number): void {
    const pulsoASegundos = 60 / v.bpm;
    this.ambiente(v, reloj);
    this.colocarCalabazas(v, pulsoASegundos);

    // --- Abejas: una por cada nota que esté cerca en el tiempo ---
    for (const a of this.abejas) {
      a.g.visible = false;
      for (const punto of a.estela) punto.visible = false;
    }
    /** La abeja que va a posarse antes: la hortelana la sigue con la mirada. */
    let abejaQueLlega: Abeja | null = null;
    for (let i = 0; i < v.notas.length; i++) {
      const nota = v.notas[i];
      const falta = nota.pulso - v.pulso;
      if (falta > LLEGA || falta < -SE_VA) continue;
      const abeja = this.abejas[i % this.abejas.length];
      abeja.g.visible = true;
      this.posada(i % CALABAZAS, this.destino);
      if (falta > 0) {
        this.llegar(abeja, 1 - falta / LLEGA, reloj);
        // Las notas van en orden: la primera que aún no ha llegado es la más próxima
        if (!abejaQueLlega) abejaQueLlega = abeja;
      } else if (nota.juicio === null) {
        // Posada: espera el agua con las alas quietas
        abeja.g.position.copy(this.destino);
        abeja.g.rotation.set(0, PI * 1.5, 0);
        abeja.aletear(reloj, 0.15);
      } else {
        this.marcharse(abeja, -falta * pulsoASegundos, nota.juicio !== 'miss', reloj);
      }
    }

    // --- Agua y chispas del último riego ---
    const riega = v.ultimaTecla === 'accion' ? v.desdePulsacion : Infinity;
    this.moverHortelana(v, reloj, dt, riega, abejaQueLlega, pulsoASegundos);
    this.regar(riega);
    const acertada = notaAcertada(v);
    if (acertada !== null) this.cimaDe(acertada % CALABAZAS, this.cima);
    this.chispas.actualizar(
      this.cima,
      acertada === null ? -1 : v.desdePulsacion - CAIDA,
      acertada !== null && v.notas[acertada].juicio === 'perfect' ? 1.5 : 1.1,
    );
  }

  /**
   * Cada calabaza crece con los aciertos de sus notas (la nota i es de la calabaza i % 5),
   * como en la versión plana: un PERFECT cuenta entero y un GREAT algo más de la mitad.
   */
  private colocarCalabazas(v: VistaEscena, pulsoASegundos: number): void {
    for (let c = 0; c < CALABAZAS; c++) {
      this.tallas[c] = TALLA_INICIAL[c];
      this.desdeAcierto[c] = this.desdeFallo[c] = NUNCA;
    }
    v.notas.forEach((n, i) => {
      if (n.juicio === null) return;
      const c = i % CALABAZAS;
      const hace = (v.pulso - n.pulso) * pulsoASegundos;
      if (n.juicio === 'miss') {
        this.desdeFallo[c] = Math.min(this.desdeFallo[c], hace);
        return;
      }
      // El estirón empieza cuando le llega el agua y se pasa un poco antes de asentarse
      const peso = n.juicio === 'perfect' ? 1 : 0.6;
      this.tallas[c] += CRECE * peso * rebote(tramo(hace, CAIDA, CAIDA + 0.35));
      this.desdeAcierto[c] = Math.min(this.desdeAcierto[c], hace);
    });
    this.calabazas.forEach((cal, c) => {
      const talla = Math.min(TALLA_MAXIMA, this.tallas[c]);
      this.tallas[c] = talla;
      // Al crecer tiembla como una gelatina; con un fallo se mustia y se queda chafada
      const tiembla =
        golpe(this.desdeAcierto[c] - CAIDA, 0.45) * Math.sin((this.desdeAcierto[c] - CAIDA) * 28);
      const mustia =
        suave(tramo(this.desdeFallo[c], 0.09, 0.3)) * (1 - tramo(this.desdeFallo[c], 1, 1.6));
      const alto = 1 + 0.14 * tiembla - 0.2 * mustia;
      const ancho = 1 / Math.sqrt(alto);
      cal.g.scale.set(talla * ancho, talla * alto, talla * ancho);
      cal.hoja.rotation.x = -0.5 + 0.9 * mustia;
    });
  }

  /** Punto donde se posa la abeja sobre la calabaza c: arriba, junto al rabito. */
  private posada(c: number, punto: THREE.Vector3): void {
    const talla = this.tallas[c];
    punto.set(X_CALABAZA[c] + 0.24 * talla, BASE + 0.52 * talla + 0.17, Z_FILA - 0.15 * talla);
  }

  /** Punto de la calabaza c donde cae el agua y saltan las chispas. */
  private cimaDe(c: number, punto: THREE.Vector3): void {
    punto.set(X_CALABAZA[c], BASE + 0.55 * this.tallas[c], Z_FILA);
  }

  /**
   * La abeja llega: cruza el cielo, se para sobre la calabaza y baja hasta posarse justo en
   * la nota. Esa bajada final es lo que marca el ritmo.
   * @param k avance de 0 (entra) a 1 (se posa)
   */
  private llegar(abeja: Abeja, k: number, reloj: number): void {
    this.caminoAbeja(k, abeja.g.position);
    // Vuela mirando hacia la izquierda y se vuelve hacia la cámara al bajar
    abeja.g.rotation.set(0, mezclar(PI, PI * 1.5, suave(tramo(k, 0.6, 0.92))), 0);
    abeja.aletear(reloj, 1);
    abeja.estela.forEach((punto, j) => {
      const atras = k - (j + 1) * 0.05;
      punto.visible = atras > 0 && k < 0.97;
      this.caminoAbeja(atras, punto.position);
      punto.scale.setScalar(0.035 * (1 - j * 0.12));
    });
  }

  /** Posición de la abeja en su camino de llegada (usa `destino`, la calabaza a la que va). */
  private caminoAbeja(k: number, pos: THREE.Vector3): void {
    const d = this.destino;
    const cruza = frenar(tramo(k, 0, 0.78));
    const vuelo =
      mezclar(VIENE_DE[1], ALTO, suave(tramo(k, 0, 0.6))) +
      0.1 * Math.sin(k * 16) * (1 - tramo(k, 0.5, 0.7));
    // Bajada final acelerando, como algo que se deja caer
    const baja = tramo(k, 0.72, 1) ** 2;
    const [x, , z] = VIENE_DE;
    pos.set(mezclar(x, d.x, cruza), mezclar(vuelo, d.y, baja), mezclar(z, d.z, cruza));
  }

  /**
   * Después de su nota la abeja se va: con un acierto da una voltereta y sube contenta hacia
   * la derecha; con un fallo se escapa mareada hacia el fondo.
   * @param hace segundos desde la nota
   */
  private marcharse(abeja: Abeja, hace: number, contenta: boolean, reloj: number): void {
    const d = this.destino;
    const g = abeja.g;
    abeja.aletear(reloj, 1);
    if (contenta) {
      // Primero un respingo hacia arriba (cuando le salpica el agua) y luego se aleja
      const k = tramo(hace, 0.1, 0.75);
      const respingo = frenar(tramo(hace, 0, 0.18));
      g.position.set(d.x + 5 * k * k, d.y + 0.45 * respingo + 3 * k * k, d.z - 1.5 * k * k);
      // Se vuelve hacia la derecha y da un looping de alegría
      const rumbo = mezclar(PI * 1.5, PI * 2, suave(tramo(hace, 0.05, 0.25)));
      g.rotation.set(0, rumbo, PI * 2 * suave(tramo(hace, 0.15, 0.6)));
      return;
    }
    // Un fallo no se sabe hasta que pasa la ventana de 90 ms: hasta entonces sigue posada
    const k = tramo(hace, 0.09, 0.75);
    const mareo = Math.sin(hace * 26) * k;
    g.position.set(d.x + 1.5 * k, d.y + 1.1 * k + 0.15 * mareo, d.z - 6 * k * k);
    g.rotation.set(0.6 * mareo, mezclar(PI * 1.5, PI * 0.4, suave(tramo(k, 0, 0.4))), 0);
  }

  /**
   * Recoloca a la hortelana. Entre una nota y la siguiente camina hasta su nueva calabaza;
   * a las dos de la izquierda las riega desde la derecha (ver `ladoDe`).
   */
  private moverHortelana(
    v: VistaEscena,
    reloj: number,
    dt: number,
    riega: number,
    abeja: Abeja | null,
    pulsoASegundos: number,
  ): void {
    const p = this.hortelana;
    // Nota siguiente (b) y anterior (a). Antes de empezar viene de la calabaza del reposo
    let b = v.notas.findIndex((n) => n.pulso > v.pulso);
    if (b < 0) b = v.notas.length;
    const hayB = b < v.notas.length;
    const a = b - 1;
    const cA = a >= 0 ? a % CALABAZAS : EN_REPOSO;
    const cB = hayB ? b % CALABAZAS : cA;
    const pulsoB = hayB ? v.notas[b].pulso : Infinity;
    const pulsoA = a >= 0 ? v.notas[a].pulso : pulsoB - 2;
    const hueco = pulsoB - pulsoA;
    // Se queda regando un rato y llega a la siguiente con tiempo para prepararse
    const salir = pulsoA + Math.min(0.45, hueco * 0.35);
    const k = hayB ? tramo(v.pulso, salir, pulsoB - Math.min(0.45, hueco * 0.3)) : 0;
    const ladoA = ladoDe(cA);
    const ladoB = ladoDe(cB);
    const lado = k < 0.5 ? ladoA : ladoB;
    const xA = X_CALABAZA[cA] - ladoA * this.alcance.x;
    const xB = X_CALABAZA[cB] - ladoB * this.alcance.x;
    const x = mezclar(xA, xB, suave(k));
    const camina = xA !== xB || ladoA !== ladoB;
    const andar = camina ? suave(tramo(k, 0, 0.2)) * (1 - suave(tramo(k, 0.8, 1))) : 0;

    // Pasos: la fase sale de la posición, así los pies nunca resbalan
    const fase = (x / 0.36) * PI;
    const paso = andar * Math.min(1, Math.abs(xB - xA));
    p.pieD[1] = 0.07 + 0.09 * paso * Math.max(0, Math.sin(fase));
    p.pieD[2] = 0.02 + 0.16 * paso * Math.cos(fase);
    p.pieI[1] = 0.07 + 0.09 * paso * Math.max(0, -Math.sin(fase));
    p.pieI[2] = 0.02 - 0.16 * paso * Math.cos(fase);
    const giroMarcha = Math.abs(xB - xA) > 0.5 ? Math.sign(xB - xA) * 1.05 : 0;
    p.raiz.rotation.y = mezclar(lado * GIRO_HORTELANA, giroMarcha, andar);

    // Anticipación: levanta la regadera y la echa atrás mientras la abeja baja
    const falta = pulsoB - v.pulso;
    this.prepara = acercar(this.prepara, suave(tramo(falta, 0.6, 0.15)) * (1 - andar), 14, dt);
    // Acción: la inclina de golpe; luego la endereza despacio
    const disparo = frenar(limitar(riega / GOLPE_RIEGO));
    const vuelta = suave(tramo(riega, 0.3, 0.6));
    const enReposo = mezclar(INCLINA_QUIETA, INCLINA_PREPARADA, this.prepara);
    const inclina =
      riega < GOLPE_RIEGO
        ? mezclar(enReposo, INCLINA_RIEGO, disparo)
        : mezclar(INCLINA_RIEGO, enReposo, vuelta);
    const vuelca = riega < GOLPE_RIEGO ? disparo : 1 - vuelta;

    // Reacción al último juicio: saltito de alegría o se le cae el alma a los pies
    const juzgada = ultimaJuzgada(v, 1.2);
    const hace = juzgada ? juzgada.hace * pulsoASegundos : Infinity;
    const acierto = juzgada !== null && juzgada.juicio !== 'miss';
    const alto = juzgada?.juicio === 'perfect' ? 1 : 0.6;
    const salto = acierto ? alto * arco(tramo(hace, 0.2, 0.5)) : 0;
    const pena = !acierto ? rebote(tramo(hace, 0.09, 0.3)) * (1 - tramo(hace, 0.75, 1)) : 0;
    const compas = v.notas.length ? latido(v.pulso) : 0;
    const brinco = 0.16 * salto + 0.05 * paso * Math.abs(Math.sin(fase));
    p.raiz.position.set(x, TIERRA + brinco, Z_FILA - this.alcance.y);
    p.raiz.scale.y = ESCALA_HORTELANA * (1 - 0.025 * compas);
    p.torso.rotation.x = -0.1 * this.prepara + 0.16 * vuelca + 0.08 * andar + 0.14 * pena;
    p.torso.rotation.z = -0.05 * lado * this.prepara;
    const sube = 0.04 * this.prepara + 0.04 * vuelca + 0.08 * salto - 0.06 * pena;
    this.posarManos(lado, andar, sube, inclina - 0.3 * pena);

    // Mira a la abeja que baja; si no hay, a su calabaza; en reposo, a quien juega
    if (abeja) this.mira.copy(abeja.g.position);
    else if (v.notas.length) this.cimaDe(lado === ladoA ? cA : cB, this.mira);
    else this.mira.set(x, 3, 9);
    // Se mira a medio camino entre eso y la cámara, y sin agachar la cabeza: así el ala del
    // sombrero no le tapa la cara y se le ven los ojos
    this.mira.set(mezclar(this.mira.x, x, 0.35), Math.max(this.mira.y, 2.4), this.mira.z + 3);
    p.mirarA(this.mira, dt);
    // Con la pena niega con la cabeza; si no, la ladea un poco, despacio
    const ladea = pena > 0 ? pena * 0.12 * Math.sin(hace * 22) : 0.04 * Math.sin(reloj * 1.3);
    p.cabeza.rotation.z = ladea;

    const reacciona = juzgada !== null && hace < 0.8;
    if (reacciona && acierto) p.expresion = juzgada?.juicio === 'perfect' ? 'risa' : 'feliz';
    else if (reacciona) p.expresion = hace < 0.3 ? 'sorpresa' : 'triste';
    else p.expresion = riega < 0.4 || this.prepara > 0.3 ? 'concentrado' : 'feliz';
    p.actualizar(reloj, dt);
  }

  /**
   * Coloca las manos y la regadera.
   * @param lado 1 si riega hacia la derecha y −1 hacia la izquierda (en espejo)
   * @param andar de 0 (quieta) a 1 (caminando, con la regadera delante)
   */
  private posarManos(lado: number, andar: number, sube: number, inclina: number): void {
    const p = this.hortelana;
    // La mano del asa es la del lado hacia el que riega; en espejo se cambian los papeles
    const agarre = lado > 0 ? p.manoD : p.manoI;
    const apoyo = lado > 0 ? p.manoI : p.manoD;
    const r = this.regadera.position;
    for (let i = 0; i < 3; i++) {
      const espejo = i === 0 ? lado : 1;
      const arriba = i === 1 ? sube : 0;
      agarre[i] = mezclar(AGARRE[i], MARCHA_AGARRE[i], andar) * espejo + arriba;
      apoyo[i] = mezclar(APOYO[i], MARCHA_APOYO[i], andar) * espejo + arriba;
      r.setComponent(i, mezclar(AGARRE[i], MARCHA_REGADERA[i], andar) * espejo + arriba);
    }
    // En espejo el pitorro apunta al otro lado. Al caminar apunta hacia delante, que es lo
    // mismo para los dos lados: por eso el cambio de lado no da saltos
    const quieta = lado > 0 ? GIRO_REGADERA : PI - GIRO_REGADERA;
    const marcha = lado > 0 ? -PI / 2 : PI * 1.5;
    this.regadera.rotation.set(0, mezclar(quieta, marcha, andar), inclina * (1 - andar));
  }

  /**
   * Calcula de dónde sale el chorro (`salida`), hacia dónde (`direccion`) y dónde cae
   * (`destino`): sobre la calabaza que quede debajo o, si no hay ninguna, en la tierra.
   */
  private chorro(): void {
    this.punta.getWorldPosition(this.salida);
    this.boquilla.getWorldPosition(this.direccion);
    this.direccion.subVectors(this.salida, this.direccion).normalize();
    const largo = Math.hypot(this.direccion.x, this.direccion.z) || 1;
    const x = this.salida.x + (this.direccion.x / largo) * 0.3;
    const z = this.salida.z + (this.direccion.z / largo) * 0.3;
    let y = TIERRA + 0.02;
    X_CALABAZA.forEach((xc, c) => {
      if (Math.abs(x - xc) < 0.5 * this.tallas[c]) y = BASE + 0.55 * this.tallas[c];
    });
    this.destino.set(x, y, z);
  }

  /**
   * Chorro de agua: tres hilos de gotas. Cada gota sale de la boquilla en su momento y
   * baja por una curva hasta el destino, así que se sabe dónde está sin recordar nada.
   * @param riega segundos desde que se pulsó J (Infinity si no se ha pulsado)
   */
  private regar(riega: number): void {
    for (const g of this.gotas) g.visible = false;
    if (riega > PRIMERA_GOTA + CADA_GOTA * TANDAS + VUELO_GOTA) return;
    this.chorro();
    // Curva de Bézier: sale en la dirección del pitorro y cae hacia el destino
    this.curva.v0.copy(this.salida);
    this.curva.v1.copy(this.direccion).multiplyScalar(0.3).add(this.salida);
    this.curva.v2.copy(this.destino);
    this.gotas.forEach((gota, i) => {
      const tanda = Math.floor(i / 3);
      const hilo = (i % 3) - 1;
      const k = (riega - PRIMERA_GOTA - tanda * CADA_GOTA) / VUELO_GOTA;
      if (k < 0 || k > 1) return;
      gota.visible = true;
      this.curva.getPoint(k, gota.position);
      // Los hilos se abren un poco, como la alcachofa de una regadera
      gota.position.x += hilo * 0.05 * k;
      gota.position.z += hilo * 0.09 * k;
      gota.scale.set(0.055, 0.055 + 0.04 * k, 0.055);
    });
  }

  /** Lo que se mueve siempre: nubes, copas de los árboles y el espantapájaros. */
  private ambiente(v: VistaEscena, t: number): void {
    // Las nubes cruzan el cielo muy despacio y vuelven a entrar por el otro lado
    this.nubes.forEach((n, i) => (n.position.x = ((i * 17 + t * 0.3) % 64) - 32));
    this.copas.forEach((c, i) => (c.rotation.z = 0.025 * Math.sin(t * 0.9 + i * 1.7)));
    const compas = v.notas.length ? latido(v.pulso) : 0;
    this.espantapajaros.rotation.z = 0.025 * Math.sin(t * 1.1) + 0.015 * compas;
    for (const cal of this.calabazas) cal.hoja.rotation.z = 0.1 * compas;
  }

  private crearCalabazas(S: THREE.Scene, tierra: THREE.Material): void {
    const gajo = esfera(0.32, 20, 14);
    const rabito = new TuboFlexible((t) => 0.06 - 0.025 * t, 6, 8);
    rabito.colocar([0, 0.5, 0], [0.02, 0.72, 0], [0.11, 0.8, 0.02]);
    const mRabito = material(0x5f8f3a, { rugoso: 0.8 });
    const hoja = silueta(perfilHoja, 0.03, 0.015);
    const verde = material(0x4faf55, { rugoso: 0.7, pelusa: 0.3 });
    const verdeClaro = material(0x7fcf6a, { rugoso: 0.7, pelusa: 0.3 });
    const zarcillo = new TuboFlexible(() => 0.025, 8, 6);
    zarcillo.colocar([-0.45, 0.29, 0.3], [-0.85, 0.41, 0.7], [-0.6, 0.29, 1]);
    const monticulo = esfera(0.7, 24, 12);
    const colores = [0xff8c2a, 0xff9632, 0xff8c2a, 0xff9632, 0xffa23e];
    X_CALABAZA.forEach((x, i) => {
      malla(S, monticulo, tierra, [x, 0.14, Z_FILA], [0, 0, 0], [1.05, 0.35, 1]);
      const g = grupo(S, [x, BASE, Z_FILA], [0, 0.4 + i * 1.3, 0]);
      const m = material(colores[i], { rugoso: 0.45, barniz: 0.3 });
      for (let j = 0; j < 8; j++) {
        const a = (j / 8) * PI * 2;
        malla(g, gajo, m, [Math.cos(a) * 0.2, 0.3, Math.sin(a) * 0.2], [0, -a, 0], [1, 0.95, 0.72]);
      }
      malla(g, rabito.geometria, mRabito);
      // La hoja de arriba cuelga de una bisagra junto al rabito: se mece y se mustia
      const bisagra = grupo(g, [0.08, 0.52, 0.05], [0, 0.6, 0]);
      malla(bisagra, hoja, verde, [0, 0, 0], [0, 0, 0], 0.5);
      this.calabazas.push({ g, hoja: bisagra });
      // Zarcillo y hojas por el suelo, alrededor
      malla(S, zarcillo.geometria, verde, [x, 0, Z_FILA]);
      malla(S, hoja, verdeClaro, [x - 0.62, TIERRA + 0.03, Z_FILA + 0.95], [-1.3, 0.5, 0.2], 0.6);
      malla(S, hoja, verde, [x + 0.6, TIERRA + 0.03, Z_FILA + 0.6], [-1.3, -0.8, 0], 0.5);
    });
  }

  /** Hortelana con sombrero de paja, coletas y peto vaquero. */
  private crearHortelana(S: THREE.Scene): Personaje {
    const p = new Personaje(S, {
      escala: ESCALA_HORTELANA,
      piel: 0xe8a87c,
      ropa: 0xff8fa3,
      pantalon: 0x4f9f6a,
      zapatos: 0xffc93c,
      pelo: ['coletas', 0x7a4a2a],
      cejas: 0x5a3a22,
      mangaCorta: true,
      desfase: 0.8,
    });
    const cab = p.cabeza;
    const R = p.radioCabeza;
    const paja = material(0xf2cf7a, { rugoso: 0.9, textura: texturaRuido(0xf2cf7a, 0.2, [6, 2]) });
    const ladeado: V3 = [-0.22, 0, 0];
    malla(cab, cilindro(R * 1.7, R * 1.75, R * 0.07, 32), paja, [0, R * 0.52, -R * 0.05], ladeado);
    malla(cab, casquete(R * 1.02, 0.42, 32, 12), paja, [0, R * 0.22, -R * 0.05], ladeado);
    const cinta = tela(0xff6b6b);
    malla(cab, aro(R * 0.98, R * 0.07), cinta, [0, R * 0.56, -R * 0.06], [PI / 2 - 0.22, 0, 0]);
    // Peto: pechera, tirantes que pasan por los hombros y botones
    const vaquero = tela(0x4f9f6a);
    malla(p.cuerpo, caja(0.3, 0.3, 0.06, 0.03), vaquero, [0, 0.8, 0.17]);
    for (const s of [1, -1]) {
      const tirante = new TuboFlexible(() => 0.025, 6, 8);
      tirante.colocar([s * 0.11, 0.93, 0.16], [s * 0.14, 1.06, 0.06], [s * 0.12, 1, -0.14]);
      malla(p.cuerpo, tirante.geometria, vaquero);
      malla(p.cuerpo, esfera(0.025, 10, 8), material(0xffd23c, { rugoso: 0.35 }), [
        s * 0.11,
        0.92,
        0.2,
      ]);
    }
    return p;
  }

  /** Regadera de zinc verde agua. Devuelve la punta del pitorro y un punto más atrás. */
  private crearRegadera(padre: THREE.Group): [THREE.Group, THREE.Group] {
    const zinc = material(0x6fd0c8, { rugoso: 0.3, metal: 0.5, barniz: 0.6 });
    // El origen es el asa: el cuerpo queda a su derecha y el pitorro más allá
    const g = grupo(padre, [0.42, -0.02, 0]);
    malla(g, cilindro(0.24, 0.26, 0.48, 28), zinc);
    malla(g, aro(0.24, 0.025), zinc, [0, 0.24, 0], [PI / 2, 0, 0]);
    const pitorro = new TuboFlexible((t) => 0.055 - 0.015 * t, 10, 12);
    pitorro.colocar([0.2, -0.12, 0], [0.5, 0.05, 0], [0.72, 0.2, 0]);
    malla(g, pitorro.geometria, zinc);
    malla(g, cilindro(0.11, 0.05, 0.08, 20), zinc, [0.76, 0.225, 0], [0, 0, -PI / 2 + 0.6]);
    malla(g, aro(0.2, 0.03, PI), zinc, [-0.22, 0.02, 0], [0, 0, PI / 2]);
    return [grupo(g, [0.8, 0.25, 0]), grupo(g, [0.62, 0.13, 0])];
  }

  private decorado(S: THREE.Scene): void {
    // Prado, colinas y nubes
    const prado = material(0x8fd06a, {
      rugoso: 0.95,
      textura: texturaRuido(0x8fd06a, 0.12, [24, 20]),
    });
    malla(S, caja(140, 0.4, 120, 0.02), prado, [0, -0.2, -40]);
    const colinas: [number, number, number, number][] = [
      [-22, -55, 18, 0x7fc66a],
      [16, -60, 22, 0x8fd27a],
      [-2, -75, 26, 0xa3dc8a],
      [38, -50, 14, 0x7fc66a],
    ];
    const loma = esfera(1, 32, 20);
    for (const [x, z, r, c] of colinas) {
      malla(
        S,
        loma,
        material(c, { rugoso: 1 }),
        [x, -r * 0.55, z],
        [0, 0, 0],
        [1.3 * r, 0.75 * r, r],
      );
    }
    this.nubes.push(
      nube(S, [-13, 11, -45], 2.6),
      nube(S, [8, 12.5, -50], 3),
      nube(S, [22, 9.5, -46], 2),
    );

    // Árboles redondos: la copa cuelga de un grupo para que se pueda mecer
    const azar = crearAzar(19);
    const tronco = material(0x8a5a3a, { rugoso: 0.9 });
    const copas = [0x5fbf6a, 0x4fae62, 0x7fcf6a].map((c) => material(c, { rugoso: 0.9 }));
    const arboles: V3[] = [
      [-9.5, -9, 2.2],
      [-7, -13, 2.6],
      [9.5, -10, 2.4],
      [5.5, -18, 2.2],
    ];
    for (const [x, z, s] of arboles) {
      const g = grupo(S, [x, 0, z], [0, azar() * 6, 0], s);
      malla(g, cilindro(0.12, 0.17, 1.1, 14), tronco, [0, 0.55, 0]);
      const copa = grupo(g, [0, 1.0, 0]);
      const m = copas[Math.floor(azar() * 3)];
      malla(copa, esfera(0.75, 24, 18), m, [0, 0.6, 0]);
      malla(copa, esfera(0.55, 24, 18), m, [0.5, 0.3, 0.1]);
      malla(copa, esfera(0.5, 24, 18), m, [-0.5, 0.35, -0.1]);
      malla(copa, esfera(0.45, 24, 18), m, [0.1, 1.1, 0.1]);
      this.copas.push(copa);
    }

    // Cobertizo con tablas pintadas y tejado a cuatro aguas
    const cob = grupo(S, [8.6, 0, -10.5], [0, -0.35, 0]);
    const tablas = texturaMadera(0xff8f6a, 1, [8, 1]);
    tablas.rotation = PI / 2;
    const paredes = material(0xff8f6a, { rugoso: 0.8, textura: tablas });
    malla(cob, caja(3.4, 2.6, 2.8, 0.06), paredes, [0, 1.3, 0]);
    // El tejado es un cono de cuatro lados
    const tejado = material(0x5a6f9c, { rugoso: 0.7 });
    malla(cob, cilindro(0.05, 2.5, 1.5, 4), tejado, [0, 3.35, 0], [0, PI / 4, 0], [1.05, 1, 0.9]);
    malla(cob, caja(0.95, 1.7, 0.1, 0.04), material(0xfff3dc, { rugoso: 0.7 }), [-0.5, 0.86, 1.41]);
    malla(cob, caja(0.8, 0.8, 0.1, 0.04), luminoso(0xbfe8ff, 0.5), [0.85, 1.6, 1.41]);

    // Valla de estacas blancas con punta
    const palo = material(0xfff3dc, { rugoso: 0.8, textura: texturaMadera(0xfff3dc, 1, [1, 2]) });
    const estaca = silueta(perfilEstaca, 0.08, 0.02);
    for (let i = -9; i <= 9; i++) malla(S, estaca, palo, [i * 0.78, 0, -3.6]);
    for (const y of [0.45, 0.95]) malla(S, caja(15, 0.14, 0.08, 0.03), palo, [0, y, -3.66]);

    // Espantapájaros: se mece un poco con el viento y con la música
    const esp = grupo(S, [-5.2, 0, -2.6], [0, 0.3, 0]);
    this.espantapajaros = esp;
    const palitroque = material(0x8a5a3a, { rugoso: 0.9 });
    malla(esp, cilindro(0.06, 0.06, 2.6, 10), palitroque, [0, 1.3, 0]);
    malla(esp, cilindro(0.05, 0.05, 2.2, 10), palitroque, [0, 1.9, 0], [0, 0, PI / 2]);
    const camisa = tela(0x4f9fd8);
    malla(esp, caja(0.9, 1.0, 0.4, 0.15), camisa, [0, 1.6, 0]);
    for (const s of [-1, 1])
      malla(esp, capsula(0.14, 0.6), camisa, [s * 0.75, 1.9, 0], [0, 0, PI / 2]);
    malla(esp, esfera(0.38, 28, 20), tela(0xffe2a8), [0, 2.45, 0]);
    const sombrero = material(0xd9a94a, { rugoso: 0.9 });
    malla(esp, cono(0.5, 0.6, 24), sombrero, [0, 2.95, 0]);
    malla(esp, cilindro(0.7, 0.7, 0.05, 24), sombrero, [0, 2.7, 0]);
    for (const s of [-1, 1])
      malla(esp, esfera(0.05, 10, 8), material(0x3a2e4a), [s * 0.13, 2.5, 0.35]);
    malla(
      esp,
      cono(0.06, 0.2, 10),
      material(0xff8a3a, { rugoso: 0.35 }),
      [0, 2.4, 0.42],
      [PI / 2, 0, 0],
    );
  }
}

export const huerto3d: Definicion3d = {
  motor: {
    cielo: [
      [0, 0x4fb0f0],
      [0.5, 0xa8e0fa],
      [0.68, 0xe9f8d8],
      [1, 0xe9f8d8],
    ],
    niebla: [0xe3f5d6, 26, 80],
    camara: [0, 2.6, 9.4],
    mira: [0, 1.75, 0],
    angulo: 30,
    sol: { pos: [-6, 9, 5], color: 0xfff0c8, fuerza: 3.3 },
    contraluz: { pos: [6, 5, -6], color: 0xbfe8ff, fuerza: 1.2 },
    ambiente: { cielo: 0xcfeaff, suelo: 0x8fbf6a, fuerza: 0.85 },
    exposicion: 0.92,
    reflejos: 0.3,
    resplandor: 0.2,
    foco: 9.4,
    zonaSombra: 9,
  },
  crear: (motor) => new Huerto(motor),
};
