/**
 * Personaje 3D común a las nueve escenas: cabeza grande, ojos con párpados y cejas que
 * cambian de expresión, cuerpo redondeado y brazos de una sola pieza que nacen dentro del
 * hombro (sin articulaciones sueltas). Cada escena le cambia colores, peinado y complementos.
 *
 * No hay animaciones grabadas: en cada fotograma la escena dice dónde están las manos, hacia
 * dónde gira la cabeza y qué expresión tiene, y el personaje se recoloca. La respiración y
 * el parpadeo los hace él solo.
 */
import * as THREE from 'three';

import { acercar, parpadeo } from './animacion';
import {
  aro,
  caja,
  capsula,
  casquete,
  cilindro,
  deformar,
  esfera,
  grupo,
  malla,
  silueta,
  torno,
  TuboFlexible,
  V3,
} from './formas';
import { crearAzar, material, piel, tela, tono } from './materiales';

const PI = Math.PI;
/** Radio de la cabeza. El personaje entero mide unas 1,7 unidades de alto. */
const R = 0.33;
/** Altura de la cadera: de ahí para arriba el cuerpo se puede inclinar. */
const CADERA = 0.54;

export type Expresion = 'feliz' | 'neutral' | 'sorpresa' | 'concentrado' | 'triste' | 'risa';
export type Peinado = 'corto' | 'tupe' | 'melena' | 'moño' | 'rizado' | 'coletas';
type Boca = 'sonrisa' | 'o' | 'triste' | 'cerrada';

/**
 * Cada expresión es una combinación de cuatro cosas: cuánto baja el párpado (0 abierto,
 * 1 cerrado), cuánto se inclina, cómo se colocan las cejas y qué boca se enseña.
 */
interface Gesto {
  parpado: number;
  /** Inclinación del párpado: positiva = ceño fruncido, negativa = pena. */
  caida: number;
  /** Giro de las cejas: negativo las junta hacia abajo, positivo las levanta por dentro. */
  ceja: number;
  alturaCeja: number;
  boca: Boca;
  /** Ojos cerrados en arco, de reírse. */
  arcos?: boolean;
}
const GESTOS: Record<Expresion, Gesto> = {
  feliz: { parpado: 0.3, caida: -0.04, ceja: 0.12, alturaCeja: 0.44, boca: 'sonrisa' },
  neutral: { parpado: 0.26, caida: 0, ceja: 0, alturaCeja: 0.42, boca: 'cerrada' },
  sorpresa: { parpado: 0.04, caida: 0, ceja: 0.1, alturaCeja: 0.54, boca: 'o' },
  concentrado: { parpado: 0.42, caida: 0.3, ceja: -0.42, alturaCeja: 0.36, boca: 'cerrada' },
  triste: { parpado: 0.38, caida: -0.3, ceja: 0.42, alturaCeja: 0.42, boca: 'triste' },
  risa: { parpado: 0.3, caida: 0, ceja: 0.25, alturaCeja: 0.46, boca: 'sonrisa', arcos: true },
};

export interface OpcionesPersonaje {
  pos?: V3;
  /** Giro sobre sí mismo. Con 0 mira hacia la cámara (+Z). */
  giro?: number;
  escala?: number;
  piel?: number;
  ropa?: number;
  pantalon?: number;
  zapatos?: number;
  pelo?: [Peinado, number];
  cejas?: number;
  ojos?: number;
  /** Color del cuello de la ropa, si lo lleva. */
  cuello?: number;
  /** De 0 (delgado) a 1 (barrigón). */
  barriga?: number;
  mangaCorta?: boolean;
  sentado?: boolean;
  /** Para que no parpadeen todos a la vez. */
  desfase?: number;
}

interface Ojo {
  abierto: THREE.Group;
  arco: THREE.Mesh;
  iris: THREE.Group;
  bisagra: THREE.Group;
  caida: THREE.Group;
}

export class Personaje {
  /** Todo el personaje, con los pies en el origen. */
  readonly raiz: THREE.Group;
  /** De la cadera para arriba: girarlo inclina el cuerpo. */
  readonly torso: THREE.Group;
  /** Piezas del torso, en coordenadas del personaje (con los pies en y = 0). */
  readonly cuerpo: THREE.Group;
  readonly cabeza: THREE.Group;
  readonly radioCabeza = R;
  /**
   * Posición de cada mano en coordenadas del personaje. La escena cambia estos números y
   * el brazo se recoloca solo. «D» es la del lado +X e «I» la del lado −X.
   */
  readonly manoD: V3 = [0.33, 0.56, 0.06];
  readonly manoI: V3 = [-0.33, 0.56, 0.06];
  /** Las manos como grupos, por si la escena les cuelga algo (una sardina, un sello). */
  readonly objetoManoD: THREE.Group;
  readonly objetoManoI: THREE.Group;
  readonly pieD: V3 = [0.115, 0.07, 0.02];
  readonly pieI: V3 = [-0.115, 0.07, 0.02];
  expresion: Expresion = 'neutral';
  /** Hacia dónde miran los ojos: [−1 a 1 en horizontal, −1 a 1 en vertical]. */
  readonly mirada: [number, number] = [0, 0];

  private readonly desfase: number;
  private readonly sentado: boolean;
  private readonly ojos: Ojo[] = [];
  private readonly cejas: THREE.Mesh[] = [];
  private readonly bocas: Record<Boca, THREE.Object3D>;
  private readonly brazos: { manga: TuboFlexible; antebrazo: TuboFlexible | null }[] = [];
  private readonly piernas: TuboFlexible[] = [];
  private readonly zapatos: THREE.Mesh[] = [];
  /** Valores actuales de la cara: se acercan poco a poco a los del gesto elegido. */
  private cara = { parpado: 0.26, caida: 0, ceja: 0, alturaCeja: 0.42 };

  constructor(padre: THREE.Object3D, o: OpcionesPersonaje = {}) {
    this.desfase = o.desfase ?? 0;
    this.sentado = o.sentado ?? false;
    const colorPiel = o.piel ?? 0xf3c09a;
    const mPiel = piel(colorPiel);
    const mRopa = tela(o.ropa ?? 0xff6b6b);
    const mPantalon = tela(o.pantalon ?? 0x3d5a8a);
    const mZapato = material(o.zapatos ?? 0x3a2e4a, { rugoso: 0.4, barniz: 0.4 });

    this.raiz = grupo(padre, o.pos, [0, o.giro ?? 0, 0], o.escala ?? 1);
    this.torso = grupo(this.raiz, [0, CADERA, 0]);
    this.cuerpo = grupo(this.torso, [0, -CADERA, 0]);

    // Piernas y zapatos
    for (const lado of [1, -1]) {
      const pierna = new TuboFlexible((t) => 0.105 - 0.027 * t, 8, 12);
      malla(this.raiz, pierna.geometria, mPantalon);
      this.piernas.push(pierna);
      this.zapatos.push(
        malla(
          this.raiz,
          esfera(0.1, 20, 14),
          mZapato,
          [0, 0, 0],
          [0, lado * 0.14, 0],
          [0.92, 0.68, 1.6],
        ),
      );
    }
    malla(this.raiz, esfera(0.2, 24, 16), mPantalon, [0, CADERA, 0], [0, 0, 0], [1, 0.62, 0.84]);

    // Tronco en forma de judía: los hombros quedan dentro de su volumen
    const ancho = 1 + (o.barriga ?? 0.2) * 0.4;
    malla(
      this.cuerpo,
      torno([
        [0.001, 0.47],
        [0.16, 0.48],
        [0.195 * ancho, 0.58],
        [0.205 * ancho, 0.72],
        [0.2, 0.86],
        [0.19, 0.95],
        [0.14, 1.03],
        [0.07, 1.07],
        [0.001, 1.075],
      ]),
      mRopa,
      [0, 0, 0],
      [0, 0, 0],
      [1, 1, 0.82],
    );
    malla(this.cuerpo, cilindro(0.062, 0.07, 0.12, 16), mPiel, [0, 1.09, 0]);
    if (o.cuello !== undefined) {
      malla(
        this.cuerpo,
        aro(0.09, 0.032),
        tela(o.cuello),
        [0, 1.06, 0],
        [PI / 2, 0, 0],
        [1, 0.9, 1],
      );
    }

    // Brazos: un tubo del hombro a la muñeca. Con manga corta, el antebrazo es de piel
    for (let i = 0; i < 2; i++) {
      const corta = o.mangaCorta ?? false;
      const manga = new TuboFlexible((t) => (corta ? 0.088 - 0.01 * t : 0.088 - 0.026 * t), 10, 12);
      malla(this.cuerpo, manga.geometria, mRopa);
      let antebrazo: TuboFlexible | null = null;
      if (corta) {
        antebrazo = new TuboFlexible((t) => 0.062 - 0.012 * t, 8, 12);
        malla(this.cuerpo, antebrazo.geometria, mPiel);
      }
      this.brazos.push({ manga, antebrazo });
    }
    this.objetoManoD = this.crearMano(mPiel, 1);
    this.objetoManoI = this.crearMano(mPiel, -1);

    // Cabeza: una esfera algo más ancha en las mejillas, con orejas
    this.cabeza = grupo(this.cuerpo, [0, 1.36, 0.02]);
    const formaCabeza = deformar(esfera(R, 40, 28), (v) => {
      const abajo = Math.max(0, -v.y / R);
      v.x *= 1 + 0.1 * abajo - 0.04 * Math.max(0, v.y / R);
      v.y *= 0.94;
      v.z *= 0.95 + 0.04 * abajo;
    });
    malla(this.cabeza, formaCabeza, mPiel);
    for (const lado of [1, -1]) {
      malla(
        this.cabeza,
        esfera(0.07, 16, 12),
        mPiel,
        [lado * R, -0.01, -0.02],
        [0, 0, 0],
        [0.55, 1, 0.8],
      );
    }
    this.bocas = this.crearCara(colorPiel, o);
    if (o.pelo) crearPelo(this.cabeza, o.pelo[0], o.pelo[1]);
    this.actualizar(0, 1);
  }

  /**
   * Recoloca brazos, piernas y cara. Hay que llamarlo en cada fotograma, después de que la
   * escena haya decidido manos, mirada y expresión.
   * @param t segundos de reloj, para la respiración y el parpadeo
   * @param dt segundos desde el fotograma anterior
   */
  actualizar(t: number, dt: number): void {
    // Respiración: el torso se estira un poquito arriba y abajo
    this.torso.scale.y = 1 + 0.012 * Math.sin(t * 2.2 + this.desfase);

    this.colocarBrazo(0, 1, this.manoD, this.objetoManoD);
    this.colocarBrazo(1, -1, this.manoI, this.objetoManoI);

    [this.pieD, this.pieI].forEach((pie, i) => {
      const lado = i === 0 ? 1 : -1;
      const cadera: V3 = [lado * 0.095, 0.56, 0];
      const tobillo: V3 = [pie[0], pie[1] + 0.05, pie[2]];
      const rodilla: V3 = this.sentado
        ? [lado * 0.12, 0.5, 0.36]
        : [lado * 0.11, 0.3, pie[2] * 0.5 + 0.02];
      this.piernas[i].colocar(cadera, controlPorCodo(cadera, rodilla, tobillo), tobillo);
      this.zapatos[i].position.set(pie[0], pie[1], pie[2] + 0.06);
    });

    // Cara: los valores se acercan a los del gesto para que el cambio no sea un salto
    const gesto = GESTOS[this.expresion];
    const cara = this.cara;
    cara.parpado = acercar(cara.parpado, gesto.parpado, 16, dt);
    cara.caida = acercar(cara.caida, gesto.caida, 16, dt);
    cara.ceja = acercar(cara.ceja, gesto.ceja, 16, dt);
    cara.alturaCeja = acercar(cara.alturaCeja, gesto.alturaCeja, 16, dt);
    const cierre = Math.max(cara.parpado, parpadeo(t, 3.4, this.desfase));
    const radioOjo = R * 0.215;
    this.ojos.forEach((ojo, i) => {
      const lado = i === 0 ? 1 : -1;
      ojo.abierto.visible = !gesto.arcos;
      ojo.arco.visible = !!gesto.arcos;
      // El párpado es media esfera que gira sobre el ojo como una visera
      ojo.bisagra.rotation.x = (cierre - 0.5) * PI;
      ojo.caida.rotation.z = lado * cara.caida;
      ojo.iris.position.set(this.mirada[0] * radioOjo * 0.26, this.mirada[1] * radioOjo * 0.26, 0);
    });
    this.cejas.forEach((ceja, i) => {
      const lado = i === 0 ? 1 : -1;
      ceja.rotation.z = PI / 2 - lado * cara.ceja;
      ceja.position.y = R * cara.alturaCeja;
    });
    for (const nombre of Object.keys(this.bocas) as Boca[]) {
      this.bocas[nombre].visible = nombre === gesto.boca;
    }
    this.bocas.sonrisa.scale.setScalar(this.expresion === 'risa' ? 1.3 : 1);
  }

  private crearMano(mPiel: THREE.Material, lado: number): THREE.Group {
    // Manopla con pulgar
    const mano = grupo(this.cuerpo);
    malla(mano, esfera(0.07, 18, 14), mPiel, [0, 0, 0], [0, 0, 0], [1, 1.05, 0.9]);
    malla(mano, esfera(0.03, 12, 10), mPiel, [-lado * 0.042, 0.042, 0.035]);
    return mano;
  }

  private colocarBrazo(indice: number, lado: number, mano: V3, objeto: THREE.Group): void {
    const hombro: V3 = [lado * 0.15, 0.93, 0];
    const d = Math.hypot(mano[0] - hombro[0], mano[1] - hombro[1], mano[2] - hombro[2]) || 1;
    // Cuanto más cerca está la mano del hombro, más se dobla el codo (hacia fuera y abajo)
    const doblez = Math.max(0.04, 0.6 - d) * 0.6;
    const codo: V3 = [
      (hombro[0] + mano[0]) / 2 + lado * doblez * 0.9,
      (hombro[1] + mano[1]) / 2 - doblez * 0.7,
      (hombro[2] + mano[2]) / 2 - doblez * 0.5,
    ];
    // La manga acaba un poco antes del centro de la mano, que la tapa
    const muneca: V3 = [
      mano[0] - ((mano[0] - hombro[0]) / d) * 0.05,
      mano[1] - ((mano[1] - hombro[1]) / d) * 0.05,
      mano[2] - ((mano[2] - hombro[2]) / d) * 0.05,
    ];
    const control = controlPorCodo(hombro, codo, muneca);
    const { manga, antebrazo } = this.brazos[indice];
    if (antebrazo) {
      // Manga corta: la tela llega hasta el codo y el resto del brazo es de piel
      manga.colocar(hombro, mezclaV3(hombro, control, 0.5), codo);
      antebrazo.colocar(codo, mezclaV3(control, muneca, 0.5), muneca);
    } else {
      manga.colocar(hombro, control, muneca);
    }
    objeto.position.set(...mano);
  }

  /** Ojos, cejas, nariz, mejillas y las cuatro bocas (solo se enseña una cada vez). */
  private crearCara(colorPiel: number, o: OpcionesPersonaje): Record<Boca, THREE.Object3D> {
    const cab = this.cabeza;
    const blanco = material(0xffffff, { rugoso: 0.15, barniz: 1 });
    const mIris = material(o.ojos ?? 0x6b4a2b, { rugoso: 0.25, barniz: 1 });
    const mPupila = material(0x1d1626, { rugoso: 0.2, barniz: 1 });
    const mBrillo = material(0xffffff, { luz: 0xffffff, fuerzaLuz: 1.2 });
    const mParpado = piel(colorPiel);
    const mPestana = material(0x2a1e2e, { rugoso: 0.6 });
    const separacion = R * 0.37;
    const r = R * 0.215;

    for (const lado of [1, -1]) {
      const ojo = grupo(cab, [lado * separacion, R * 0.06, R * 0.83], [0, lado * 0.2, 0]);
      const abierto = grupo(ojo);
      malla(abierto, esfera(r, 24, 16), blanco, [0, 0, 0], [0, 0, 0], [1, 1.08, 0.6]);
      const iris = grupo(abierto);
      malla(
        iris,
        esfera(r * 0.68, 20, 14),
        mIris,
        [0, -r * 0.04, r * 0.33],
        [0, 0, 0],
        [1, 1.04, 0.5],
      );
      malla(
        iris,
        esfera(r * 0.38, 16, 12),
        mPupila,
        [0, -r * 0.04, r * 0.48],
        [0, 0, 0],
        [1, 1.04, 0.45],
      );
      malla(
        iris,
        esfera(r * 0.16, 10, 8),
        mBrillo,
        [-r * 0.22, r * 0.24, r * 0.68],
        [0, 0, 0],
        [1, 1, 0.5],
      );
      malla(
        iris,
        esfera(r * 0.07, 8, 6),
        mBrillo,
        [r * 0.2, -r * 0.24, r * 0.68],
        [0, 0, 0],
        [1, 1, 0.5],
      );
      // Párpado: media esfera del color de la piel, con la línea de pestañas en el borde
      const achatado = grupo(abierto, [0, 0, 0], [0, 0, 0], [1.03, 1.11, 0.68]);
      const caida = grupo(achatado);
      const bisagra = grupo(caida);
      malla(bisagra, casquete(r * 1.07, 0.5, 24, 10), mParpado);
      malla(bisagra, capsula(R * 0.02, r * 1.7, 8), mPestana, [0, 0, r * 1.05], [0, 0, PI / 2]);
      // Ojo cerrado en arco, para la risa
      const arco = malla(
        ojo,
        aro(r * 0.7, R * 0.026, PI),
        mPestana,
        [0, -r * 0.25, r * 0.5],
        [0.1, 0, 0],
      );
      this.ojos.push({ abierto, arco, iris, bisagra, caida });
    }

    const mCeja = material(o.cejas ?? 0x4a3020, { rugoso: 0.8 });
    for (const lado of [1, -1]) {
      this.cejas.push(
        malla(
          cab,
          capsula(R * 0.036, R * 0.2, 8),
          mCeja,
          [lado * separacion * 1.02, 0, R * 0.87],
          [0.2, 0, PI / 2],
        ),
      );
    }
    malla(
      cab,
      esfera(R * 0.13, 16, 12),
      piel(tono(colorPiel, -0.1)),
      [0, -R * 0.14, R * 0.97],
      [0, 0, 0],
      [1, 0.85, 0.9],
    );
    for (const lado of [1, -1]) {
      const mejilla = malla(
        cab,
        new THREE.CircleGeometry(R * 0.15, 20),
        material(0xff7f8f, { opacidad: 0.42, rugoso: 1 }),
        [lado * R * 0.56, -R * 0.24, R * 0.79],
        [0.25, lado * 0.62, 0],
      );
      mejilla.castShadow = false;
    }

    // Bocas
    const y = -R * 0.46;
    const z = R * 0.86;
    const oscuro = material(0x5a1a26, { rugoso: 0.6 });
    const a = R * 0.2;
    const sonrisa = grupo(cab, [0, y + a * 0.42, z - R * 0.02], [-0.22, 0, 0]);
    malla(
      sonrisa,
      silueta(
        (s) => {
          s.moveTo(-a, 0);
          s.quadraticCurveTo(0, a * 0.18, a, 0);
          s.quadraticCurveTo(a * 0.9, -a * 1.05, 0, -a * 1.1);
          s.quadraticCurveTo(-a * 0.9, -a * 1.05, -a, 0);
        },
        R * 0.02,
        R * 0.012,
      ),
      oscuro,
    );
    malla(sonrisa, caja(a * 1.3, a * 0.22, R * 0.02, 0.004), material(0xffffff, { rugoso: 0.3 }), [
      0,
      -a * 0.12,
      R * 0.035,
    ]);
    malla(
      sonrisa,
      esfera(a * 0.42, 14, 10),
      material(0xff6f82, { rugoso: 0.5 }),
      [0, -a * 0.82, R * 0.02],
      [0, 0, 0],
      [1.2, 0.6, 0.3],
    );
    return {
      sonrisa,
      o: malla(cab, esfera(R * 0.1, 16, 12), oscuro, [0, y, z], [0, 0, 0], [1, 1.25, 0.4]),
      triste: malla(
        cab,
        aro(R * 0.12, R * 0.022, PI),
        oscuro,
        [0, y - R * 0.1, z - R * 0.02],
        [-0.3, 0, 0],
      ),
      cerrada: malla(
        cab,
        aro(R * 0.12, R * 0.022, PI * 0.8),
        oscuro,
        [0, y + R * 0.1, z - R * 0.03],
        [-0.25, 0, PI * 1.1],
      ),
    };
  }
}

/**
 * Una curva de Bézier no pasa por su punto de control. Esta cuenta da el control que hace
 * que la curva de `a` a `b` pase justo por `codo` a mitad de camino.
 */
function controlPorCodo(a: V3, codo: V3, b: V3): V3 {
  return [
    2 * codo[0] - (a[0] + b[0]) / 2,
    2 * codo[1] - (a[1] + b[1]) / 2,
    2 * codo[2] - (a[2] + b[2]) / 2,
  ];
}

function mezclaV3(a: V3, b: V3, k: number): V3 {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

/** Pelo hecho con formas redondas, como de plastilina. */
function crearPelo(cab: THREE.Object3D, peinado: Peinado, color: number): void {
  const m = material(color, { rugoso: 0.7, pelusa: 0.4 });
  const casco = (abertura = 0.5) =>
    malla(
      cab,
      casquete(R * 1.06, abertura, 32, 14),
      m,
      [0, R * 0.04, -R * 0.06],
      [-0.32, 0, 0],
      [1.02, 1, 1.02],
    );
  const mechon = (pos: V3, giro: number, radio = 0.3) =>
    malla(cab, esfera(R * radio, 16, 12), m, pos, [0, 0, giro], [1.5, 0.6, 0.9]);
  if (peinado === 'corto' || peinado === 'tupe') {
    casco();
    if (peinado === 'tupe')
      malla(
        cab,
        esfera(R * 0.42, 18, 14),
        m,
        [R * 0.1, R * 0.9, R * 0.5],
        [0, 0, 0],
        [1.3, 0.75, 1],
      );
    else mechon([-R * 0.2, R * 0.8, R * 0.56], 0.2, 0.36);
    for (const lado of [1, -1]) {
      malla(
        cab,
        esfera(R * 0.2, 12, 10),
        m,
        [lado * R * 0.9, R * 0.12, R * 0.12],
        [0, 0, 0],
        [0.5, 1.3, 0.9],
      );
    }
  } else if (peinado === 'melena') {
    casco(0.56);
    for (const lado of [1, -1]) {
      malla(
        cab,
        esfera(R * 0.42, 18, 14),
        m,
        [lado * R * 0.84, -R * 0.36, -R * 0.1],
        [0, 0, 0],
        [0.75, 1.5, 0.95],
      );
    }
    mechon([R * 0.34, R * 0.74, R * 0.56], -0.5, 0.34);
    mechon([-R * 0.4, R * 0.78, R * 0.5], 0.5);
  } else if (peinado === 'moño') {
    casco();
    malla(cab, esfera(R * 0.42, 18, 14), m, [0, R * 1.12, -R * 0.3]);
    mechon([-R * 0.3, R * 0.8, R * 0.56], 0.3);
    mechon([R * 0.34, R * 0.8, R * 0.52], -0.3);
  } else if (peinado === 'rizado') {
    const azar = crearAzar(23);
    for (let i = 0; i < 26; i++) {
      const giro = azar() * PI * 2;
      const altura = azar() * PI * 0.55;
      const x = Math.sin(altura) * Math.cos(giro);
      const y = Math.cos(altura);
      const z = Math.sin(altura) * Math.sin(giro);
      const radio = R * (0.3 + azar() * 0.12);
      // Se dejan libres la frente y la cara
      if (z > 0.55 && y < 0.6) continue;
      malla(cab, esfera(radio, 12, 10), m, [
        x * R * 0.95,
        y * R * 0.95 + R * 0.08,
        z * R * 0.95 - R * 0.08,
      ]);
    }
  } else {
    casco();
    for (const lado of [1, -1]) {
      malla(
        cab,
        esfera(R * 0.36, 16, 12),
        m,
        [lado * R * 1.12, R * 0.1, -R * 0.2],
        [0, 0, 0],
        [0.9, 1.25, 0.9],
      );
      mechon([lado * R * 0.36, R * 0.78, R * 0.56], lado * -0.4, 0.28);
    }
  }
}
