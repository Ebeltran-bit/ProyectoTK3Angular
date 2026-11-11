/**
 * Escena 3D «Paso de patitos» (media).
 *
 * Los patitos llegan en fila por el camino del parque, a saltitos, y cada uno aterriza en
 * la piedra de la orilla justo en el pulso de su nota. Cada nota se cuenta en tres tiempos:
 *  - Anticipación: mamá pata grazna un pulso antes y el patito, al llegar a la piedra,
 *    se agacha y echa las alas atrás para coger impulso.
 *  - Acción: con J (o con K si es el segundo de una pareja, el más clarito) se estira y
 *    salta el charco; el salto dura un pulso exacto.
 *  - Reacción: si se acierta, vuela con las alas abiertas dejando una estela, aterriza al
 *    otro lado y mamá lo celebra; si se falla, cae al charco con un chapuzón y se queda
 *    flotando mojado y triste.
 *
 * Como en las demás escenas, todo se calcula en cada fotograma a partir de la `VistaEscena`.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { VistaEscena } from '../escenarios/tipos';
import { arco, frenar, golpe, limitar, mezclar, parpadeo, rebote, suave, tramo } from './animacion';
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
  TuboFlexible,
  V3,
} from './formas';
import { latido, notaAcertada, ultimaJuzgada } from './golpes';
import {
  crearAzar,
  luminoso,
  material,
  plastico,
  tela,
  texturaPintada,
  texturaRuido,
} from './materiales';
import { Motor } from './motor';
import { Chispas, nube, Salpicadura } from './objetos';
import { Definicion3d, Escena3d } from './tipos';

const PI = Math.PI;

/** Centro del charco y fila por la que andan los patitos (todos van por la misma z). */
const CHARCO_X = 0.9;
const FILA_Z = 0.5;
/** La piedra de la orilla: el patito tiene que estar encima en el pulso de su nota. */
const PIEDRA_X = CHARCO_X - 2.15;
const RADIO_PIEDRA = 0.575;
/** Altura de los pies sobre el camino y sobre la piedra. */
const SUELO = 0.05;
const ALTO_PIEDRA = 0.36;
/** Unidades que avanza un patito en un pulso: dos saltitos de medio pulso. */
const AVANCE = 2.4;
const PASO = AVANCE / 2;
const SALTITO = 0.14;
/** Pulsos antes de su nota en los que el patito entra por la izquierda (fuera de cuadro). */
const APARECE = 2.25;
/** Pulsos que sigue a la vista después de su nota (al acertar sale por la derecha). */
const SE_QUEDA = 2.4;
/** Dónde aterriza al otro lado del charco y cuánto sube el salto según el juicio. */
const ATERRIZA = 2.95;
const ALTURA_PERFECT = 1.3;
const ALTURA_GREAT = 0.95;
/** Al fallar: segundos que tarda en caer al agua, dónde cae y a qué altura flota. */
const CAIDA = 0.35;
const AGUA_X = PIEDRA_X + 1.05;
const FLOTA = -0.03;
const ESCALA_PATITO = 0.92;
const ESCALA_MAMA = 1.75;
const MAMA: V3 = [CHARCO_X + 3.55, 0.02, -0.1];
/** Mamá mira hacia la izquierda (hacia la piedra) y un poco hacia la cámara. */
const GIRO_MAMA = PI + 0.5;
const AMARILLO = 0xffc91e;
/** El segundo de una pareja (tecla K) es más clarito, como en la versión plana. */
const CLARITO = 0xffe68a;

/** Lo que se le puede cambiar a un pato en cada fotograma. Se reutiliza un solo objeto. */
interface Pose {
  /** 1 normal; menos de 1 aplastado y más de 1 estirado. */
  aplastar: number;
  /** Cabeceo del cuerpo: positivo levanta el pico. */
  inclina: number;
  /** Contoneo de lado a lado. */
  balanceo: number;
  /** Alas: 0 pegadas al cuerpo, 1 levantadas. */
  alas: number;
  /** Pico: 0 cerrado, 1 abierto (cuac). */
  pico: number;
  /** Ojos: 1 abiertos; menos de 1 entornados (risa o pena); más de 1, como platos. */
  ojos: number;
  /** Patas: 0 estiradas, 1 recogidas hacia atrás (en el aire o nadando). */
  recoge: number;
  cabezaArriba: number;
  cabezaGiro: number;
  cabezaLado: number;
}

function poseNeutra(p: Pose): Pose {
  p.aplastar = 1;
  p.inclina = p.balanceo = p.alas = p.pico = p.recoge = 0;
  p.ojos = 1;
  p.cabezaArriba = p.cabezaGiro = p.cabezaLado = 0;
  return p;
}

/** Geometrías y materiales que comparten todos los patos: se crean una sola vez. */
interface PiezasPato {
  cuerpo: THREE.BufferGeometry;
  cola: THREE.BufferGeometry;
  cabeza: THREE.BufferGeometry;
  copete: THREE.BufferGeometry;
  picoArriba: THREE.BufferGeometry;
  picoAbajo: THREE.BufferGeometry;
  boca: THREE.BufferGeometry;
  blanco: THREE.BufferGeometry;
  pupila: THREE.BufferGeometry;
  brillo: THREE.BufferGeometry;
  mejilla: THREE.BufferGeometry;
  ala: THREE.BufferGeometry;
  pata: THREE.BufferGeometry;
  pie: THREE.BufferGeometry;
  mNaranja: THREE.Material;
  mBoca: THREE.Material;
  mBlanco: THREE.Material;
  mPupila: THREE.Material;
  mBrillo: THREE.Material;
  mMejilla: THREE.Material;
}

function piezasPato(): PiezasPato {
  // Cuerpo en forma de gota, con la cola levantada hacia atrás (el pato mira hacia +X)
  const cuerpo = deformar(esfera(0.3, 32, 24), (v) => {
    const t = v.x / 0.3;
    v.x *= 1.3;
    if (t < 0) {
      v.y += -t * 0.1 * (1 + t * 0.2);
      v.y *= 1 + t * 0.2;
      v.z *= 1 + t * 0.3;
    }
    v.y *= 0.92;
  });
  return {
    cuerpo,
    cola: cono(0.09, 0.2, 14),
    cabeza: esfera(0.25, 32, 24),
    copete: cono(0.035, 0.12, 8),
    picoArriba: esfera(0.13, 20, 14),
    picoAbajo: esfera(0.12, 20, 14),
    boca: esfera(0.07, 12, 8),
    blanco: esfera(0.07, 16, 12),
    pupila: esfera(0.054, 16, 12),
    brillo: esfera(0.016, 8, 6),
    mejilla: new THREE.CircleGeometry(0.045, 16),
    ala: esfera(0.2, 20, 14),
    pata: cilindro(0.022, 0.022, 0.18, 8),
    pie: esfera(0.075, 14, 10),
    mNaranja: plastico(0xff8a2a),
    mBoca: material(0xd9443f, { rugoso: 0.6 }),
    mBlanco: material(0xffffff, { rugoso: 0.15, barniz: 1 }),
    mPupila: material(0x1d1626, { rugoso: 0.2, barniz: 1 }),
    mBrillo: luminoso(0xffffff, 1),
    mMejilla: material(0xff8f8f, { opacidad: 0.5, rugoso: 1 }),
  };
}

/**
 * Pato de dibujos animados mirando hacia +X, con los pies en el origen. Es una pieza
 * blanda: la cabeza se hunde un poco en el cuerpo y las alas y las patas nacen dentro de
 * él, así no se ven huecos al moverlas. Mamá pata es el mismo pato, más grande y con lazo.
 */
class Pato {
  /** Raíz: posición, giro y tamaño. */
  readonly g: THREE.Group;
  /** Lo que se aplasta y se inclina (todo menos la raíz). */
  private readonly cuerpo: THREE.Group;
  private readonly cabeza: THREE.Group;
  private readonly plumas: THREE.Mesh[] = [];
  private readonly picoArriba: THREE.Mesh;
  private readonly picoAbajo: THREE.Mesh;
  private readonly boca: THREE.Mesh;
  private readonly ojos: THREE.Group[] = [];
  private readonly alas: THREE.Group[] = [];
  private readonly patas: THREE.Group[] = [];

  constructor(padre: THREE.Object3D, p: PiezasPato, pluma: THREE.Material, lazo = false) {
    this.g = grupo(padre);
    this.cuerpo = grupo(this.g);
    const c = this.cuerpo;
    this.plumas.push(
      malla(c, p.cuerpo, pluma, [0, 0.36, 0]),
      malla(c, p.cola, pluma, [-0.44, 0.5, 0], [0, 0, 1.0]),
    );
    this.cabeza = grupo(c, [0.26, 0.78, 0]);
    const cab = this.cabeza;
    this.plumas.push(
      malla(cab, p.cabeza, pluma),
      malla(cab, p.copete, pluma, [-0.03, 0.27, 0], [0, 0, 0.5]),
    );
    // Pico plano de dos piezas que se separan al graznar; la boca solo se ve abierta
    this.picoArriba = malla(
      cab,
      p.picoArriba,
      p.mNaranja,
      [0, 0, 0],
      [0, 0, 0],
      [1.25, 0.32, 0.95],
    );
    this.picoAbajo = malla(cab, p.picoAbajo, p.mNaranja, [0, 0, 0], [0, 0, 0], [1.1, 0.26, 0.85]);
    this.boca = malla(cab, p.boca, p.mBoca, [0.24, -0.05, 0], [0, 0, 0], [1, 0.6, 0.8]);
    this.pico(0);

    for (const s of [1, -1]) {
      // Cada ojo cuelga de su grupo: al parpadear se aplasta en vertical
      const ojo = grupo(cab, [0.14, 0.07, s * 0.15]);
      const giro: V3 = [0, s * -0.55, 0];
      malla(ojo, p.blanco, p.mBlanco, [0, 0, 0], giro, [0.6, 1.15, 1]);
      malla(ojo, p.pupila, p.mPupila, [0.028, 0, s * 0.018], giro, [0.6, 1.15, 1]);
      malla(ojo, p.brillo, p.mBrillo, [0.056, 0.022, s * 0.032]).castShadow = false;
      this.ojos.push(ojo);
      // Coloretes: un círculo plano pegado a la mejilla, mirando hacia fuera
      const mejilla = malla(
        cab,
        p.mejilla,
        p.mMejilla,
        [0.13, -0.06, s * 0.215],
        [0, s > 0 ? PI / 2 - 0.5 : PI / 2 + 0.5, 0],
      );
      mejilla.castShadow = false;

      // El ala gira desde el hombro, que queda dentro del cuerpo
      const ala = grupo(c, [-0.04, 0.5, s * 0.2]);
      this.plumas.push(
        malla(ala, p.ala, pluma, [0, -0.08, s * 0.07], [0, 0, -0.25], [1.1, 0.62, 0.3]),
      );
      this.alas.push(ala);

      // La pata gira desde la cadera: estirada en el suelo, recogida en el aire
      const pata = grupo(c, [0.02, 0.17, s * 0.1]);
      malla(pata, p.pata, p.mNaranja, [0, -0.08, 0]);
      malla(pata, p.pie, p.mNaranja, [0.06, -0.155, 0], [0, 0, 0], [1.3, 0.25, 1]);
      this.patas.push(pata);
    }

    if (lazo) {
      for (const s of [1, -1])
        malla(
          cab,
          esfera(0.1, 16, 12),
          tela(0xff6b8f),
          [-0.02, 0.26, s * 0.1],
          [s * 0.5, 0, 0],
          [0.6, 0.8, 1.1],
        );
      malla(cab, esfera(0.05, 12, 8), tela(0xff4f7a), [-0.02, 0.25, 0]);
    }
  }

  /** Cambia el color de las plumas (el amarillo o el clarito). */
  vestir(pluma: THREE.Material): void {
    for (const m of this.plumas) m.material = pluma;
  }

  private pico(abierto: number): void {
    const a = 0.04 + 0.28 * abierto;
    this.picoArriba.position.set(0.27, -0.03 + a * 0.08, 0);
    this.picoArriba.rotation.z = a;
    this.picoAbajo.position.set(0.25, -0.07 - a * 0.1, 0);
    this.picoAbajo.rotation.z = -a;
    this.boca.visible = abierto > 0.15;
  }

  /** @param cierre parpadeo: 0 ojos abiertos, 1 cerrados */
  posar(p: Pose, cierre: number): void {
    // Al aplastarse se ensancha lo mismo que se achata, para que no pierda volumen
    const ancho = 1 / Math.sqrt(p.aplastar);
    this.cuerpo.scale.set(ancho, p.aplastar, ancho);
    this.cuerpo.rotation.set(p.balanceo, 0, p.inclina);
    this.cabeza.rotation.set(p.cabezaLado, p.cabezaGiro, p.cabezaArriba);
    this.pico(p.pico);
    const tamano = Math.max(1, p.ojos);
    const abiertos = Math.max(0.08, Math.min(1, p.ojos) * (1 - cierre));
    for (const ojo of this.ojos) ojo.scale.set(tamano, abiertos * tamano, tamano);
    this.alas.forEach((ala, i) => {
      const s = i === 0 ? 1 : -1;
      ala.rotation.set(-s * p.alas * 1.2, 0, p.alas * 0.3);
    });
    for (const pata of this.patas) pata.rotation.z = -0.9 * p.recoge;
  }
}

/** Arco del salto sobre el charco: dónde está el patito cuando lleva `k` (0 a 1) del salto. */
function enSalto(k: number, altura: number, destino: THREE.Vector3): THREE.Vector3 {
  return destino.set(
    mezclar(PIEDRA_X, ATERRIZA, k),
    mezclar(ALTO_PIEDRA, SUELO, k) + arco(k) * altura,
    FILA_Z,
  );
}

/** Altura del suelo en x: el camino es plano y la piedra hace de montículo. */
function suelo(x: number): number {
  const d = (x - PIEDRA_X) / RADIO_PIEDRA;
  return SUELO + Math.max(0, 1 - d * d) * (ALTO_PIEDRA - SUELO);
}

class Patitos implements Escena3d {
  readonly palabra: Escena3d['palabra'];
  /** Seis patitos que se van turnando: nunca hay más de seis notas a la vista. */
  private readonly patitos: Pato[] = [];
  private readonly mama: Pato;
  private readonly mAmarillo: THREE.Material;
  private readonly mClarito: THREE.Material;
  /** Dos estelas de puntos de luz, para que dos patitos seguidos puedan estar en el aire. */
  private readonly estelas: THREE.Mesh[][] = [];
  private readonly chispas: Chispas;
  private readonly salpicadura: Salpicadura;
  private readonly aroPiedra: THREE.MeshStandardMaterial;
  private readonly ondas: { m: THREE.Mesh; mat: THREE.MeshStandardMaterial; radio: number }[] = [];
  private readonly juncos: THREE.Group[] = [];
  private readonly flores: THREE.Group[] = [];
  private readonly nenufares: THREE.Group[] = [];
  private readonly nubes: THREE.Group[] = [];
  private readonly pose = poseNeutra({} as Pose);
  // Puntos de trabajo: se reutilizan para no crear objetos nuevos en cada fotograma
  private readonly punto = new THREE.Vector3();
  private readonly mira = new THREE.Vector3();
  private readonly centroChispas = new THREE.Vector3();

  constructor(motor: Motor) {
    const S = motor.escena;
    this.palabra = {
      ...motor.proyectar([PIEDRA_X - 0.45, 2.3, FILA_Z]),
      aciertos: ['¡Hop!', '¡Boing!', '¡Hup!'],
    };
    this.decorado(S);

    const piezas = piezasPato();
    const pluma = (color: number) =>
      material(color, { rugoso: 0.75, pelusa: 0.25, colorPelusa: 0xfff2b0 });
    this.mAmarillo = pluma(AMARILLO);
    this.mClarito = pluma(CLARITO);
    for (let i = 0; i < 6; i++) this.patitos.push(new Pato(S, piezas, this.mAmarillo));
    this.mama = new Pato(S, piezas, pluma(0xfff0d2), true);
    this.mama.g.position.set(...MAMA);
    this.mama.g.rotation.y = GIRO_MAMA;
    this.mama.g.scale.setScalar(ESCALA_MAMA);

    const bola = esfera(1, 10, 8);
    const luz = luminoso(0xffffff, 1.3);
    for (let e = 0; e < 2; e++) {
      const puntos: THREE.Mesh[] = [];
      for (let j = 0; j < 8; j++) puntos.push(sinSombra(malla(S, bola, luz)));
      this.estelas.push(puntos);
    }
    this.chispas = new Chispas(S, 10, [0xffd23c, 0xffffff, 0x7cf2c0]);
    enSalto(0.4, ALTURA_PERFECT, this.centroChispas).add(new THREE.Vector3(0, 0.6, 0.4));
    this.salpicadura = new Salpicadura(S, AGUA_X, FILA_Z, 1.8);

    // Piedra de salto con su aro de luz: es la marca donde hay que pulsar
    malla(
      S,
      deformar(esfera(0.5, 24, 16), (v) => {
        v.y = Math.max(v.y, -0.1) * 0.55;
        v.x *= 1.15;
      }),
      material(0x9a98a8, { rugoso: 0.85, textura: texturaRuido(0x9a98a8, 0.25, [2, 2]) }),
      [PIEDRA_X, 0.1, FILA_Z],
    );
    this.aroPiedra = luminoso(0xffe58a, 2);
    sinSombra(
      malla(
        S,
        aro(0.66, 0.045),
        this.aroPiedra,
        [PIEDRA_X, 0.08, FILA_Z],
        [PI / 2, 0, 0],
        [1.1, 0.8, 1],
      ),
    );
  }

  actualizar(v: VistaEscena, reloj: number, dt: number): void {
    const pulsoASegundos = 60 / v.bpm;
    this.ambiente(v, reloj);
    for (const p of this.patitos) p.g.visible = false;
    for (const e of this.estelas) for (const m of e) m.visible = false;
    if (v.notas.length === 0) {
      this.enReposo(reloj);
      this.moverMama(v, reloj, 0, null);
      return;
    }

    /** El patito que está más cerca de la piedra: mamá no le quita ojo. */
    let vigilado: Pato | null = null;
    let faltaVigilado = Infinity;
    /** Cuánto grazna mamá: un pulso antes de cada nota, como el ¡CUAC! de la versión plana. */
    let grazna = 0;
    /** Cuánto se ilumina el aro de la piedra cuando un patito está a punto de pisarla. */
    let llega = 0;
    let chapuzon = -1;
    v.notas.forEach((nota, i) => {
      const falta = nota.pulso - v.pulso;
      grazna = Math.max(grazna, arco(tramo(falta, 1.02, 0.58)));
      if (falta > APARECE || falta < -SE_QUEDA) return;
      const pato = this.patitos[i % this.patitos.length];
      pato.g.visible = true;
      pato.g.scale.setScalar(ESCALA_PATITO);
      pato.g.rotation.y = 0;
      pato.vestir(v.teclas[i] === 'alterna' ? this.mClarito : this.mAmarillo);
      const cierre = parpadeo(reloj, 3.1, i * 0.83);
      if (falta > 0 || nota.juicio === null) {
        this.acercarse(pato, falta, reloj, i, cierre);
        llega = Math.max(llega, 1 - limitar(Math.abs(falta) / 0.6));
      } else if (nota.juicio === 'miss') {
        // Sin pulsar, la nota no se da por fallada hasta que pasa la ventana de 90 ms
        const hace = Math.max(0, -falta * pulsoASegundos - 0.09);
        this.caer(pato, hace, -falta, reloj, cierre);
        chapuzon = hace - CAIDA;
      } else {
        const perfecto = nota.juicio === 'perfect';
        this.saltar(pato, -falta, perfecto, reloj, cierre, pulsoASegundos);
        this.estela(this.estelas[i % 2], -falta, perfecto ? ALTURA_PERFECT : ALTURA_GREAT);
      }
      if (falta > -0.8 && Math.abs(falta) < faltaVigilado) {
        faltaVigilado = Math.abs(falta);
        vigilado = pato;
      }
    });

    // El aro de la piedra brilla más cuanto más cerca está un patito de pisarla
    this.aroPiedra.emissiveIntensity = 1.2 + 2.2 * llega * llega;
    const acertada = notaAcertada(v);
    const perfecta = acertada !== null && v.notas[acertada].juicio === 'perfect';
    this.chispas.actualizar(
      this.centroChispas,
      acertada === null ? -1 : v.desdePulsacion,
      perfecta ? 1.6 : 1.1,
    );
    this.salpicadura.actualizar(chapuzon);
    this.moverMama(v, reloj, grazna, vigilado);
  }

  /**
   * El patito viene a saltitos de medio pulso, a velocidad constante, y el último saltito
   * lo deja encima de la piedra justo en el pulso de su nota.
   */
  private acercarse(pato: Pato, falta: number, reloj: number, i: number, cierre: number): void {
    const p = poseNeutra(this.pose);
    const x = PIEDRA_X - Math.max(0, falta) * AVANCE;
    // Medios pulsos que le quedan: la parte decimal dice cuánto lleva del saltito actual
    const medios = Math.max(0, falta) * 2;
    const avance = falta > 0 ? 1 - (medios - Math.floor(medios)) : 1;
    this.brincar(pato, p, x, FILA_Z, avance, Math.floor(medios));
    // Anticipación: al llegar a la piedra se agacha y echa las alas atrás
    const impulso = suave(tramo(falta, 0.22, 0));
    p.aplastar = mezclar(p.aplastar, 0.88, impulso);
    p.alas = mezclar(p.alas, 0.35, impulso);
    p.cabezaArriba = mezclar(0.04 * Math.sin(reloj * 2 + i), -0.18, impulso);
    // Si se le pasa el pulso sin juicio todavía (un GREAT tardío), se tambalea en el borde
    if (falta <= 0) p.balanceo = 0.08 * Math.sin(reloj * 26);
    pato.posar(p, cierre);
  }

  /** Coloca un patito en mitad de un saltito: `avance` va de 0 (despega) a 1 (aterriza). */
  private brincar(pato: Pato, p: Pose, x: number, z: number, avance: number, paso: number): void {
    const desde = x - avance * PASO;
    const y = mezclar(suelo(desde), suelo(desde + PASO), avance) + arco(avance) * SALTITO;
    pato.g.position.set(x, y, z);
    // Se aplasta al tocar el suelo, se estira en el aire y se contonea a cada paso
    const tocando = 1 - limitar(Math.min(avance, 1 - avance) / 0.15);
    p.aplastar = 1 - 0.14 * tocando + 0.06 * arco(avance);
    p.inclina = 0.14 * (0.5 - avance);
    p.balanceo = (paso % 2 ? 0.07 : -0.07) * arco(avance);
    p.alas = 0.08 + 0.22 * arco(avance);
    p.recoge = 0.6 * arco(avance);
  }

  /** Acierto: se estira, salta el charco en un pulso y sigue a saltitos hacia la derecha. */
  private saltar(
    pato: Pato,
    hace: number,
    perfecto: boolean,
    reloj: number,
    cierre: number,
    pulsoASegundos: number,
  ): void {
    const p = poseNeutra(this.pose);
    const segundos = hace * pulsoASegundos;
    if (hace < 1) {
      enSalto(hace, perfecto ? ALTURA_PERFECT : ALTURA_GREAT, pato.g.position);
      // Acción: del agachado al estirón en 0,1 s; luego vuelve a su forma en el aire
      const estiron = segundos < 0.1 ? frenar(segundos / 0.1) : 1 - tramo(segundos, 0.1, 0.3);
      p.aplastar = segundos < 0.1 ? mezclar(0.84, 1.22, estiron) : 1 + 0.22 * estiron;
      p.inclina = 0.45 * (1 - 2 * hace);
      const aleteo = Math.sin(reloj * 32) * 0.18;
      p.alas = (perfecto ? 0.95 : 0.6) + aleteo;
      p.recoge = 1 - tramo(hace, 0.75, 0.95);
      p.cabezaArriba = mezclar(0.25, -0.15, hace);
      p.pico = perfecto ? arco(tramo(hace, 0.1, 0.7)) * 0.7 : 0;
      p.ojos = perfecto ? 0.55 : 1;
    } else {
      // Ya al otro lado: se aleja a saltitos, girándose un poco hacia la cámara, contento
      const despues = hace - 1;
      const medios = despues * 2;
      const giro = suave(tramo(despues, 0, 0.8));
      this.brincar(
        pato,
        p,
        ATERRIZA + despues * AVANCE,
        mezclar(FILA_Z, 0.85, giro),
        medios - Math.floor(medios),
        Math.floor(medios),
      );
      pato.g.rotation.y = -0.3 * giro;
      p.aplastar -= 0.08 * golpe(despues * pulsoASegundos, 0.2);
      p.cabezaGiro = -0.45 * giro;
      p.ojos = 0.6;
    }
    pato.posar(p, cierre);
  }

  /** Fallo: se cae de cabeza al charco, chapotea y se queda flotando, mojado y triste. */
  private caer(pato: Pato, segundos: number, hace: number, reloj: number, cierre: number): void {
    const p = poseNeutra(this.pose);
    const k = limitar(segundos / CAIDA);
    p.recoge = 1;
    if (k < 1) {
      pato.g.position.set(
        mezclar(PIEDRA_X, AGUA_X, k),
        mezclar(ALTO_PIEDRA, FLOTA, k * k) + arco(k) * 0.25,
        FILA_Z,
      );
      p.inclina = -1.0 * Math.sin(k * PI);
      p.alas = 0.9 + Math.sin(reloj * 40) * 0.25;
      p.ojos = 1.25;
      p.pico = 0.6;
    } else {
      const flotando = segundos - CAIDA;
      pato.g.position.set(AGUA_X + flotando * 0.45, FLOTA + 0.02 * Math.sin(reloj * 5), FILA_Z);
      // Primero chapotea asustado y luego se queda cabizbajo
      const chapotea = golpe(flotando, 0.6);
      p.alas = 0.15 + chapotea * (0.6 + Math.sin(reloj * 36) * 0.3);
      p.balanceo = 0.12 * chapotea * Math.sin(flotando * 22);
      p.aplastar = 1 - 0.18 * golpe(flotando, 0.25);
      p.cabezaArriba = -0.45 * suave(tramo(flotando, 0.2, 0.6));
      p.cabezaGiro = 0.35 * suave(tramo(flotando, 0.2, 0.6));
      p.ojos = mezclar(1.2, 0.5, tramo(flotando, 0, 0.5));
    }
    // Al final se encoge hasta desaparecer, para dejar sitio al siguiente
    pato.g.scale.setScalar(ESCALA_PATITO * (1 - suave(tramo(hace, SE_QUEDA - 0.4, SE_QUEDA))));
    pato.posar(p, cierre);
  }

  /** Puntos de luz que siguen el arco del salto por detrás del patito y se apagan al aterrizar. */
  private estela(puntos: THREE.Mesh[], hace: number, altura: number): void {
    const apaga = 1 - tramo(hace, 1, 1.4);
    if (apaga <= 0) return;
    puntos.forEach((m, j) => {
      const k = Math.min(hace, 1) - 0.07 * (j + 1);
      m.visible = k > 0;
      if (!m.visible) return;
      enSalto(k, altura, m.position);
      m.position.x -= 0.2;
      m.position.y += 0.3;
      m.scale.setScalar((0.05 - j * 0.0035) * apaga);
    });
  }

  /** Antes de la canción: tres patitos esperan en fila y otro ya está junto a mamá. */
  private enReposo(reloj: number): void {
    const sitios: [number, number, number][] = [
      [PIEDRA_X - 1.55, FILA_Z - 0.05, 0],
      [PIEDRA_X - 2.85, FILA_Z, 0],
      [PIEDRA_X - 4.1, FILA_Z - 0.05, 0],
      [CHARCO_X + 2.25, 0.75, -0.3],
    ];
    sitios.forEach(([x, z, giro], i) => {
      const pato = this.patitos[i];
      const p = poseNeutra(this.pose);
      pato.g.visible = true;
      pato.g.position.set(x, SUELO, z);
      pato.g.rotation.y = giro;
      pato.g.scale.setScalar(ESCALA_PATITO);
      pato.vestir(this.mAmarillo);
      // Respiran, cabecean a su aire y de vez en cuando miran a la cámara
      p.aplastar = 1 + 0.02 * Math.sin(reloj * 2.6 + i * 1.3);
      p.cabezaArriba = 0.08 * Math.sin(reloj * 1.1 + i * 2);
      p.cabezaGiro = -0.5 * suave(limitar(Math.sin(reloj * 0.4 + i * 1.7) * 2));
      pato.posar(p, parpadeo(reloj, 3.1, i * 0.83));
    });
  }

  /**
   * Mamá pata: marca el compás, grazna un pulso antes de cada patito, lo sigue con la
   * mirada y reacciona al juicio (aletea de alegría o se lleva un susto).
   */
  private moverMama(v: VistaEscena, reloj: number, grazna: number, vigilado: Pato | null): void {
    const m = this.mama;
    const p = poseNeutra(this.pose);
    const compas = v.notas.length ? latido(v.pulso) : 0.5 + 0.5 * Math.sin(reloj * 2.5);
    p.aplastar = 1 - 0.03 * compas + 0.06 * grazna + 0.015 * Math.sin(reloj * 2.2);
    p.cabezaArriba = 0.3 * grazna - 0.07 * compas;
    p.pico = grazna;
    p.alas = 0.12 + 0.25 * grazna;

    // Gira la cabeza hacia el patito vigilado (o hacia la piedra), sin pasarse
    if (vigilado) this.mira.copy(vigilado.g.position);
    else this.mira.set(PIEDRA_X, 0, FILA_Z);
    const rumbo = Math.atan2(-(this.mira.z - MAMA[2]), this.mira.x - MAMA[0]);
    let giro = rumbo - GIRO_MAMA;
    giro = Math.atan2(Math.sin(giro), Math.cos(giro));
    p.cabezaGiro = limitar(giro, -0.7, 0.7);
    p.cabezaArriba += limitar((this.mira.y - 0.6) * 0.12, -0.1, 0.2);

    // Reacción al último juicio
    const juzgada = ultimaJuzgada(v, 1.4);
    const hace = juzgada ? (juzgada.hace * 60) / v.bpm : Infinity;
    let altura = 0;
    if (juzgada && juzgada.juicio !== 'miss') {
      const perfecto = juzgada.juicio === 'perfect';
      const alegria = suave(tramo(hace, 0, 0.1)) * (1 - suave(tramo(hace, 0.5, 0.8)));
      altura = perfecto ? arco(tramo(hace, 0.05, 0.4)) * 0.12 : 0;
      p.alas += alegria * ((perfecto ? 0.75 : 0.35) + Math.sin(reloj * 24) * 0.15);
      p.ojos = 1 - 0.45 * alegria;
      p.pico = Math.max(p.pico, 0.5 * alegria);
      p.cabezaArriba += perfecto ? 0.15 * alegria : -0.2 * arco(tramo(hace, 0, 0.35));
    } else if (juzgada) {
      // Susto: se echa atrás con las alas arriba, niega con la cabeza y se queda apenada
      const susto = rebote(tramo(hace, 0, 0.2)) * (1 - tramo(hace, 0.6, 0.9));
      p.inclina = 0.12 * susto;
      p.alas += 0.65 * susto;
      p.ojos = 1 + 0.3 * susto - 0.35 * tramo(hace, 0.6, 0.9);
      p.cabezaGiro += Math.sin(hace * 18) * 0.3 * golpe(hace - 0.25, 0.6);
      p.cabezaArriba -= 0.15 * tramo(hace, 0.5, 0.8);
    }
    // Pulsar cuando no viene ningún patito: ladea la cabeza, extrañada
    const fallido = juzgada !== null && juzgada.juicio === 'miss' && hace < 0.8;
    if (notaAcertada(v) === null && !fallido) {
      p.cabezaLado = -0.3 * arco(tramo(v.desdePulsacion, 0, 0.7));
    }
    m.g.position.y = MAMA[1] + altura;
    m.posar(p, parpadeo(reloj, 4.1, 1.3));
  }

  /** Lo que se mueve siempre: nubes, juncos, ondas del charco, nenúfares y flores al compás. */
  private ambiente(v: VistaEscena, t: number): void {
    this.nubes.forEach((n, i) => {
      n.position.x = ((((i * 21 + t * 0.25) % 60) + 60) % 60) - 30;
    });
    this.juncos.forEach((j, i) => {
      j.rotation.z = 0.05 * Math.sin(t * 1.3 + i * 1.7);
    });
    this.ondas.forEach((o, i) => {
      // Cada onda se abre y se desvanece, y vuelve a empezar desde el centro
      const fase = (((t * 0.4 + i / 3) % 1) + 1) % 1;
      const r = o.radio * (0.55 + 0.75 * fase);
      o.m.scale.set(r * 1.2, r * 0.8, 1);
      o.mat.opacity = 0.75 * (1 - fase) * Math.min(1, fase * 6);
    });
    this.nenufares.forEach((n, i) => {
      n.rotation.y = 0.15 * Math.sin(t * 0.5 + i * 2);
    });
    const compas = v.notas.length ? latido(v.pulso) : 0;
    this.flores.forEach((f, i) => {
      f.rotation.z = (i % 2 ? 1 : -1) * (0.1 * compas + 0.04 * Math.sin(t * 1.5 + i));
    });
  }

  private decorado(S: THREE.Scene): void {
    // Prado, colinas, nubes y arcoíris al fondo
    const prado = material(0x95d872, {
      rugoso: 0.95,
      textura: texturaRuido(0x95d872, 0.12, [26, 22]),
    });
    malla(S, caja(140, 0.4, 120, 0.02), prado, [0, -0.2, -40]);
    const loma = esfera(1, 32, 20);
    const colinas: [number, number, number, number][] = [
      [-24, -55, 18, 0x7fc66a],
      [14, -62, 24, 0x93d57c],
      [40, -50, 15, 0x7fc66a],
    ];
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
    this.nubes.push(nube(S, [-14, 11, -45], 2.6), nube(S, [10, 12.5, -50], 3));
    ['#ff6b6b', '#ffa94d', '#ffd23c', '#7cf2c0', '#5aa0c8', '#b58cff'].forEach((c, i) => {
      const mat = new THREE.MeshBasicMaterial({
        color: c,
        transparent: true,
        opacity: 0.5,
        fog: false,
      });
      const banda = new THREE.TorusGeometry(15 - i * 0.7, 0.36, 8, 80, PI);
      sinSombra(malla(S, banda, mat, [10, -2, -58]));
    });
    const azar = crearAzar(13);
    const arboles: [number, number, number][] = [
      [-10, -10, 2.3],
      [-6.5, -15, 2.7],
      [10.5, -11, 2.5],
      [14, -9, 2.0],
      [-15, -18, 2.4],
    ];
    const tronco = material(0x8a5a3a, { rugoso: 0.9 });
    const copas = [0x5fbf6a, 0x4fae62, 0x7fcf6a].map((c) =>
      material(c, { rugoso: 0.9, pelusa: 0.3 }),
    );
    const geoTronco = cilindro(0.12, 0.17, 1.1, 14);
    const bolaCopa = esfera(1, 24, 18);
    for (const [x, z, s] of arboles) {
      const g = grupo(S, [x, 0, z], [0, azar() * 6, 0], s);
      malla(g, geoTronco, tronco, [0, 0.55, 0]);
      const copa = copas[Math.floor(azar() * 3)];
      const bolas: [number, number, number, number][] = [
        [0, 1.6, 0, 0.75],
        [0.5, 1.3, 0.1, 0.55],
        [-0.5, 1.35, -0.1, 0.5],
        [0.1, 2.1, 0.1, 0.45],
      ];
      for (const [bx, by, bz, r] of bolas) malla(g, bolaCopa, copa, [bx, by, bz], [0, 0, 0], r);
    }

    // Camino de tierra por el que desfilan los patitos
    malla(
      S,
      caja(40, 0.1, 2.6, 0.04),
      material(0xf0d6a4, { rugoso: 1, textura: texturaRuido(0xe3c48f, 0.2, [10, 1]) }),
      [0, 0, 0.4],
    );

    // Charco: borde de barro, agua con brillo, ondas y nenúfares
    malla(
      S,
      esfera(1.9, 32, 16),
      material(0xb98f5e, { rugoso: 1 }),
      [CHARCO_X, -0.02, 0.5],
      [0, 0, 0],
      [1.05, 0.06, 0.8],
    );
    malla(
      S,
      cilindro(1.65, 1.65, 0.05, 32),
      material(0x58c4e8, { rugoso: 0.08, barniz: 1, barnizRugoso: 0.05, metal: 0.1 }),
      [CHARCO_X, 0.09, 0.5],
      [0, 0, 0],
      [1.05, 1, 0.78],
    );
    const geoOnda = aro(1, 0.03);
    const ondas: [number, number, number][] = [
      [0.85, 0.3, 0.2],
      [0.6, 0.3, 0.2],
      [0.35, -1.0, -0.3],
    ];
    for (const [radio, x, z] of ondas) {
      const mat = material(0xffffff, { rugoso: 0.4, opacidad: 0.75 });
      const m = sinSombra(malla(S, geoOnda, mat, [CHARCO_X + x, 0.125, 0.5 + z], [PI / 2, 0, 0]));
      this.ondas.push({ m, mat, radio });
    }
    const hoja = material(0x4faf55, { rugoso: 0.6 });
    const nenufares: [number, number, number][] = [
      [1.4, -0.75, 1],
      [-0.9, 0.85, 0.8],
    ];
    for (const [x, z, s] of nenufares) {
      const g = grupo(S, [CHARCO_X + x, 0.13, 0.5 + z], [0, 0, 0], s);
      malla(g, new THREE.CylinderGeometry(0.3, 0.3, 0.03, 20, 1, false, 0.4, PI * 1.8), hoja);
      if (s === 1) malla(g, corona(0.09, 6, 0.08, [0.6, 1, 0.6]), plastico(0xff9fc0), [0, 0.07, 0]);
      this.nenufares.push(g);
    }

    // Juncos al fondo del charco, que se mecen con el viento
    const tallo = material(0x4f9f55, { rugoso: 0.8 });
    const hojaJunco = material(0x5fb565, { rugoso: 0.8, dobleCara: true });
    const espiga = material(0x7a4a2a, { rugoso: 0.9 });
    const juncos: [number, number, number][] = [
      [0.4, -0.9, 1.9],
      [0.9, -1.1, 1.5],
      [1.4, -0.95, 2.1],
      [-0.5, -1.15, 1.6],
      [2.0, -1.2, 1.4],
    ];
    for (const [x, z, h] of juncos)
      this.juncos.push(junco(S, CHARCO_X + x, z, h, tallo, hojaJunco, espiga));

    // Setas, flores y cartel
    seta(S, -4.6, 2.2, 1.5, 0xff6b6b);
    seta(S, -3.9, 2.5, 1.0, 0xffa94d);
    seta(S, 4.6, 2.2, 1.3, 0xff6b6b);
    const geoTallo = cilindro(0.02, 0.02, 0.4, 6);
    const geoPetalos = corona(0.075, 6, 0.1, [1, 0.5, 1]);
    const geoBoton = esfera(0.065, 12, 8);
    const mTallo = material(0x4faf55);
    const mBoton = material(0xffc93c, { rugoso: 0.6 });
    const flores: [number, number, number][] = [
      [-2.6, 2.2, 0xffffff],
      [-1.7, 2.5, 0xff8fa3],
      [0.3, 2.3, 0xffd23c],
      [3.4, 2.4, 0xffffff],
      [4.6, 2.1, 0xb58cff],
      [-6.6, -1.6, 0xffd23c],
      [-3.6, -1.9, 0xff8fa3],
      [6.7, -1.8, 0xffffff],
    ];
    for (const [x, z, c] of flores) {
      // La flor se inclina desde el pie del tallo, así se mece entera
      const f = grupo(S, [x, 0, z]);
      malla(f, geoTallo, mTallo, [0, 0.2, 0]);
      malla(f, geoPetalos, material(c, { rugoso: 0.6 }), [0, 0.42, 0]);
      malla(f, geoBoton, mBoton, [0, 0.45, 0], [0, 0, 0], [1, 0.6, 1]);
      this.flores.push(f);
    }
    cartel(S);
  }
}

/** Corona de `n` bolitas aplastadas en círculo, unidas en una sola pieza (pétalos, lunares). */
function corona(radio: number, n: number, separacion: number, forma: V3): THREE.BufferGeometry {
  const piezas: THREE.BufferGeometry[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2;
    piezas.push(
      esfera(radio, 12, 8)
        .scale(...forma)
        .translate(Math.cos(a) * separacion, 0, Math.sin(a) * separacion),
    );
  }
  return mergeGeometries(piezas);
}

/** Junco: tallo curvo con su espiga marrón y dos hojas largas. El grupo nace en el suelo. */
function junco(
  padre: THREE.Object3D,
  x: number,
  z: number,
  alto: number,
  mTallo: THREE.Material,
  mHoja: THREE.Material,
  mEspiga: THREE.Material,
): THREE.Group {
  const g = grupo(padre, [x, 0, z]);
  const tallo = new TuboFlexible((t) => mezclar(0.025, 0.02, t), 8, 8);
  tallo.colocar([0, 0, 0], [0.02, alto / 2, 0], [0.12, alto, 0]);
  malla(g, tallo.geometria, mTallo);
  malla(g, capsula(0.07, 0.3, 12), mEspiga, [0.12, alto + 0.1, 0], [0, 0, -0.1]);
  for (const s of [1, -1]) {
    const hoja = new TuboFlexible((t) => mezclar(0.03, 0.008, t), 10, 8, 0.3);
    hoja.colocar([0, 0, 0], [s * 0.15, alto * 0.49, 0.05], [s * 0.5, alto * 0.62, 0.1]);
    malla(g, hoja.geometria, mHoja);
  }
  return g;
}

/** Seta de sombrero rojo (o naranja) con lunares blancos. */
function seta(padre: THREE.Object3D, x: number, z: number, escala: number, color: number): void {
  const g = grupo(padre, [x, 0, z], [0, 0, 0], escala);
  malla(g, cilindro(0.07, 0.1, 0.3, 14), material(0xfff3dc, { rugoso: 0.7 }), [0, 0.15, 0]);
  malla(g, casquete(0.24, 0.5, 24, 12), plastico(color), [0, 0.26, 0], [0, 0, 0], [1, 0.8, 1]);
  // Lunares repartidos por el sombrero, ya colocados y unidos en una sola pieza
  const lunares: [number, number][] = [
    [0.3, 0.5],
    [2.2, 0.7],
    [4.2, 0.6],
    [1.2, 0.15],
  ];
  const piezas = lunares.map(([a, b]) =>
    esfera(0.04, 10, 8)
      .scale(1, 0.5, 1)
      .translate(
        Math.cos(a) * 0.2 * Math.sin(b + 0.5),
        0.19 * Math.cos(b),
        Math.sin(a) * 0.2 * Math.sin(b + 0.5),
      ),
  );
  malla(g, mergeGeometries(piezas), material(0xffffff), [0, 0.26, 0]);
}

/** Cartel de madera que señala el charco. */
function cartel(padre: THREE.Object3D): void {
  const g = grupo(padre, [-4.4, 0, -1.3], [0, 0.25, 0]);
  malla(g, cilindro(0.07, 0.08, 1.6, 10), material(0x8a5a3a), [0, 0.8, 0]);
  malla(g, caja(1.6, 0.8, 0.1, 0.05), material(0xe3b57a, { rugoso: 0.8 }), [0, 1.5, 0.06]);
  const letrero = texturaPintada(512, 256, (c, ancho, alto) => {
    c.fillStyle = '#e3b57a';
    c.fillRect(0, 0, ancho, alto);
    c.fillStyle = '#5a3a22';
    c.textAlign = 'center';
    c.font = '700 86px Fredoka, system-ui, sans-serif';
    c.fillText('CHARCO', ancho / 2, 120);
    c.font = '700 70px Fredoka, system-ui, sans-serif';
    c.fillText('→ → →', ancho / 2, 210);
  });
  malla(
    g,
    new THREE.PlaneGeometry(1.5, 0.7),
    material(0xffffff, { rugoso: 0.8, textura: letrero }),
    [0, 1.5, 0.12],
  );
}

export const patitos3d: Definicion3d = {
  motor: {
    cielo: [
      [0, 0x58b4ee],
      [0.5, 0xb4e4f8],
      [0.66, 0xf2f9d8],
      [1, 0xf2f9d8],
    ],
    niebla: [0xeaf7d8, 24, 75],
    camara: [0, 2.5, 10.8],
    mira: [0, 1.7, 0],
    angulo: 30,
    sol: { pos: [-5, 9, 6], color: 0xfff2cc, fuerza: 3.2 },
    contraluz: { pos: [6, 5, -6], color: 0xbfe8ff, fuerza: 1.3 },
    ambiente: { cielo: 0xcfeaff, suelo: 0x8fbf6a, fuerza: 0.85 },
    exposicion: 0.92,
    reflejos: 0.3,
    resplandor: 0.2,
    foco: 10.7,
    zonaSombra: 9,
  },
  crear: (motor) => new Patitos(motor),
};
