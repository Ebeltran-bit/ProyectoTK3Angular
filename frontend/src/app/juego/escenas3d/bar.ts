/**
 * Escena 3D «Brindis arcade» (fácil).
 *
 * Dos clientes deslizan sus jarras por la barra de un salón recreativo y chocan en el
 * centro justo en el pulso. Cada nota se cuenta en tres tiempos:
 *  - Anticipación: la jarra aparece en la mano del cliente, que la echa un poco atrás.
 *  - Acción: la empuja y la jarra recorre la barra durante un pulso exacto; la distancia
 *    que le queda es lo que marca el ritmo.
 *  - Reacción: si se acierta, las jarras chocan, salta la espuma y los clientes lo
 *    celebran; si se falla, se vuelcan y la cerveza se derrama.
 *
 * Como en las demás escenas, todo se calcula en cada fotograma a partir de la `VistaEscena`.
 */
import * as THREE from 'three';

import { VistaEscena } from '../escenarios/tipos';
import { arco, frenar, limitar, mezclar, rebote, suave, tramo } from './animacion';
import { V3, aro, caja, cilindro, esfera, grupo, malla, sinSombra, torno } from './formas';
import { latido, notaAcertada, ultimaJuzgada } from './golpes';
import {
  crearAzar,
  luminoso,
  material,
  metal,
  plastico,
  texturaCuadros,
  texturaMadera,
  texturaPintada,
  texturaRuido,
  tono,
} from './materiales';
import { Motor } from './motor';
import { Chispas, estrella } from './objetos';
import { alcanzar, Personaje } from './personaje';
import { Definicion3d, Escena3d } from './tipos';

const PI = Math.PI;

/** Pulsos antes de la nota en los que la jarra aparece en la mano del cliente. */
const APARECE = 1.45;
/** Pulsos que las jarras siguen a la vista después de la nota. */
const SE_QUEDA = 0.8;
/** Altura del tablero de la barra. */
const BARRA = 1.31;
/** Dónde sale la jarra del cliente de la izquierda y dónde choca (la otra es su espejo). */
const SALIDA: V3 = [-1.8, BARRA, -0.3];
const CHOQUE: V3 = [-0.33, BARRA, 0.25];
/** En las notas dobles (K) cada cliente empuja dos jarras: la segunda va esta distancia detrás. */
const SEPARACION = 0.62;
const ESCALA_JARRA = 1.22;
const RUBIA = 0xf08a00;
const TOSTADA = 0x7a3210;

/** Piezas que comparten todas las jarras: se crean una sola vez. */
interface PiezasJarra {
  cerveza: THREE.BufferGeometry;
  vidrio: THREE.BufferGeometry;
  asa: THREE.BufferGeometry;
  bola: THREE.BufferGeometry;
  mVidrio: THREE.Material;
  mAsa: THREE.Material;
  mEspuma: THREE.Material;
}

/** Jarra de cristal con cerveza y espuma. El origen está en la base, para que vuelque bien. */
class Jarra {
  readonly g: THREE.Group;
  private readonly cerveza: THREE.Mesh;

  /** @param asa 1 si el asa queda hacia +X y −1 si queda hacia −X */
  constructor(padre: THREE.Object3D, p: PiezasJarra, color: THREE.Material, asa: number) {
    this.g = grupo(padre, [0, 0, 0], [0, 0, 0], ESCALA_JARRA);
    this.cerveza = malla(this.g, p.cerveza, color, [0, 0.25, 0]);
    malla(this.g, p.vidrio, p.mVidrio, [0, 0.27, 0]).castShadow = false;
    malla(this.g, p.asa, p.mAsa, [asa * 0.23, 0.27, 0], [0, 0, asa > 0 ? -PI / 2 : PI / 2]);
    const bolas: [number, number, number, number][] = [
      [0, 0.52, 0, 0.17],
      [0.11, 0.55, 0.05, 0.11],
      [-0.1, 0.56, -0.04, 0.12],
      [0.02, 0.62, -0.06, 0.1],
      [-0.04, 0.6, 0.1, 0.09],
    ];
    for (const [x, y, z, r] of bolas) malla(this.g, p.bola, p.mEspuma, [x, y, z], [0, 0, 0], r);
  }

  cambiarCerveza(color: THREE.Material): void {
    this.cerveza.material = color;
  }
}

/** Las jarras de una nota: una por cliente, y otra más por cliente si la nota es doble. */
interface Ronda {
  g: THREE.Group;
  /** [izquierda, derecha] */
  delante: Jarra[];
  detras: Jarra[];
  charco: THREE.Mesh;
}

/** Espuma que salta al chocar: bolitas blancas que suben y caen. */
class SaltoDeEspuma {
  private readonly g: THREE.Group;
  private readonly bolas: { m: THREE.Mesh; vx: number; vy: number; vz: number }[] = [];

  constructor(padre: THREE.Object3D, pos: V3, bola: THREE.BufferGeometry, mat: THREE.Material) {
    this.g = grupo(padre, pos);
    this.g.visible = false;
    const azar = crearAzar(23);
    for (let i = 0; i < 12; i++) {
      const angulo = (i / 12) * PI * 2;
      const m = malla(this.g, bola, mat, [0, 0, 0], [0, 0, 0], 0.05 + azar() * 0.06);
      m.castShadow = false;
      this.bolas.push({
        m,
        vx: Math.cos(angulo) * (0.7 + azar() * 0.9),
        vy: 2.2 + azar() * 1.6,
        vz: Math.sin(angulo) * 0.4,
      });
    }
  }

  /** @param desde segundos desde el choque (si es negativo o ya pasó, no se ve) */
  actualizar(desde: number): void {
    this.g.visible = desde >= 0 && desde < 0.6;
    if (!this.g.visible) return;
    for (const b of this.bolas) {
      // Tiro parabólico: suben con su velocidad y la gravedad las hace caer
      b.m.position.set(b.vx * desde, b.vy * desde - 6.5 * desde * desde, b.vz * desde);
      b.m.visible = b.m.position.y > -0.6;
    }
  }
}

interface Cliente {
  p: Personaje;
  /** −1 el de la izquierda y 1 el de la derecha. */
  lado: number;
  /** La mano que empuja (la que queda hacia el centro) y la que queda libre. */
  empuja: V3;
  libre: V3;
  reposoEmpuja: V3;
  reposoLibre: V3;
  celebra: V3;
}

class Bar implements Escena3d {
  readonly palabra: Escena3d['palabra'];
  private readonly rondas: Ronda[] = [];
  private readonly clientes: Cliente[] = [];
  private readonly espuma: SaltoDeEspuma;
  private readonly chispas: Chispas;
  private readonly mRubia: THREE.Material;
  private readonly mTostada: THREE.Material;
  private readonly neones: THREE.MeshStandardMaterial[] = [];
  private readonly pantallas: THREE.MeshStandardMaterial[] = [];
  private readonly lamparas: THREE.Group[] = [];
  private readonly centro = new THREE.Vector3(0, BARRA + 0.75, CHOQUE[2]);
  // Vectores de trabajo: se reutilizan para no crear objetos nuevos en cada fotograma
  private readonly punto = new THREE.Vector3();
  private readonly mira = new THREE.Vector3();

  constructor(motor: Motor) {
    const S = motor.escena;
    this.palabra = {
      ...motor.proyectar([0, 2.75, CHOQUE[2]]),
      aciertos: ['¡Chin!', '¡Clinc!', '¡Salud!'],
    };
    this.decorado(S);

    // Jarras: tres rondas que se van turnando (nunca hay más de tres notas a la vista)
    const mEspuma = material(0xfffdf2, { rugoso: 0.9, luz: 0xfff2d0, fuerzaLuz: 0.06 });
    const piezas: PiezasJarra = {
      cerveza: cilindro(0.21, 0.19, 0.46, 24),
      vidrio: cilindro(0.235, 0.215, 0.52, 24),
      asa: aro(0.15, 0.04, PI),
      bola: esfera(1, 12, 8),
      mVidrio: material(0xffe2b0, { rugoso: 0.05, opacidad: 0.12, barniz: 1 }),
      mAsa: material(0xf4fbff, { rugoso: 0.05, opacidad: 0.6, barniz: 1 }),
      mEspuma,
    };
    const cerveza = (color: number) =>
      material(color, { rugoso: 0.3, barniz: 1, luz: color, fuerzaLuz: 0.3 });
    this.mRubia = cerveza(RUBIA);
    this.mTostada = cerveza(TOSTADA);
    for (let i = 0; i < 3; i++) {
      const g = grupo(S);
      const charco = malla(g, piezas.bola, this.mRubia, [0, BARRA, CHOQUE[2] + 0.35]);
      charco.castShadow = false;
      this.rondas.push({
        g,
        // El asa mira hacia el cliente que empuja la jarra
        delante: [new Jarra(g, piezas, this.mRubia, -1), new Jarra(g, piezas, this.mRubia, 1)],
        detras: [new Jarra(g, piezas, this.mTostada, -1), new Jarra(g, piezas, this.mTostada, 1)],
        charco,
      });
    }
    this.espuma = new SaltoDeEspuma(S, [0, BARRA + 0.7, CHOQUE[2]], piezas.bola, mEspuma);
    this.chispas = new Chispas(S, 10, [0xffd23c, 0xffffff, 0xff8fa3, 0x4fe0ff]);

    // Jarras tostadas esperando su turno y cuenco de aperitivos, de adorno
    for (const [x, z, giro] of [
      [-2.6, 1.75, 0.3],
      [-1.95, 2.15, 0.6],
    ]) {
      const j = new Jarra(S, piezas, this.mTostada, -1);
      j.g.position.set(x, BARRA, z);
      j.g.rotation.y = giro;
      j.g.scale.setScalar(1.05);
    }

    // Clientes: la de rizos a la izquierda y el del tupé a la derecha
    const rizos = new Personaje(S, {
      pos: [-2.95, -0.2, -1.05],
      giro: 0.42,
      escala: 1.5,
      piel: 0x9a623e,
      ropa: 0xb58cff,
      pelo: ['rizado', 0x2a1e2e],
      cuello: 0xffd23c,
      cejas: 0x2a1e2e,
    });
    const tupe = new Personaje(S, {
      pos: [2.95, -0.2, -1.05],
      giro: -0.42,
      escala: 1.5,
      piel: 0xf3c09a,
      ropa: 0x4fd1a5,
      pelo: ['tupe', 0xd9552b],
      cuello: 0xfff3dc,
      cejas: 0xb5431e,
      barriga: 0.6,
      desfase: 1.7,
    });
    this.clientes.push(
      {
        p: rizos,
        lado: -1,
        empuja: rizos.manoD,
        libre: rizos.manoI,
        reposoEmpuja: [0.3, 1.07, 0.42],
        reposoLibre: [-0.3, 1.07, 0.4],
        celebra: [-0.4, 1.5, 0.2],
      },
      {
        p: tupe,
        lado: 1,
        empuja: tupe.manoI,
        libre: tupe.manoD,
        reposoEmpuja: [-0.3, 1.07, 0.42],
        reposoLibre: [0.3, 1.07, 0.4],
        celebra: [0.4, 1.5, 0.2],
      },
    );
  }

  actualizar(v: VistaEscena, reloj: number, dt: number): void {
    const pulsoASegundos = 60 / v.bpm;
    this.ambiente(v, reloj);

    // --- Jarras: una ronda por cada nota que esté cerca en el tiempo ---
    for (const r of this.rondas) r.g.visible = false;
    /** Lo que falta para la nota que los clientes tienen entre manos (la preparan o la empujan). */
    let faltaEnMano = Infinity;
    let rondaEnMano: Ronda | null = null;
    let dobleEnMano = false;
    let hayJarrasEnCamino = false;
    v.notas.forEach((nota, i) => {
      const falta = nota.pulso - v.pulso;
      if (falta > APARECE || falta < -SE_QUEDA) return;
      const ronda = this.rondas[i % this.rondas.length];
      const doble = v.teclas[i] === 'alterna';
      ronda.g.visible = true;
      ronda.charco.visible = false;
      for (const j of ronda.detras) j.g.visible = doble;
      for (const j of ronda.delante) j.cambiarCerveza(doble ? this.mTostada : this.mRubia);
      if (falta > 0 || nota.juicio === null) {
        this.deslizar(ronda, Math.max(0, falta));
        hayJarrasEnCamino = true;
      } else if (nota.juicio === 'miss') {
        this.derramar(ronda, -falta, pulsoASegundos, doble);
      } else {
        this.brindar(ronda, -falta, pulsoASegundos);
      }
      if (falta > 0.5 && falta < faltaEnMano) {
        faltaEnMano = falta;
        rondaEnMano = ronda;
        dobleEnMano = doble;
      }
    });

    // --- Espuma y chispas del último brindis ---
    const acertada = notaAcertada(v);
    const perfecta = acertada !== null && v.notas[acertada].juicio === 'perfect';
    this.espuma.actualizar(acertada === null ? -1 : v.desdePulsacion);
    this.chispas.actualizar(
      this.centro,
      acertada === null ? -1 : v.desdePulsacion,
      perfecta ? 1.6 : 1.1,
    );

    for (const c of this.clientes) {
      this.moverCliente(c, v, reloj, dt, faltaEnMano, rondaEnMano, dobleEnMano, hayJarrasEnCamino);
    }
  }

  /**
   * Coloca las jarras de una ronda mientras van hacia el centro.
   * Antes del empujón (falta más de un pulso) aparecen y se echan un poco atrás.
   */
  private deslizar(ronda: Ronda, falta: number): void {
    const avance = falta >= 1 ? -0.09 * arco(tramo(falta, APARECE, 1)) : 1 - falta;
    const escala = ESCALA_JARRA * rebote(tramo(falta, APARECE, 1.18));
    this.colocar(ronda, avance, escala, 0, 0, 0);
  }

  /** ¡Chin! Las jarras se inclinan una hacia la otra, dan un saltito y desaparecen. */
  private brindar(ronda: Ronda, pulsos: number, pulsoASegundos: number): void {
    const hace = pulsos * pulsoASegundos;
    const choque = rebote(tramo(hace, 0, 0.16)) * (1 - suave(tramo(hace, 0.25, 0.42)));
    const salto = arco(tramo(hace, 0, 0.3)) * 0.22;
    const escala = ESCALA_JARRA * (1 - suave(tramo(pulsos, 0.55, SE_QUEDA)));
    this.colocar(ronda, 1, escala, -0.2 * choque, salto, 0);
  }

  /** Fallo: las jarras no llegan a chocar, se vuelcan hacia fuera y dejan un charco. */
  private derramar(ronda: Ronda, pulsos: number, pulsoASegundos: number, doble: boolean): void {
    // Una nota sin pulsar no se da por fallada hasta que pasa la ventana de 90 ms
    const hace = Math.max(0, pulsos * pulsoASegundos - 0.09);
    const vuelco = rebote(tramo(hace, 0, 0.3));
    const escala = ESCALA_JARRA * (1 - suave(tramo(pulsos, 0.6, SE_QUEDA)));
    this.colocar(ronda, 1, escala, 1.35 * vuelco, 0, 0.3 * suave(tramo(hace, 0, 0.2)));
    ronda.charco.visible = true;
    ronda.charco.material = doble ? this.mTostada : this.mRubia;
    const radio = (0.25 + 0.85 * frenar(tramo(hace, 0.1, 0.5))) * (escala / ESCALA_JARRA);
    ronda.charco.scale.set(radio, 0.012, radio * 0.5);
  }

  /**
   * Pone las cuatro jarras de una ronda en su sitio.
   * @param avance 0 en la salida y 1 en el centro de la barra
   * @param inclina giro de cada jarra: negativo hacia el centro (brindis) y positivo hacia fuera
   * @param aparta cuánto se separan del centro (al fallar no llegan a tocarse)
   */
  private colocar(
    ronda: Ronda,
    avance: number,
    escala: number,
    inclina: number,
    sube: number,
    aparta: number,
  ): void {
    const dx = CHOQUE[0] - SALIDA[0];
    const dz = CHOQUE[2] - SALIDA[2];
    const largo = Math.hypot(dx, dz);
    [ronda.delante, ronda.detras].forEach((pareja, fila) => {
      // La segunda jarra va detrás de la primera por el mismo camino
      const k = avance - (fila * SEPARACION) / largo;
      pareja.forEach((jarra, i) => {
        const lado = i === 0 ? -1 : 1;
        jarra.g.position.set(
          -lado * (SALIDA[0] + dx * k) + lado * aparta,
          BARRA + sube,
          SALIDA[2] + dz * k,
        );
        jarra.g.rotation.z = -lado * inclina;
        jarra.g.scale.setScalar(Math.max(0.001, escala));
      });
    });
  }

  private moverCliente(
    c: Cliente,
    v: VistaEscena,
    reloj: number,
    dt: number,
    falta: number,
    ronda: Ronda | null,
    doble: boolean,
    hayJarrasEnCamino: boolean,
  ): void {
    const p = c.p;
    const pulsoASegundos = 60 / v.bpm;
    // Anticipación y acción: se echa atrás con la jarra y luego acompaña el empujón
    const atras = ronda ? arco(tramo(falta, APARECE, 1)) : 0;
    const empujon = ronda ? arco(tramo(falta, 1.08, 0.55)) : 0;
    p.torso.rotation.x = 0.12 * empujon - 0.08 * atras;
    p.torso.rotation.y = -c.lado * (0.28 * empujon - 0.12 * atras);

    // La mano que empuja va sobre la jarra hasta poco después de soltarla
    const agarra = ronda
      ? suave(tramo(falta, APARECE, 1.22)) * (1 - suave(tramo(falta, 0.86, 0.55)))
      : 0;
    const vaiven = Math.sin(reloj * 1.4 + c.lado) * 0.012;
    let mano: V3 = [c.reposoEmpuja[0], c.reposoEmpuja[1] + vaiven, c.reposoEmpuja[2]];
    if (ronda && agarra > 0) {
      const jarra = (doble ? ronda.detras : ronda.delante)[c.lado < 0 ? 0 : 1].g;
      // Se apoya en el lado de la jarra que da al cliente, a media altura
      this.punto.set(jarra.position.x + c.lado * 0.3, BARRA + 0.36, jarra.position.z - 0.1);
      p.cuerpo.updateWorldMatrix(true, false);
      p.cuerpo.worldToLocal(this.punto);
      const sobreLaJarra = alcanzar([this.punto.x, this.punto.y, this.punto.z], -c.lado);
      mano = [0, 1, 2].map((i) => mezclar(mano[i], sobreLaJarra[i], agarra)) as V3;
    }

    // Reacción al último juicio: puño arriba y saltito, o se echa atrás del susto
    const juzgada = ultimaJuzgada(v, 1);
    const hace = juzgada ? juzgada.hace * pulsoASegundos : Infinity;
    const acierto = juzgada !== null && juzgada.juicio !== 'miss';
    const alegria = acierto
      ? suave(tramo(hace, 0, 0.12)) * (1 - suave(tramo(hace, 0.35, 0.55)))
      : 0;
    const salto = acierto ? arco(tramo(hace, 0.04, 0.34)) : 0;
    const susto =
      juzgada && !acierto ? rebote(tramo(hace, 0.09, 0.3)) * (1 - tramo(hace, 0.5, 0.7)) : 0;
    const compas = v.notas.length ? latido(v.pulso) : 0;
    p.raiz.position.y = -0.2 + salto * 0.12;
    p.raiz.scale.y = 1.5 * (1 - 0.02 * compas);
    p.torso.rotation.x -= susto * 0.16;
    for (let i = 0; i < 3; i++) {
      c.empuja[i] = mano[i];
      c.libre[i] = mezclar(c.reposoLibre[i] - (i === 1 ? vaiven : 0), c.celebra[i], alegria);
    }

    // Miran al centro de la barra, donde van a chocar las jarras; en reposo, a quien juega
    if (ronda || hayJarrasEnCamino || hace < 0.6) this.mira.copy(this.centro);
    else this.mira.set(c.lado * 1.2, 3.2, 7);
    p.mirarA(this.mira, dt);
    p.cabeza.rotation.z = susto > 0 ? susto * 0.14 * Math.sin(hace * 24) : 0;

    if (juzgada && hace < 0.7)
      p.expresion = juzgada.juicio === 'perfect' ? 'risa' : acierto ? 'feliz' : 'sorpresa';
    else if (agarra > 0.4) p.expresion = 'concentrado';
    else p.expresion = v.notas.length ? 'feliz' : 'risa';
    p.actualizar(reloj, dt);
  }

  /** Lo que se mueve siempre: neones al compás, pantallas que parpadean y lámparas que se mecen. */
  private ambiente(v: VistaEscena, t: number): void {
    const compas = v.notas.length ? latido(v.pulso) : 0.5 + 0.5 * Math.sin(t * 2);
    this.neones.forEach((m, i) => {
      m.emissiveIntensity = 1.9 + 1.6 * (i % 2 ? compas : 1 - compas * 0.6);
    });
    this.pantallas.forEach((m, i) => {
      m.emissiveIntensity = 1.25 + 0.3 * Math.sin(t * (5 + i * 1.7) + i * 2);
    });
    this.lamparas.forEach((l, i) => {
      l.rotation.z = 0.035 * Math.sin(t * 1.1 + i * 1.3);
    });
  }

  private decorado(S: THREE.Scene): void {
    // Luces de neón de relleno, rosa a un lado y azul al otro
    const rosa = new THREE.PointLight(0xff5fb0, 30, 16);
    rosa.position.set(-6, 3.5, -3);
    const cian = new THREE.PointLight(0x4fe0ff, 26, 16);
    cian.position.set(6, 3.2, -6.5);
    S.add(rosa, cian);

    // Sala: suelo de baldosas y pared del fondo con zócalo
    malla(
      S,
      caja(30, 0.2, 24, 0.02),
      material(0xffffff, {
        rugoso: 0.35,
        barniz: 0.5,
        textura: texturaCuadros(0x3a2a55, 0x6a4a8c, 8, [6, 5]),
      }),
      [0, -0.1, -6],
    );
    malla(
      S,
      caja(30, 9, 0.3, 0.02),
      material(0x4a2f6a, { rugoso: 0.9, textura: texturaRuido(0x4a2f6a, 0.12, [6, 2]) }),
      [0, 4.5, -10],
    );
    malla(
      S,
      caja(30, 1.3, 0.4, 0.05),
      material(0x2f1d47, { rugoso: 0.6, textura: texturaMadera(0x3a2452, 3, [6, 1]) }),
      [0, 0.65, -9.85],
    );

    // Aros y estrellas de neón en la pared: laten con la música
    const aros: [number, number, number, number][] = [
      [-2.6, 4.1, 0.5, 0xff5fb0],
      [2.7, 4.2, 0.42, 0x4fe0ff],
      [-3.3, 4.6, 0.2, 0xffd23c],
      [3.3, 3.7, 0.18, 0xff5fb0],
    ];
    for (const [x, y, radio, color] of aros) {
      const m = luminoso(color, 3);
      this.neones.push(m);
      malla(S, aro(radio, 0.045), m, [x, y, -9.75]).castShadow = false;
    }
    const estrellas: [number, number, number, number][] = [
      [-2.6, 4.1, 0xffd23c, 0.26],
      [2.7, 4.2, 0xffd23c, 0.22],
      [-6.6, 4.9, 0x4fe0ff, 0.3],
      [6.4, 4.9, 0xff5fb0, 0.3],
    ];
    for (const [x, y, color, radio] of estrellas) {
      const e = estrella(S, radio, color, 2.6);
      e.position.set(x, y, -9.75);
      e.rotation.z = 0.2;
      this.neones.push(e.material as THREE.MeshStandardMaterial);
    }

    // Máquinas recreativas al fondo, cada una con su pantalla
    const maquinas: [number, number, number, number, string[]][] = [
      [-6.6, -8.2, 0.35, 0xff5f8f, ['#1a1040', '#ff5fb0', '#ffd23c', '#4fe0ff']],
      [-4.9, -8.7, 0.15, 0x4fb3ff, ['#06283a', '#7cf2c0', '#ffffff', '#ffd23c']],
      [5.0, -8.7, -0.15, 0xffc93c, ['#2a0a30', '#ff8fa3', '#4fe0ff', '#ffffff']],
      [6.7, -8.2, -0.35, 0x7cf2c0, ['#101a40', '#ffd23c', '#ff5fb0', '#4fe0ff']],
    ];
    maquinas.forEach(([x, z, giro, color, colores], i) => {
      this.recreativa(S, [x, 0, z], giro, color, colores, 40 + i);
    });

    // Mesas altas con taburete
    const acero = metal(0x8a7d97);
    for (const x of [-1.6, 1.9]) {
      malla(S, cilindro(0.75, 0.75, 0.1, 28), material(0xd9a06a, { rugoso: 0.4, barniz: 0.6 }), [
        x,
        1.5,
        -6.5,
      ]);
      malla(S, cilindro(0.08, 0.08, 1.5, 10), acero, [x, 0.75, -6.5]);
      malla(S, cilindro(0.4, 0.45, 0.06, 20), acero, [x, 0.03, -6.5]);
      malla(S, cilindro(0.32, 0.32, 0.14, 20), plastico(0xff6b6b), [x + 1.1, 1.0, -6.2]);
      malla(S, cilindro(0.05, 0.05, 1.0, 10), acero, [x + 1.1, 0.5, -6.2]);
    }

    // Lámparas colgantes sobre la barra: cuelgan de un punto alto para poder mecerse
    const pantalla = material(0xff8a5a, { rugoso: 0.4, barniz: 0.7, dobleCara: true });
    for (const x of [-3.6, 0, 3.6]) {
      const lampara = grupo(S, [x, 8.1, -0.6]);
      malla(lampara, cilindro(0.015, 0.015, 3, 6), material(0x1d1626), [0, -1.5, 0]);
      malla(
        lampara,
        torno(
          [
            [0.08, 0.5],
            [0.12, 0.42],
            [0.5, 0.05],
            [0.55, 0],
            [0.5, 0.02],
            [0.1, 0.38],
          ],
          28,
        ),
        pantalla,
        [0, -3.45, 0],
      );
      sinSombra(malla(lampara, esfera(0.17, 14, 10), luminoso(0xfff0c0, 4), [0, -3.38, 0]));
      const luz = new THREE.PointLight(0xffc88a, 4, 9);
      luz.position.set(0, -3.7, 0.2);
      lampara.add(luz);
      this.lamparas.push(lampara);
    }

    // La barra: tablero lacado, frente de madera y reposapiés dorado
    malla(
      S,
      caja(17, 0.22, 4.6, 0.08),
      material(0xc9793f, {
        rugoso: 0.3,
        barniz: 0.55,
        barnizRugoso: 0.3,
        textura: texturaMadera(0xc9793f, 3, [3, 1]),
      }),
      [0, 1.2, 1.35],
    );
    malla(
      S,
      caja(17, 1.2, 0.3, 0.05),
      material(0x7a4528, { rugoso: 0.6, textura: texturaMadera(0x7a4528, 1, [8, 1]) }),
      [0, 0.5, -0.75],
    );
    malla(S, cilindro(0.05, 0.05, 17, 10), metal(0xffd27a), [0, 1.08, -1.0], [0, 0, PI / 2]);

    // Posavasos, gotas de espuma y cuenco de aperitivos
    const posavasos: [number, number, number][] = [
      [-2.6, 1.75, 0xff8fa3],
      [-1.95, 2.15, 0x7cf2c0],
      [3.4, 1.2, 0x4fb3ff],
    ];
    for (const [x, z, color] of posavasos) {
      malla(S, cilindro(0.3, 0.3, 0.03, 24), plastico(color), [x, BARRA + 0.015, z]);
    }
    const azar = crearAzar(31);
    const blanco = material(0xfffdf2, { rugoso: 0.9 });
    const gota = esfera(1, 10, 6);
    for (let i = 0; i < 9; i++) {
      const r = 0.05 + azar() * 0.05;
      malla(
        S,
        gota,
        blanco,
        [(azar() - 0.5) * 2.4, BARRA + 0.01, 0.9 + azar() * 1.1],
        [0, 0, 0],
        [r, r * 0.35, r],
      );
    }
    const cuenco = grupo(S, [1.7, BARRA, 1.9]);
    malla(
      cuenco,
      torno(
        [
          [0.001, 0.02],
          [0.2, 0.02],
          [0.34, 0.2],
          [0.36, 0.22],
          [0.32, 0.2],
          [0.2, 0.06],
          [0.001, 0.06],
        ],
        28,
      ),
      plastico(0x4fb3ff),
    );
    const fruto = material(0xffd27a, { rugoso: 0.7 });
    for (let i = 0; i < 14; i++) {
      malla(
        cuenco,
        gota,
        fruto,
        [(azar() - 0.5) * 0.4, 0.16 + azar() * 0.08, (azar() - 0.5) * 0.4],
        [0, 0, 0],
        [0.05, 0.035, 0.05],
      );
    }
  }

  /** Máquina recreativa con la pantalla encendida; los «píxeles» se pintan al azar. */
  private recreativa(
    padre: THREE.Object3D,
    pos: V3,
    giro: number,
    color: number,
    colores: string[],
    semilla: number,
  ): void {
    const g = grupo(padre, pos, [0, giro, 0]);
    const mueble = plastico(color);
    malla(g, caja(1.3, 1.2, 1.1, 0.06), mueble, [0, 0.6, 0]);
    malla(g, caja(1.3, 0.3, 1.25, 0.06), plastico(0x2a2233), [0, 1.3, 0.1], [0.25, 0, 0]);
    malla(g, caja(1.3, 1.3, 0.9, 0.06), mueble, [0, 2.0, -0.1]);
    malla(g, caja(1.3, 0.45, 1.05, 0.06), mueble, [0, 2.85, -0.02]);
    const azar = crearAzar(semilla);
    const imagen = texturaPintada(256, 200, (c, ancho, alto) => {
      c.fillStyle = colores[0];
      c.fillRect(0, 0, ancho, alto);
      for (let i = 0; i < 46; i++) {
        c.fillStyle = colores[1 + (i % (colores.length - 1))];
        c.fillRect(
          Math.floor(azar() * (ancho / 16)) * 16,
          Math.floor(azar() * (alto / 16)) * 16,
          16 * (1 + Math.floor(azar() * 3)),
          16,
        );
      }
    });
    const mPantalla = new THREE.MeshStandardMaterial({
      map: imagen,
      emissiveMap: imagen,
      emissive: 0xffffff,
      emissiveIntensity: 1.4,
    });
    this.pantallas.push(mPantalla);
    const pantalla = malla(g, new THREE.PlaneGeometry(1.0, 0.82), mPantalla, [0, 2.0, 0.36]);
    pantalla.rotation.x = -0.12;
    pantalla.castShadow = false;
    malla(g, caja(1.15, 0.3, 0.05, 0.02), luminoso(tono(color, 0.5), 1.6), [0, 2.85, 0.52]);
    malla(g, cilindro(0.02, 0.02, 0.2, 8), metal(), [-0.3, 1.5, 0.3], [0.25, 0, 0]);
    malla(g, esfera(0.07, 12, 8), plastico(0xff5a5a), [-0.3, 1.62, 0.33]);
  }
}

export const bar3d: Definicion3d = {
  motor: {
    cielo: [
      [0, 0x2a1a44],
      [1, 0x432a5c],
    ],
    niebla: [0x3a2452, 12, 34],
    camara: [0, 3.5, 7.6],
    mira: [0, 1.95, 0],
    angulo: 30,
    sol: { pos: [-2.5, 7, 6], color: 0xffc88a, fuerza: 2.5 },
    contraluz: { pos: [6, 4, -5], color: 0x59e0ff, fuerza: 1.8 },
    ambiente: { cielo: 0xb79cff, suelo: 0xff9a6a, fuerza: 0.5 },
    exposicion: 0.94,
    reflejos: 0.2,
    resplandor: 0.3,
    foco: 7.9,
    zonaSombra: 9,
  },
  crear: (motor) => new Bar(motor),
};
