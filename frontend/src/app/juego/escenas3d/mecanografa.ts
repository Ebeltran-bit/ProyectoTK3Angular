/**
 * Escena 3D «La mecanógrafa» (difícil).
 *
 * Una mecanógrafa pasa a máquina una carta en su despacho, de noche. Igual que en la versión
 * plana, cada línea dura cuatro pulsos y la pauta del atril enseña qué hay que pulsar: en la fila
 * «AHORA» un cursor rojo recorre la línea a velocidad fija y llega a cada casilla justo en el
 * pulso de su nota (J para las letras, K para la campanilla del final); la fila «LUEGO» es la
 * línea que viene. Cada nota tiene tres tiempos:
 *  - Anticipación: la mano que toca levanta los dedos sobre su tecla (o sobre la campanilla).
 *  - Acción: al pulsar, la mano baja de golpe y la tecla se hunde (0,1 s).
 *  - Reacción: con acierto la letra queda en el papel, el carro avanza y saltan chispas; con la K
 *    suena la campanilla, el carro vuelve y el papel sube una línea. Con fallo la letra sale
 *    roja, una bola de papel arrugado sale volando al suelo y, si era la K, el carro se atasca.
 *
 * Como en las demás escenas, todo se calcula en cada fotograma a partir de la `VistaEscena`.
 */
import * as THREE from 'three';

import { Juicio } from '../evaluacion';
import { VistaEscena } from '../escenarios/tipos';
import { acercar, arco, golpe, mezclar, rebote, suave, tramo } from './animacion';
import {
  V3,
  aro,
  caja,
  cilindro,
  deformar,
  esfera,
  grupo,
  malla,
  sinSombra,
  torno,
  TuboFlexible,
} from './formas';
import { latido, notaAcertada, ultimaJuzgada } from './golpes';
import {
  crearAzar,
  luminoso,
  material,
  metal,
  plastico,
  texturaMadera,
  texturaPintada,
  texturaRayas,
} from './materiales';
import { Motor } from './motor';
import { Chispas } from './objetos';
import { alcanzar, Personaje } from './personaje';
import { Definicion3d, Escena3d } from './tipos';

const PI = Math.PI;

// --- Ritmo: los mismos números que la versión plana ---
/** Pulso en el que empieza la primera línea (después de la cuenta atrás). */
const INICIO = 4;
const PULSOS_LINEA = 4;

// --- Muebles ---
/** Altura del escritorio y de la mesita de la máquina. */
const MESA = 1.45;
const MESITA = 1.1;
/** La mesita, con la máquina y la mecanógrafa, va girada en tres cuartos hacia la cámara. */
const POS_PUESTO: V3 = [-0.55, MESITA, 1.0];
const GIRO_PUESTO = -1.15;
/** Dónde se sienta ella, en coordenadas del puesto. */
const POS_MECANOGRAFA: V3 = [0, 0.1 - MESITA, -1.38];
const ESCALA_MECANOGRAFA = 1.6;

// --- Máquina de escribir (medidas del grupo `maquina`, que va girado hacia ella) ---
const ESCALA_MAQUINA = 0.8;
/** Altura de la cara de arriba de la base, donde se apoyan teclas y campanilla. */
const BASE = 0.555;
/** Filas del teclado: profundidad (z, más cerca de ella cuanto mayor) y altura de cada fila. */
const FILAS_Z = [0.3, 0.5, 0.7];
const FILAS_Y = [0.68, 0.64, 0.6];
const RADIO_TECLA = 0.09;
const CAMPANILLA: V3 = [-1.07, BASE, 0.62];
/** El carro empieza aquí y avanza este paso con cada letra; la letra cae siempre en x = 0. */
const CARRO_X = -0.6;
const PASO_CARRO = 0.12;
const CARRO_Y = 0.95;
const CARRO_Z = -0.35;
/** Alto de la hoja y de cada renglón (8 renglones por hoja). */
const ALTO_HOJA = 1.25;
const RENGLON = ALTO_HOJA / 8;
/** Altura en la hoja (desde abajo) del renglón que se está escribiendo. */
const ALTURA_ESCRITURA = 0.33;
const MARCAS = 6;

// --- Pauta del atril (medidas de la tarjeta, de 3 × 1,23) ---
const CASILLAS = 16;
/** Una casilla por cada medio pulso: la primera en x = PRIMERA y la octava, 3,5 pulsos después. */
const PRIMERA = -0.9;
const PASO_CASILLA = 0.3;
const LADO_CASILLA = 0.24;
const FILA_AHORA = 0.24;
const FILA_LUEGO = -0.28;

/** Bolas de papel arrugado que salen al fallar (nunca hay más de tres en el aire). */
const BOLAS = 3;

/** Estados de una casilla de la pauta: cada uno tiene su material, J y K. */
type EstadoCasilla = 'pendiente' | 'hecha' | 'fallo' | 'luego';
const ESTADO = { sin: 'pendiente', perfect: 'hecha', great: 'hecha', miss: 'fallo' } as const;

/** Línea de la canción en la que cae un pulso (negativa antes de la primera). */
function lineaDe(pulso: number): number {
  return Math.floor((pulso - INICIO) / PULSOS_LINEA);
}

/**
 * Mano que toca la nota i: 1 la derecha y −1 la izquierda. La K (campanilla) es siempre de la
 * derecha, que es la que tiene cerca; las letras se alternan contando hacia atrás desde la K,
 * así la letra justo antes de la campanilla es de la izquierda y la derecha llega a tiempo.
 */
function manoDe(v: VistaEscena, i: number): number {
  if (v.teclas[i] === 'alterna') return 1;
  const linea = lineaDe(v.notas[i].pulso);
  for (let j = i + 1; j < v.notas.length && lineaDe(v.notas[j].pulso) === linea; j++) {
    if (v.teclas[j] === 'alterna') return (j - i) % 2 ? -1 : 1;
  }
  return i % 2 ? -1 : 1;
}

/** Perfil de una pieza torneada escrito en una lista plana: radio, altura, radio, altura… */
function perfil(n: number[]): [number, number][] {
  return n.flatMap((r, i) => (i % 2 ? [] : [[r, n[i + 1]] as [number, number]]));
}

/** Profundidad de la hoja curvada en una altura dada (la hoja se enrolla hacia atrás). */
function curvaHoja(y: number): number {
  return -(((y + ALTO_HOJA / 2) / ALTO_HOJA) ** 2) * 0.5;
}

/** Tecla redonda con su varilla. Se guarda dónde está para que las manos vayan a ella. */
interface Tecla {
  m: THREE.Mesh;
  y: number;
  /** Centro de la cara de arriba, en coordenadas de la escena. */
  arriba: THREE.Vector3;
}

class Mecanografa implements Escena3d {
  readonly palabra: Escena3d['palabra'];
  private readonly puesto: THREE.Group;
  private readonly maquina: THREE.Group;
  private readonly p: Personaje;
  // Pauta
  private readonly casillas: THREE.Mesh[] = [];
  private readonly mCasillas: Record<EstadoCasilla, THREE.Material[]>;
  private readonly marco: THREE.Mesh;
  private readonly cursor: THREE.Mesh;
  // Máquina
  private readonly teclas: Tecla[] = [];
  /** Teclas de cada mano que quedan a su alcance: [izquierda, derecha]. */
  private readonly teclasMano: Tecla[][] = [[], []];
  private readonly mTecla = material(0xfff3dc, { rugoso: 0.3, barniz: 0.6 });
  private readonly mTeclaPulsada = luminoso(0xffe58a, 1.2);
  private readonly carro: THREE.Group;
  private readonly texturaHoja: THREE.Texture;
  private readonly marcas: THREE.Mesh[] = [];
  private readonly mTinta = material(0x2a2233, { rugoso: 0.6 });
  private readonly mErrata = material(0xe0435f, { rugoso: 0.5, luz: 0xe0435f, fuerzaLuz: 0.4 });
  private readonly campana: THREE.Group;
  private readonly boton: THREE.Mesh;
  private readonly ondas: THREE.Mesh[] = [];
  private readonly mOnda = material(0xfff2a0, { luz: 0xfff2a0, fuerzaLuz: 1.6, opacidad: 0.8 });
  private readonly arribaCampana = new THREE.Vector3();
  private readonly puntoLetra = new THREE.Vector3();
  // Reacciones y decorado que se mueve
  private readonly bolas: THREE.Mesh[] = [];
  private readonly salidaBola = new THREE.Vector3();
  private readonly chispas: Chispas;
  private readonly vapor: THREE.Mesh[] = [];
  private readonly planta: THREE.Group;
  private readonly luzFlexo: THREE.PointLight;
  /** Altura del taburete donde se sienta ella (su posición sin saltitos). */
  private posY = 0;
  /** Cuánto mira ella a la campanilla (0 a 1); cambia poco a poco. */
  private aCampana = 0;
  // Vectores de trabajo: se reutilizan para no crear objetos nuevos en cada fotograma
  private readonly punto = new THREE.Vector3();
  private readonly mira = new THREE.Vector3();
  private readonly camara: THREE.Vector3;
  /** Madera barnizada del escritorio y de la mesita. */
  private readonly roble = material(0xd9a06a, {
    rugoso: 0.42,
    barniz: 0.4,
    barnizRugoso: 0.35,
    textura: texturaMadera(0xd9a06a, 4, [1, 1]),
  });

  constructor(motor: Motor) {
    const S = motor.escena;
    this.camara = motor.camara.position.clone();
    this.decorado(S);
    this.planta = this.maceta(S);
    this.luzFlexo = this.flexo(S);

    // Puesto de trabajo: mesita, taburete, máquina y mecanógrafa giran juntos
    this.puesto = grupo(S, POS_PUESTO, [0, GIRO_PUESTO, 0]);
    this.mesita(S, this.puesto);
    this.maquina = grupo(this.puesto, [0, 0, 0], [0, PI, 0], ESCALA_MAQUINA);
    this.crearCuerpoMaquina();
    this.carro = grupo(this.maquina, [CARRO_X, CARRO_Y, CARRO_Z]);
    this.texturaHoja = this.crearCarro();
    const { campana, boton } = this.crearCampanilla();
    this.campana = campana;
    this.boton = boton;

    // Pauta del atril, con su cursor y el marco de la casilla que toca
    // Colores de cada estado: [fondo de la J, fondo de la K, borde, letra]
    const estilo = (fondoJ: string, fondoK: string, borde: string, letra: string) => [
      this.materialCasilla('J', fondoJ, borde, letra),
      this.materialCasilla('K', fondoK, borde, letra),
    ];
    this.mCasillas = {
      pendiente: estilo('#ffffff', '#ffb300', '#3a2e4a', '#3a2e4a'),
      hecha: estilo('#8a7d97', '#7cc9a0', '#3a2e4a', '#ffffff'),
      fallo: estilo('#e0435f', '#e0435f', '#7a1e30', '#ffffff'),
      luego: estilo('#f6ead0', '#f2d28a', '#9a8aac', '#9a8aac'),
    };
    const tarjeta = this.crearAtril(S);
    const cuadrado = new THREE.PlaneGeometry(LADO_CASILLA, LADO_CASILLA);
    for (let i = 0; i < CASILLAS; i++) {
      this.casillas.push(sinSombra(malla(tarjeta, cuadrado, this.mCasillas.luego[0])));
    }
    const marcoRojo = texturaPintada(128, 128, (c) => {
      c.strokeStyle = '#ff3b4a';
      c.lineWidth = 12;
      c.beginPath();
      c.roundRect(8, 8, 112, 112, 26);
      c.stroke();
    });
    const mMarco = new THREE.MeshStandardMaterial({ map: marcoRojo, transparent: true });
    this.marco = sinSombra(malla(tarjeta, cuadrado, mMarco, [0, 0, 0], [0, 0, 0], 1.35));
    const rojo = material(0xff3b4a, { luz: 0xff3b4a, fuerzaLuz: 0.7 });
    this.cursor = sinSombra(malla(tarjeta, caja(0.035, 0.36, 0.02, 0.012), rojo));

    // Bolas de papel de los fallos, chispas de los aciertos
    const arrugada = deformar(esfera(0.13, 12, 9), (v) => {
      // Abolladuras que dependen solo del punto: así las costuras de la esfera no se abren
      v.multiplyScalar(1 + 0.16 * Math.sin(v.x * 61) * Math.sin(v.y * 53 + v.z * 47));
    });
    const papel = material(0xfffdf6, { rugoso: 0.9 });
    for (let i = 0; i < BOLAS; i++) this.bolas.push(malla(S, arrugada, papel));
    this.chispas = new Chispas(S, 10, [0xffd23c, 0xffffff, 0xff8fa3]);

    // Mecanógrafa sentada en el taburete, frente a la máquina
    this.puesto.updateMatrixWorld(true);
    const pos = this.puesto.localToWorld(new THREE.Vector3(...POS_MECANOGRAFA));
    this.p = this.crearMecanografa(S, [pos.x, pos.y, pos.z]);

    // Puntos fijos que se usan en cada fotograma: dónde cae la letra y de dónde salen las bolas
    this.maquina.localToWorld(this.puntoLetra.set(0, CARRO_Y + 0.45, CARRO_Z));
    this.maquina.localToWorld(this.salidaBola.set(-0.3, CARRO_Y + 0.5, CARRO_Z - 0.2));
    this.campana.localToWorld(this.arribaCampana.set(0, 0.36, 0));
    this.repartirTeclas();

    this.palabra = {
      ...motor.proyectar([-0.85, 2.77, 1.2]),
      aciertos: ['¡Tac!', '¡Clac!', '¡Tic!'],
    };
  }

  actualizar(v: VistaEscena, reloj: number, dt: number): void {
    const pulsoASegundos = 60 / v.bpm;
    const linea = Math.max(0, lineaDe(v.pulso));
    // Pulsos que lleva la línea actual (de 0 a 4); antes de empezar, 0
    const enLinea = Math.max(0, v.pulso - INICIO - linea * PULSOS_LINEA);
    this.ambiente(v, reloj);
    this.moverPauta(v, linea, enLinea, pulsoASegundos);
    this.moverCarro(v, linea, enLinea, pulsoASegundos);
    this.moverCampanilla(v);
    this.moverBolas(v, pulsoASegundos);

    const acertada = notaAcertada(v);
    const enCampana = acertada !== null && v.teclas[acertada] === 'alterna';
    const perfecta = acertada !== null && v.notas[acertada].juicio === 'perfect';
    this.chispas.actualizar(
      enCampana ? this.arribaCampana : this.puntoLetra,
      acertada === null ? -1 : v.desdePulsacion,
      perfecta ? 1.3 : 0.9,
    );
    this.moverMecanografa(v, reloj, dt, pulsoASegundos);
  }

  // ---------- Pauta ----------

  /**
   * Coloca las casillas de la línea actual y de la siguiente, el cursor (recorre la línea a
   * velocidad fija y pasa por cada casilla en el pulso de su nota) y el marco de la que toca.
   */
  private moverPauta(v: VistaEscena, linea: number, enLinea: number, pulsoASegundos: number): void {
    for (const c of this.casillas) c.visible = false;
    let siguiente: THREE.Mesh | null = null;
    let faltaSiguiente = Infinity;
    v.notas.forEach((n, i) => {
      const l = lineaDe(n.pulso);
      if (l !== linea && l !== linea + 1) return;
      const ahora = l === linea;
      const casilla = this.casillas[i % CASILLAS];
      const esK = v.teclas[i] === 'alterna' ? 1 : 0;
      const pulsoEnLinea = n.pulso - INICIO - l * PULSOS_LINEA;
      casilla.visible = true;
      const x = PRIMERA + pulsoEnLinea * 2 * PASO_CASILLA;
      casilla.position.set(x, ahora ? FILA_AHORA : FILA_LUEGO, 0.012);
      const estado: EstadoCasilla = ahora ? ESTADO[n.juicio ?? 'sin'] : 'luego';
      casilla.material = this.mCasillas[estado][esK];
      // Al acertar la casilla da un saltito; al fallar tiembla
      const hace = Math.max(0, (v.pulso - n.pulso) * pulsoASegundos);
      const salto = estado === 'hecha' ? 0.3 * golpe(hace, 0.25) : 0;
      casilla.scale.setScalar((ahora ? 1 : 0.85) * (1 + salto));
      casilla.rotation.z = estado === 'fallo' ? 0.3 * golpe(hace, 0.4) * Math.sin(hace * 40) : 0;
      const falta = n.pulso - v.pulso;
      if (ahora && n.juicio === null && falta < faltaSiguiente) {
        faltaSiguiente = falta;
        siguiente = casilla;
      }
    });

    // El marco rojo rodea la próxima casilla y se cierra sobre ella justo en su pulso
    const objetivo = siguiente as THREE.Mesh | null;
    this.marco.visible = objetivo !== null && v.pulso >= INICIO - 1;
    if (objetivo) {
      this.marco.position.set(objetivo.position.x, objetivo.position.y, 0.02);
      this.marco.scale.setScalar(1.35 * (1 + 0.25 * tramo(faltaSiguiente, 0, 0.5)));
    }
    this.cursor.visible = v.pulso >= INICIO;
    this.cursor.position.set(PRIMERA + enLinea * 2 * PASO_CASILLA, FILA_AHORA, 0.03);
  }

  // ---------- Máquina ----------

  /**
   * El carro avanza un paso con cada letra de la línea (acertada o fallada, como en la plana)
   * y, al acertar la K, vuelve al principio mientras el papel sube un renglón. Si la K se
   * falla, el carro se atasca y no vuelve hasta que empieza la línea siguiente.
   */
  private moverCarro(v: VistaEscena, linea: number, enLinea: number, pulsoASegundos: number): void {
    let letras = 0;
    let k = 0;
    let juicioK: Juicio | null = null;
    for (const m of this.marcas) m.visible = false;
    for (let i = 0; i < v.notas.length; i++) {
      const n = v.notas[i];
      if (lineaDe(n.pulso) !== linea || v.pulso < INICIO) continue;
      if (v.teclas[i] === 'alterna') {
        juicioK = n.juicio;
        continue;
      }
      const posicion = k++;
      if (n.juicio === null) continue;
      // El carro da su paso en una décima de segundo
      const hace = Math.max(0, (v.pulso - n.pulso) * pulsoASegundos);
      letras += suave(tramo(hace, 0, 0.1));
      const marca = this.marcas[posicion % MARCAS];
      marca.visible = true;
      marca.material = n.juicio === 'miss' ? this.mErrata : this.mTinta;
      marca.position.x = -CARRO_X - posicion * PASO_CARRO;
    }

    const acertoK = juicioK === 'perfect' || juicioK === 'great';
    const retorno = acertoK
      ? suave(tramo(enLinea, 3.08, 3.45))
      : juicioK === 'miss'
        ? tramo(enLinea, 3.85, 4)
        : 0;
    const atasco = juicioK === 'miss' ? golpe(enLinea - 3.15, 0.7) : 0;
    this.carro.position.x =
      CARRO_X + letras * PASO_CARRO * (1 - retorno) + 0.03 * atasco * Math.sin(enLinea * 70);

    // Con la K acertada el papel sube un renglón; las letras suben con él
    const sube = acertoK ? suave(tramo(enLinea, 3.1, 3.55)) : 0;
    this.texturaHoja.offset.y = -(linea + sube) / 8;
    const y = -ALTO_HOJA / 2 + ALTURA_ESCRITURA + sube * RENGLON;
    for (const m of this.marcas) {
      m.position.y = y;
      m.position.z = curvaHoja(y) - 0.012;
    }
  }

  /** La campanilla suena al acertar la K: el botón se hunde, la campana tiembla y salen ondas. */
  private moverCampanilla(v: VistaEscena): void {
    const d = v.desdePulsacion;
    const pulsada = v.ultimaTecla === 'alterna' ? 1 - tramo(d, 0.05, 0.14) : 0;
    this.boton.position.y = 0.33 - 0.05 * pulsada;
    const acertada = notaAcertada(v);
    const suena = acertada !== null && v.teclas[acertada] === 'alterna';
    const tiembla = suena ? golpe(d, 0.6) : 0;
    this.campana.rotation.z = 0.12 * tiembla * Math.sin(d * 45);
    this.ondas.forEach((o, i) => {
      const k = tramo(d - i * 0.12, 0, 0.5);
      o.visible = suena && k > 0 && k < 1;
      o.scale.setScalar(0.8 + 1.6 * k);
    });
    this.mOnda.opacity = 0.8 * (1 - tramo(d, 0.1, 0.62));
  }

  // ---------- Fallos ----------

  /** Cada fallo arranca una bola de papel arrugado que sale volando del carro y cae al suelo. */
  private moverBolas(v: VistaEscena, pulsoASegundos: number): void {
    for (const b of this.bolas) b.visible = false;
    v.notas.forEach((n, i) => {
      if (n.juicio !== 'miss') return;
      const pulsos = v.pulso - n.pulso;
      if (pulsos < 0 || pulsos > 1.45) return;
      // Una nota sin pulsar no se da por fallada hasta que pasa la ventana de 90 ms
      const hace = Math.max(0, pulsos * pulsoASegundos - 0.09);
      const bola = this.bolas[i % BOLAS];
      const vuelo = tramo(hace, 0, 0.55);
      // Cada una cae en un sitio distinto del suelo, delante de la mesita
      const destinoX = 0.9 + (i % BOLAS) * 0.45;
      const destinoZ = 2.3 + (i % 2) * 0.35;
      bola.visible = true;
      bola.position.set(
        mezclar(this.salidaBola.x, destinoX, vuelo),
        mezclar(this.salidaBola.y, 0.12, vuelo * vuelo) + 0.55 * arco(vuelo),
        mezclar(this.salidaBola.z, destinoZ, vuelo),
      );
      bola.rotation.set(hace * 9, hace * 6, 0);
      // Aparece de golpe y se encoge al final para dejar sitio a la siguiente
      bola.scale.setScalar(rebote(tramo(hace, 0, 0.12)) * (1 - suave(tramo(pulsos, 1.1, 1.45))));
    });
  }

  // ---------- Mecanógrafa ----------

  private moverMecanografa(v: VistaEscena, reloj: number, dt: number, pulsoASegundos: number) {
    const p = this.p;
    const compas = v.notas.length ? latido(v.pulso) : 0;

    // Reacción al último juicio: saltito en el taburete o susto
    const juzgada = ultimaJuzgada(v, 1.2);
    const hace = juzgada ? juzgada.hace * pulsoASegundos : Infinity;
    const acierto = juzgada !== null && juzgada.juicio !== 'miss';
    const perfecto = juzgada?.juicio === 'perfect';
    const salto = acierto ? arco(tramo(hace, 0.02, 0.26)) * (perfecto ? 1 : 0.5) : 0;
    const susto =
      juzgada && !acierto
        ? rebote(tramo(hace, 0.09, 0.28)) * (1 - suave(tramo(hace, 0.45, 0.7)))
        : 0;
    p.raiz.position.y = this.posY + 0.05 * salto;
    p.raiz.scale.y = ESCALA_MECANOGRAFA * (1 - 0.015 * compas);
    p.torso.rotation.x = 0.1 + 0.03 * compas - 0.14 * susto;
    p.torso.rotation.z = 0.04 * Math.sin(v.pulso * PI) * (v.notas.length ? 1 : 0);
    // Marca el compás con el pie
    p.pieD[1] = 0.08 + 0.04 * compas;

    const proxima = this.moverManos(v);

    // Mira las teclas; antes y después de la campanilla, a la campanilla; tras un fallo o sin
    // notas cerca, a quien juega
    const vaCampana =
      proxima !== null && v.teclas[proxima] === 'alterna' && v.notas[proxima].pulso - v.pulso < 1;
    const vieneCampana = juzgada !== null && v.teclas[juzgada.indice] === 'alterna' && hace < 0.4;
    this.aCampana = acercar(this.aCampana, vaCampana || vieneCampana ? 1 : 0, 10, dt);
    const lejos = proxima === null || v.notas[proxima].pulso - v.pulso > 2.5;
    if ((juzgada && !acierto && hace < 0.6) || (lejos && (!juzgada || hace > 0.8))) {
      this.mira.copy(this.camara);
    } else {
      this.mira.copy(this.puntoLetra).lerp(this.arribaCampana, 0.55 + 0.45 * this.aCampana);
    }
    p.mirarA(this.mira, dt);
    p.cabeza.rotation.z = susto > 0 ? susto * 0.13 * Math.sin(hace * 26) : 0.05 * compas;

    if (juzgada && hace < (acierto ? 0.4 : 0.6)) {
      if (acierto) p.expresion = perfecto ? 'risa' : 'feliz';
      else p.expresion = hace < 0.32 ? 'sorpresa' : 'triste';
    } else p.expresion = lejos ? 'feliz' : 'concentrado';
    p.actualizar(reloj, dt);
  }

  /**
   * Coloca las dos manos. Cada mano va de la tecla de su nota anterior a la de su nota
   * siguiente; justo antes de su nota levanta los dedos (anticipación) y, al pulsar, la mano
   * de esa nota baja de golpe y hunde la tecla (acción). Devuelve la próxima nota sin juzgar.
   */
  private moverManos(v: VistaEscena): number | null {
    // Qué nota y qué mano corresponden a la última pulsación (también si no acertó nada)
    const pulsoPulsacion = v.pulso - (v.desdePulsacion * v.bpm) / 60;
    let golpeada = -1;
    let distancia = 0.75;
    v.notas.forEach((n, i) => {
      const d = Math.abs(n.pulso - pulsoPulsacion);
      if (d < distancia && (v.teclas[i] === 'alterna') === (v.ultimaTecla === 'alterna')) {
        distancia = d;
        golpeada = i;
      }
    });
    const abajo = Number.isFinite(v.desdePulsacion) ? 1 - tramo(v.desdePulsacion, 0.05, 0.12) : 0;
    const ladoGolpe = v.ultimaTecla === 'alterna' ? 1 : golpeada >= 0 ? manoDe(v, golpeada) : -1;
    const teclaGolpe =
      v.ultimaTecla === 'alterna' ? null : this.teclaDe(golpeada >= 0 ? golpeada : 0, ladoGolpe);

    // Teclas en reposo; la pulsada se hunde y se enciende
    for (const t of this.teclas) {
      const pulsada = t === teclaGolpe && abajo > 0;
      t.m.position.y = t.y - (pulsada ? 0.05 * abajo : 0);
      t.m.material = pulsada ? this.mTeclaPulsada : this.mTecla;
    }

    let proxima: number | null = null;
    const compas = v.notas.length ? latido(v.pulso) : 0;
    for (const lado of [-1, 1]) {
      let anterior = -1;
      let siguiente = -1;
      for (let i = 0; i < v.notas.length; i++) {
        const n = v.notas[i];
        if (n.pulso < v.pulso - 2 || n.pulso > v.pulso + 3) continue;
        if (manoDe(v, i) !== lado) continue;
        if (n.pulso <= v.pulso + 0.02) anterior = i;
        else if (siguiente < 0) siguiente = i;
      }
      for (const i of [anterior, siguiente]) {
        if (i >= 0 && v.notas[i].juicio === null && (proxima === null || i < proxima)) proxima = i;
      }
      const falta = siguiente >= 0 ? v.notas[siguiente].pulso - v.pulso : Infinity;
      // De la tecla anterior (o de la de reposo, si hace rato) a la siguiente
      const propias = this.teclasMano[lado < 0 ? 0 : 1];
      const casa = propias[Math.min(2, propias.length - 1)].arriba;
      this.punto.copy(anterior >= 0 ? this.arribaDe(anterior, lado) : casa);
      if (anterior >= 0) {
        this.punto.lerp(casa, suave(tramo(v.pulso - v.notas[anterior].pulso, 1, 1.8)));
      }
      const viaje = siguiente >= 0 ? suave(tramo(falta, 0.85, 0.3)) : 0;
      if (siguiente >= 0) this.punto.lerp(this.arribaDe(siguiente, lado), viaje);
      // Altura sobre la tecla: arco al cambiar de tecla y dedos arriba justo antes de la nota
      let alto = 0.05 + 0.12 * arco(viaje) + 0.1 * suave(tramo(falta, 0.4, 0.12)) + 0.02 * compas;
      if (lado === ladoGolpe && abajo > 0) {
        const destino = teclaGolpe ? teclaGolpe.arriba : this.arribaCampana;
        this.punto.lerp(destino, abajo);
        alto = mezclar(alto, 0, abajo);
      }
      this.punto.y += 0.1 + alto;
      this.colocarMano(lado, this.punto);
    }
    return proxima;
  }

  /** Dónde está la tecla (o la campanilla) que toca la nota i con esa mano. */
  private arribaDe(i: number, lado: number): THREE.Vector3 {
    const tecla = this.teclaDe(i, lado);
    return tecla ? tecla.arriba : this.arribaCampana;
  }

  /** Tecla de una nota: fija para cada nota, entre las que la mano alcanza. La K no tiene. */
  private teclaDe(i: number, lado: number): Tecla | null {
    const lista = this.teclasMano[lado < 0 ? 0 : 1];
    return lista[(i * 7 + 3) % lista.length];
  }

  /** Pasa un punto de la escena a la mano del personaje, sin estirar el brazo de más. */
  private colocarMano(lado: number, punto: THREE.Vector3): void {
    const p = this.p;
    p.cuerpo.updateWorldMatrix(true, false);
    p.cuerpo.worldToLocal(punto);
    const mano = alcanzar([punto.x, punto.y, punto.z], lado);
    const destino = lado > 0 ? p.manoD : p.manoI;
    for (let i = 0; i < 3; i++) destino[i] = mano[i];
  }

  /** Lo que se mueve siempre: el vapor del café, la planta y el zumbido del flexo. */
  private ambiente(v: VistaEscena, t: number): void {
    this.vapor.forEach((m, i) => {
      const k = (t * 0.35 + i / this.vapor.length) % 1;
      // Se va hacia la derecha al subir, para no tapar la pauta que queda detrás
      m.position.set(0.5 * Math.sqrt(k) + 0.04 * Math.sin(t * 1.3 + i * 2), 0.45 + k * 0.7, 0);
      m.scale.setScalar(0.6 + k * 0.9 - (k > 0.75 ? (k - 0.75) * 5 : 0));
    });
    const compas = v.notas.length ? latido(v.pulso) : 0;
    this.planta.rotation.z = 0.03 * Math.sin(t * 0.9);
    this.planta.rotation.x = 0.02 * Math.sin(t * 0.7 + 1) + 0.015 * compas;
    this.luzFlexo.intensity = 14 + 0.8 * Math.sin(t * 9) * Math.sin(t * 2.3);
  }

  // ---------- Construcción ----------

  /** Reparte las teclas entre las manos: cada una se queda con las de su lado que alcanza. */
  private repartirTeclas(): void {
    const p = this.p;
    p.cuerpo.updateWorldMatrix(true, false);
    for (const t of this.teclas) {
      this.punto.copy(t.arriba);
      this.punto.y += 0.1;
      p.cuerpo.worldToLocal(this.punto);
      const lado = this.punto.x > 0.02 ? 1 : this.punto.x < -0.02 ? -1 : 0;
      if (lado === 0) continue;
      const hombro = [lado * 0.15, 0.93, 0];
      const d = Math.hypot(this.punto.x - hombro[0], this.punto.y - hombro[1], this.punto.z);
      if (d < 0.7) this.teclasMano[lado < 0 ? 0 : 1].push(t);
    }
  }

  private crearMecanografa(S: THREE.Scene, pos: V3): Personaje {
    this.posY = pos[1];
    const p = new Personaje(S, {
      pos,
      giro: GIRO_PUESTO,
      escala: ESCALA_MECANOGRAFA,
      sentado: true,
      piel: 0xf3c09a,
      ropa: 0x4fb7a8,
      pantalon: 0x6a5a9c,
      zapatos: 0xff6b6b,
      pelo: ['moño', 0xd9552b],
      cuello: 0xfff3dc,
      cejas: 0xb5431e,
      desfase: 0.8,
    });
    p.pieI.splice(0, 3, -0.12, 0.08, 0.4);
    p.pieD.splice(0, 3, 0.12, 0.08, 0.4);
    const cab = p.cabeza;
    const R = p.radioCabeza;
    // Gafas redondas rojas: dos aros delante de los ojos, el puente y las patillas
    const montura = material(0xff6b6b, { rugoso: 0.4, barniz: 0.4 });
    for (const s of [1, -1]) {
      const ojo: V3 = [s * R * 0.37, R * 0.06, R * 0.95];
      malla(cab, aro(R * 0.27, R * 0.035), montura, ojo, [0, s * 0.2, 0]);
      const patilla = cilindro(R * 0.025, R * 0.025, R * 0.75, 6);
      malla(cab, patilla, montura, [s * R * 0.72, R * 0.08, R * 0.5], [PI / 2, s * 0.55, 0], 1);
    }
    const puente = cilindro(R * 0.03, R * 0.03, R * 0.2, 6);
    malla(cab, puente, montura, [0, R * 0.08, R * 0.99], [0, 0, PI / 2]);
    // Lápiz clavado en el moño
    const lapiz = grupo(cab, [R * 0.05, R * 1.15, -R * 0.3], [0.2, 0, -0.9]);
    malla(lapiz, cilindro(R * 0.04, R * 0.04, R * 0.9, 6), plastico(0xffc93c));
    malla(lapiz, cilindro(0.001, R * 0.04, R * 0.14, 6), material(0xf3c09a), [0, R * 0.52, 0]);
    // Botones de la blusa
    const nacar = plastico(0xfff3dc);
    for (const y of [0.96, 0.86]) {
      malla(p.cuerpo, esfera(0.022, 10, 8), nacar, [0, y, 0.165 + (0.96 - y) * 0.06]);
    }
    return p;
  }

  /** Mesita de la máquina, taburete y alfombra. */
  private mesita(S: THREE.Scene, T: THREE.Group): void {
    // La mesita va de frente a la cámara, como en la propuesta; solo la máquina va girada
    const patas = material(0xa8703f, { rugoso: 0.7 });
    // Un poco desplazada hacia ella para que la base de la máquina no quede en el aire
    const [x0, z0] = [POS_PUESTO[0] + 0.05, POS_PUESTO[2]];
    malla(S, caja(2.16, 0.14, 2.3, 0.06), this.roble, [x0, MESITA - 0.07, z0]);
    const pata = cilindro(0.06, 0.05, MESITA - 0.1, 10);
    for (const x of [-1, 1]) {
      for (const z of [-1, 1]) {
        malla(S, pata, patas, [x0 + x * 0.98, (MESITA - 0.1) / 2, z0 + z * 1.05]);
      }
    }
    // Taburete
    const taburete = grupo(T, [0, -MESITA, POS_MECANOGRAFA[2] - 0.05]);
    malla(taburete, cilindro(0.5, 0.5, 0.14, 28), plastico(0x4fd1c5), [0, 0.8, 0]);
    const patita = cilindro(0.045, 0.04, 0.78, 8);
    for (const a of [0.8, 2.4, 4.0, 5.5]) {
      malla(taburete, patita, patas, [Math.cos(a) * 0.36, 0.39, Math.sin(a) * 0.36]);
    }
  }

  /** Base lacada, cuerpo de arriba, teclado y barra espaciadora. */
  private crearCuerpoMaquina(): void {
    const mq = this.maquina;
    const laca = material(0xff6b6b, { rugoso: 0.22, barniz: 1, barnizRugoso: 0.1 });
    malla(mq, caja(2.5, BASE, 1.8, 0.2), laca, [0, BASE / 2, 0.05]);
    malla(mq, caja(2.3, 0.4, 0.75, 0.16), laca, [0, 0.62, -0.25]);
    const varilla = cilindro(0.012, 0.012, 1, 6);
    const acero = metal(0x8a93a6);
    FILAS_Z.forEach((z, f) => {
      const y = FILAS_Y[f];
      const cuantas = f % 2 ? 7 : 8;
      for (let c = 0; c < cuantas; c++) {
        const x = -0.75 + c * 0.23 + (f % 2) * 0.115;
        const m = malla(mq, cilindro(RADIO_TECLA, RADIO_TECLA, 0.06, 16), this.mTecla, [x, y, z]);
        const largo = y - BASE;
        malla(mq, varilla, acero, [x, BASE + largo / 2, z], [0, 0, 0], [1, largo, 1]);
        const arriba = new THREE.Vector3(x, y + 0.03, z);
        this.teclas.push({ m, y, arriba });
      }
    });
    malla(mq, caja(1.6, 0.06, 0.14, 0.03), this.mTecla, [0, BASE + 0.03, 0.87]);
    // Las posiciones de las teclas, en coordenadas de la escena (la máquina no se mueve)
    this.puesto.updateMatrixWorld(true);
    for (const t of this.teclas) mq.localToWorld(t.arriba);
  }

  /** Carro: rodillo con sus pomos, palanca y la hoja curvada con las letras de la línea. */
  private crearCarro(): THREE.Texture {
    const carro = this.carro;
    const caucho = material(0x2a2233, { rugoso: 0.5 });
    malla(carro, cilindro(0.17, 0.17, 3.0, 24), caucho, [0, 0, 0], [0, 0, PI / 2]);
    const pomo = metal(0xdfe6f0);
    for (const s of [-1, 1]) {
      malla(carro, cilindro(0.24, 0.24, 0.12, 24), pomo, [s * 1.56, 0, 0], [0, 0, PI / 2]);
    }
    const palanca = new TuboFlexible(() => 0.035, 10, 8);
    palanca.colocar([1.6, 0.05, 0.1], [2.0, 0.35, 0.25], [2.1, 0.32, 0.6]);
    malla(carro, palanca.geometria, pomo);
    malla(carro, esfera(0.09, 14, 10), plastico(0x2a2233), [2.1, 0.32, 0.6]);

    // Hoja: renglones grises que se repiten, para que el papel pueda subir sin fin
    const textura = texturaPintada(256, 512, (c, ancho, alto) => {
      c.fillStyle = '#fffdf6';
      c.fillRect(0, 0, ancho, alto);
      c.fillStyle = '#c9c0d8';
      for (let i = 0; i < 8; i++) {
        c.fillRect(34, i * (alto / 8) + 26, 130 + ((i * 53) % 70), 12);
      }
    });
    textura.wrapT = THREE.RepeatWrapping;
    const hoja = malla(
      carro,
      deformar(new THREE.PlaneGeometry(1.7, ALTO_HOJA, 4, 12), (p) => {
        p.z = curvaHoja(p.y);
      }),
      material(0xffffff, { rugoso: 0.8, textura, dobleCara: true }),
      [0, 0.7, 0],
      [-0.1, 0, 0],
    );
    // Letras del renglón actual: van en la hoja, por la cara que ve la cámara
    const letra = caja(0.07, 0.08, 0.01, 0.005);
    for (let i = 0; i < MARCAS; i++) {
      this.marcas.push(sinSombra(malla(hoja, letra, this.mTinta)));
    }
    return textura;
  }

  /** Campanilla de mostrador en la esquina de la base, al alcance de la mano derecha. */
  private crearCampanilla(): { campana: THREE.Group; boton: THREE.Mesh } {
    const pie = grupo(this.maquina, CAMPANILLA);
    const oro = material(0xffd23c, { rugoso: 0.2, metal: 0.85 });
    malla(pie, cilindro(0.2, 0.22, 0.05, 24), material(0x7a4a36, { rugoso: 0.6 }), [0, 0.025, 0]);
    const campana = grupo(pie, [0, 0.05, 0]);
    malla(campana, new THREE.SphereGeometry(0.18, 24, 12, 0, PI * 2, 0, PI / 2), oro);
    malla(campana, cilindro(0.015, 0.015, 0.12, 6), metal(0xdfe6f0), [0, 0.22, 0]);
    const boton = malla(campana, esfera(0.045, 14, 10), oro, [0, 0.33, 0]);
    for (let i = 0; i < 2; i++) {
      const o = sinSombra(malla(pie, aro(0.24, 0.012), this.mOnda, [0, 0.2, 0], [PI / 2, 0, 0]));
      o.visible = false;
      this.ondas.push(o);
    }
    return { campana, boton };
  }

  /** Material de una casilla de la pauta: cuadrado redondeado con su letra. */
  private materialCasilla(letra: string, fondo: string, borde: string, tinta: string) {
    const textura = texturaPintada(128, 128, (c) => {
      c.fillStyle = fondo;
      c.strokeStyle = borde;
      c.lineWidth = 10;
      c.beginPath();
      c.roundRect(8, 8, 112, 112, 26);
      c.fill();
      c.stroke();
      c.fillStyle = tinta;
      c.font = '700 74px system-ui, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(letra, 64, 70);
    });
    return new THREE.MeshStandardMaterial({ map: textura, transparent: true, roughness: 0.8 });
  }

  /** Atril sobre el escritorio con la tarjeta de la pauta. Devuelve la tarjeta. */
  private crearAtril(S: THREE.Scene): THREE.Object3D {
    const at = grupo(S, [-2.95, MESA, 1.3], [0, 0.12, 0], 0.9);
    const nogal = material(0x7a4a36, { rugoso: 0.6 });
    malla(at, caja(1.6, 0.1, 0.7, 0.04), nogal, [0, 0.05, 0]);
    malla(at, cilindro(0.05, 0.05, 0.8, 10), nogal, [0, 0.45, -0.15], [0.25, 0, 0]);
    const carton = material(0xe3cfa4, { rugoso: 0.7 });
    const tabla = malla(at, caja(3.1, 1.3, 0.07, 0.04), carton, [0, 0.98, 0], [-0.22, 0, 0]);
    // Fondo: rótulos AHORA y LUEGO y un puntito en cada medio pulso de las dos filas
    const fondo = texturaPintada(1024, 420, (c, ancho, alto) => {
      c.fillStyle = '#ffe9bd';
      c.fillRect(0, 0, ancho, alto);
      c.font = '700 34px system-ui, sans-serif';
      c.textBaseline = 'middle';
      const enX = (x: number) => ((x + 1.5) / 3) * ancho;
      const enY = (y: number) => ((0.615 - y) / 1.23) * alto;
      c.fillStyle = '#d93b4a';
      c.fillText('AHORA', 14, enY(FILA_AHORA));
      c.fillStyle = '#8a7d97';
      c.fillText('LUEGO', 14, enY(FILA_LUEGO));
      c.fillStyle = '#e0cfae';
      for (const y of [FILA_AHORA, FILA_LUEGO]) {
        for (let s = 0; s < 8; s++) {
          c.beginPath();
          c.arc(enX(PRIMERA + s * PASO_CASILLA), enY(y), 9, 0, PI * 2);
          c.fill();
        }
      }
    });
    const papel = material(0xffffff, { rugoso: 0.9, textura: fondo });
    return malla(tabla, new THREE.PlaneGeometry(3.0, 1.23), papel, [0, 0, 0.04]);
  }

  private decorado(S: THREE.Scene): void {
    const azar = crearAzar(19);
    // Despacho: pared a rayas y suelo de madera
    const pared = texturaRayas(0x6a5a9c, 0x7466a8, 8, [12, 1]);
    const tarima = texturaMadera(0x9a6442, 8, [3, 2]);
    const alfombra = texturaRayas(0xff8fa3, 0xffa3b3, 8, [2, 1]);
    const mPared = material(0x7466a8, { rugoso: 0.9, textura: pared });
    malla(S, caja(30, 12, 0.3, 0.02), mPared, [0, 6, -4.4]);
    const mSuelo = material(0xa06a46, { rugoso: 0.6, textura: tarima });
    malla(S, caja(30, 0.2, 14, 0.02), mSuelo, [0, -0.1, 0]);
    const mAlfombra = material(0xffa3b3, { rugoso: 1, textura: alfombra });
    malla(S, cilindro(2.6, 2.6, 0.04, 32), mAlfombra, [0.7, 0.02, 1.0], [0, 0, 0], [1, 1, 0.7]);

    this.ventana(S);
    this.estanteria(S);

    // Cuadro de la pared
    malla(S, caja(1.3, 1.6, 0.1, 0.06), material(0xffc93c, { rugoso: 0.4 }), [0.3, 5.0, -4.2]);
    malla(S, caja(1.05, 1.35, 0.11, 0.04), material(0x7cf2c0, { rugoso: 0.7 }), [0.3, 5.0, -4.19]);
    const rosa = material(0xff8fa3, { rugoso: 0.6 });
    malla(S, esfera(0.3, 20, 14), rosa, [0.3, 5.0, -4.12], [0, 0, 0], [1, 1, 0.2]);

    // Escritorio: tablero sobre una cajonera que llega al suelo
    malla(S, caja(5.2, 0.2, 2.9, 0.08), this.roble, [-4.05, MESA - 0.1, 1.0]);
    const vetas = texturaMadera(0xb87a48, 3, [1, 1]);
    const cajonera = material(0xb87a48, { rugoso: 0.7, textura: vetas });
    malla(S, caja(1.7, MESA - 0.2, 2.6, 0.06), cajonera, [-2.45, (MESA - 0.2) / 2, 1.0]);
    malla(S, caja(1.0, MESA - 0.2, 2.6, 0.06), cajonera, [-6.0, (MESA - 0.2) / 2, 1.0]);
    for (const y of [0.4, 0.95]) {
      malla(S, esfera(0.07, 12, 8), metal(0xffd27a), [-2.45, y, 2.32]);
    }

    // Taza de café humeante y montón de folios
    const taza = grupo(S, [-1.95, MESA, 2.0]);
    const azul = material(0x5aa0c8, { rugoso: 0.3, barniz: 0.7 });
    const vaso = perfil([
      0.001, 0, 0.2, 0, 0.24, 0.37, 0.26, 0.39, 0.22, 0.37, 0.18, 0.05, 0.001, 0.05,
    ]);
    malla(taza, torno(vaso), azul);
    malla(taza, aro(0.12, 0.035, PI), azul, [0.24, 0.19, 0], [0, 0, -PI / 2]);
    const cafe = material(0x6a3f2a, { rugoso: 0.2, barniz: 1 });
    malla(taza, cilindro(0.21, 0.21, 0.02, 20), cafe, [0, 0.33, 0]);
    const humo = material(0xffffff, { rugoso: 1, opacidad: 0.25 });
    for (let i = 0; i < 3; i++) this.vapor.push(sinSombra(malla(taza, esfera(0.08, 14, 10), humo)));
    const folio = caja(1.1, 0.02, 1.4, 0.005);
    const blanco = material(0xfffdf6, { rugoso: 0.8 });
    for (let i = 0; i < 6; i++) {
      const giro = 0.2 + (azar() - 0.5) * 0.25;
      const pos: V3 = [-4.5 + (azar() - 0.5) * 0.1, MESA + 0.01 + i * 0.021, 1.6];
      malla(S, folio, blanco, pos, [0, giro, 0]);
    }

    // Papelera llena de bolas de papel, y alguna por el suelo
    const pl = grupo(S, [3.0, 0, 1.9]);
    const cubo = perfil([
      0.001, 0, 0.4, 0, 0.55, 0.95, 0.58, 0.97, 0.52, 0.95, 0.37, 0.06, 0.001, 0.06,
    ]);
    malla(pl, torno(cubo), material(0x5aa0c8, { rugoso: 0.5, dobleCara: true }));
    const bola = deformar(esfera(0.17, 12, 9), (v) => {
      v.multiplyScalar(1 + 0.16 * Math.sin(v.x * 47) * Math.sin(v.y * 41 + v.z * 37));
    });
    const papel = material(0xfffdf6, { rugoso: 0.9 });
    const sitios = [
      0, 0.9, 0, 0.2, 1, 0.1, -0.2, 0.95, -0.1, 0.95, 0.15, 0.4, -0.9, 0.15, 0.6, 1.3, 0.15, -0.3,
    ];
    for (let i = 0; i < sitios.length; i += 3) {
      malla(pl, bola, papel, [sitios[i], sitios[i + 1], sitios[i + 2]]);
    }
  }

  /** Ventana con la ciudad de noche y su luz azulada. */
  private ventana(S: THREE.Scene): void {
    const azar = crearAzar(29);
    const ciudad = texturaPintada(512, 400, (g, w, h) => {
      const cielo = g.createLinearGradient(0, 0, 0, h);
      cielo.addColorStop(0, '#1a1848');
      cielo.addColorStop(0.7, '#5a3c8c');
      cielo.addColorStop(1, '#ff9a8a');
      g.fillStyle = cielo;
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 50; i++) {
        g.fillStyle = `rgba(255,255,255,${0.4 + azar() * 0.6})`;
        g.fillRect(azar() * w, azar() * h * 0.5, 3, 3);
      }
      g.fillStyle = '#fff6dc';
      g.beginPath();
      g.arc(400, 80, 34, 0, 7);
      g.fill();
      for (let i = 0; i < 9; i++) {
        const x = i * 60 - 10;
        const alto = 110 + azar() * 170;
        g.fillStyle = i % 2 ? '#241c50' : '#2e2460';
        g.fillRect(x, h - alto, 56, alto);
        for (let k = 0; k < 14; k++) {
          if (azar() < 0.45) continue;
          g.fillStyle = azar() > 0.3 ? '#ffd27a' : '#8fe4ff';
          g.fillRect(x + 8 + (k % 3) * 15, h - alto + 12 + Math.floor(k / 3) * 24, 8, 12);
        }
      }
    });
    const x = -4.1;
    const crema = material(0xfff3dc, { rugoso: 0.6 });
    malla(S, caja(4.6, 3.8, 0.2, 0.1), crema, [x, 4.3, -4.2]);
    const vista = new THREE.MeshBasicMaterial({ map: ciudad, fog: false });
    sinSombra(malla(S, new THREE.PlaneGeometry(4.2, 3.4), vista, [x, 4.3, -4.08]));
    malla(S, caja(0.12, 3.5, 0.12, 0.03), crema, [x, 4.3, -4.02]);
    malla(S, caja(4.3, 0.12, 0.12, 0.03), crema, [x, 4.3, -4.02]);
    malla(S, caja(5.0, 0.16, 0.6, 0.05), crema, [x, 2.36, -4.0]);
    const luz = new THREE.PointLight(0x8f9cff, 14, 10);
    luz.position.set(x, 4, -2.6);
    S.add(luz);
  }

  /** Estantería del fondo, llena de libros de colores. */
  private estanteria(S: THREE.Scene): void {
    const azar = crearAzar(37);
    const est = grupo(S, [3.9, 0, -4.05]);
    const mueble = material(0x7a4a36, { rugoso: 0.7, textura: texturaMadera(0x7a4a36, 2, [2, 1]) });
    malla(est, caja(4.4, 6.4, 0.6, 0.06), mueble, [0, 3.2, 0]);
    const hueco = material(0x4a2c24, { rugoso: 0.9 });
    const colores = [0xff6b6b, 0xffc93c, 0x7cf2c0, 0x5aa0c8, 0xff8fa3, 0xfff3dc, 0xb58cff];
    const tapas = colores.map((c) => material(c, { rugoso: 0.6 }));
    for (let j = 0; j < 4; j++) {
      malla(est, caja(4.1, 1.25, 0.2, 0.03), hueco, [0, 1.0 + j * 1.45, 0.24]);
      let x = -1.9;
      while (x < 1.8) {
        const ancho = 0.14 + azar() * 0.16;
        const alto = 0.8 + azar() * 0.35;
        const tapa = tapas[Math.floor(azar() * tapas.length)];
        const giro: V3 = [0, 0, azar() > 0.85 ? 0.18 : 0];
        const pos: V3 = [x + ancho / 2, 0.4 + j * 1.45 + alto / 2, 0.34];
        if (azar() > 0.12) malla(est, caja(ancho, alto, 0.4, 0.03), tapa, pos, giro);
        x += ancho + 0.03;
      }
    }
  }

  /** Maceta apoyada en el escritorio, con hojas largas que se mecen. Devuelve las hojas. */
  private maceta(S: THREE.Scene): THREE.Group {
    const mc = grupo(S, [-4.55, MESA, 0.3]);
    const tiesto = perfil([
      0.001, 0, 0.3, 0, 0.42, 0.62, 0.47, 0.64, 0.47, 0.74, 0.38, 0.74, 0.001, 0.7,
    ]);
    malla(mc, torno(tiesto), material(0xff9f6a, { rugoso: 0.7 }));
    const hojas = grupo(mc, [0, 0.7, 0]);
    const verdes = [0x4faf55, 0x5fbf6a, 0x3f9f4f].map((c) =>
      material(c, { rugoso: 0.6, pelusa: 0.3, dobleCara: true }),
    );
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9;
      const alto = 0.6 + (i % 3) * 0.2;
      const hoja = new TuboFlexible((t) => 0.02 + Math.sin(t * PI) * 0.17, 10, 10, 0.2);
      hoja.colocar(
        [0, 0, 0],
        [Math.cos(a) * 0.3, alto + 0.35, Math.sin(a) * 0.3],
        [Math.cos(a) * 0.75, alto + 0.2, Math.sin(a) * 0.7],
      );
      malla(hojas, hoja.geometria, verdes[i % 3]);
    }
    return hojas;
  }

  /** Flexo amarillo encendido sobre el escritorio. Devuelve su luz. */
  private flexo(S: THREE.Scene): THREE.PointLight {
    const fx = grupo(S, [-1.95, MESA, 0.15], [0, PI, 0]);
    const amarillo = material(0xffc93c, { rugoso: 0.3, barniz: 0.7, dobleCara: true });
    malla(fx, cilindro(0.38, 0.42, 0.1, 28), amarillo, [0, 0.05, 0]);
    const brazo = new TuboFlexible(() => 0.04, 12, 8);
    brazo.colocar([0, 0.1, 0], [0.75, 1.2, -0.05], [-0.5, 1.9, 0.1]);
    malla(fx, brazo.geometria, metal(0xdfe6f0));
    const pantalla = torno(
      perfil([0.1, 0.3, 0.14, 0.26, 0.42, 0, 0.45, -0.02, 0.4, 0.02, 0.12, 0.24]),
    );
    malla(fx, pantalla, amarillo, [-0.62, 1.72, 0.14], [0.2, 0, 0.75]);
    sinSombra(malla(fx, esfera(0.12, 16, 12), luminoso(0xfff0c0, 2), [-0.7, 1.72, 0.16]));
    const luz = new THREE.PointLight(0xffc27a, 14, 9);
    luz.position.set(-0.9, 3.0, 0.8);
    S.add(luz);
    return luz;
  }
}

export const mecanografa3d: Definicion3d = {
  motor: {
    cielo: [
      [0, 0x2a2450],
      [1, 0x4a3a6c],
    ],
    niebla: [0x3a2c5c, 30, 80],
    camara: [-0.4, 3.5, 10.2],
    mira: [-0.4, 2.0, 0.5],
    angulo: 30,
    sol: { pos: [-4.5, 7, 6], color: 0xffc890, fuerza: 2.6 },
    contraluz: { pos: [-6, 5, -5], color: 0x8fb8ff, fuerza: 1.5 },
    ambiente: { cielo: 0xb8a8ff, suelo: 0xff9a6a, fuerza: 0.6 },
    exposicion: 0.94,
    reflejos: 0.2,
    resplandor: 0.18,
    foco: 9.6,
    zonaSombra: 8,
  },
  crear: (motor) => new Mecanografa(motor),
};
