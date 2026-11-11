/**
 * Escena 3D «Estrellas fugaces» (difícil).
 *
 * Una astrónoma fotografía estrellas fugaces desde la terraza de un observatorio. Igual que en
 * la versión plana, todas las estrellas van a la misma velocidad por dos caminos fijos (uno
 * desde cada lado del cielo) y cada una llega a la mira del centro justo en el pulso de su nota:
 * la distancia que les queda hasta la mira ES el ritmo. Los cometas (K) son más grandes y naranjas.
 * Cada nota tiene tres tiempos:
 *  - Anticipación: mientras la estrella se acerca, la astrónoma levanta la cámara y apunta.
 *  - Acción: al pulsar salta el flash (0,08 s) y la cámara da un respingo.
 *  - Reacción: si se acierta, la estrella se queda brillando en la mira, salen rayos y chispas
 *    y la astrónoma da un saltito; si se falla, la estrella se escapa por el otro lado del
 *    cielo, la mira se pone roja y la astrónoma baja la cámara con pena.
 *
 * Como en las demás escenas, todo se calcula en cada fotograma a partir de la `VistaEscena`.
 */
import * as THREE from 'three';

import { ladosDeLasEstrellas } from '../escenarios/observatorio';
import { VistaEscena } from '../escenarios/tipos';
import { acercar, arco, frenar, golpe, limitar, mezclar, rebote, suave, tramo } from './animacion';
import { V3, aro, caja, cilindro, cono, esfera, grupo, malla, sinSombra, silueta } from './formas';
import { latido, notaAcertada, ultimaJuzgada } from './golpes';
import {
  crearAzar,
  luminoso,
  material,
  metal,
  plastico,
  tela,
  texturaMadera,
  texturaPintada,
  texturaRuido,
} from './materiales';
import { Motor } from './motor';
import { Chispas } from './objetos';
import { alcanzar, Personaje } from './personaje';
import { Definicion3d, Escena3d } from './tipos';

const PI = Math.PI;

// --- Cielo y estrellas fugaces ---
/** Centro de la mira del cielo: cada estrella llega aquí en el pulso de su nota. */
const MIRA: V3 = [0, 5.0, -1];
/** Las estrellas salen fuera de cuadro, a esta distancia de la mira, por la izquierda o la derecha. */
const ORIGEN_X = 8.6;
/** Lo que bajan desde que salen hasta la mira (los caminos van en diagonal, como en la plana). */
const SUBIDA = 0.85;
/** Pulsos que tarda cualquier estrella en llegar a la mira (el mismo número que la plana). */
const VIAJE = 4;
/** Pulsos que una estrella sigue a la vista después de su nota (en la plana, hasta k = 1,4). */
const SE_QUEDA = 1.6;
/** Estrellas que se turnan: en 5,6 pulsos de canción nunca hay más de 7 notas. */
const FUGACES = 8;
const RADIO_ESTRELLA = 0.3;
const RADIO_COMETA = 0.6;
const COLA_ESTRELLA = 1.8;
const COLA_COMETA = 2.8;
const COLOR_IZQUIERDA = 0xffe58a;
const COLOR_DERECHA = 0xbfe8ff;
const COLOR_COMETA = 0xffa060;
const COLOR_APAGADA = 0x8a80b8;

// --- Astrónoma ---
const POS_ASTRONOMA: V3 = [2.8, 1.1, 1.15];
const GIRO_ASTRONOMA = -0.3;
const ESCALA_ASTRONOMA = 1.65;
/** Dónde lleva la cámara de fotos (en coordenadas del personaje) y cuánto la inclina. */
const CAMARA_REPOSO: V3 = [0.02, 0.86, 0.34];
const GIRO_REPOSO: V3 = [-0.15, -0.1, 0];
const CAMARA_APUNTA: V3 = [0.03, 1.0, 0.44];
const GIRO_APUNTA: V3 = [-0.7, -0.3, 0.08];
/** Puño arriba de la mano libre en un PERFECT. */
const MANO_CELEBRA: V3 = [-0.4, 1.46, 0.12];
/** Duración del flash, como en la plana. */
const FLASH = 0.08;

/** Piezas que comparten todas las estrellas fugaces: se crean una sola vez. */
interface PiezasFugaz {
  forma: THREE.BufferGeometry;
  plano: THREE.BufferGeometry;
  bola: THREE.BufferGeometry;
  mBola: THREE.Material;
  mColaBlanca: THREE.Material;
}

/** Dónde van las chispitas de la cola: [parte del largo, altura respecto al radio]. */
const CHISPITAS: [number, number][] = [
  [0.25, 0.3],
  [0.45, -0.35],
  [0.62, 0.15],
  [0.8, -0.2],
];

/**
 * Estrella fugaz: una estrella con luz propia y una cola que se desvanece. El grupo apunta
 * hacia donde avanza, así la cola queda siempre detrás, señalando el camino por el que viene.
 */
class Fugaz {
  readonly g: THREE.Group;
  private readonly estrella: THREE.Mesh;
  private readonly cola: THREE.Mesh;
  private readonly colaBlanca: THREE.Mesh;
  private readonly chispitas: THREE.Mesh[] = [];

  constructor(padre: THREE.Object3D, p: PiezasFugaz) {
    this.g = grupo(padre);
    this.estrella = sinSombra(malla(this.g, p.forma, p.mBola));
    this.cola = sinSombra(malla(this.g, p.plano, p.mColaBlanca));
    this.colaBlanca = sinSombra(malla(this.g, p.plano, p.mColaBlanca));
    for (let i = 0; i < CHISPITAS.length; i++) {
      this.chispitas.push(sinSombra(malla(this.g, p.bola, p.mBola)));
    }
  }

  /**
   * @param angulo hacia dónde avanza (en el plano del cielo)
   * @param largo largo de la cola (0 sin cola)
   * @param giro vuelta de la estrella sobre sí misma
   */
  colocar(
    pos: THREE.Vector3,
    angulo: number,
    radio: number,
    largo: number,
    giro: number,
    mEstrella: THREE.Material,
    mCola: THREE.Material,
  ): void {
    this.g.visible = radio > 0.001;
    this.g.position.copy(pos);
    this.g.rotation.z = angulo;
    this.estrella.material = mEstrella;
    this.estrella.scale.setScalar(radio);
    this.estrella.rotation.z = giro;
    const conCola = largo > 0.01;
    this.cola.visible = conCola;
    this.colaBlanca.visible = conCola;
    this.cola.material = mCola;
    this.cola.position.set(-largo / 2 - radio * 0.1, 0, -0.05);
    this.cola.scale.set(largo, radio * 1.7, 1);
    this.colaBlanca.position.set(-largo / 2 - radio * 0.1, 0, -0.03);
    this.colaBlanca.scale.set(largo, radio * 0.85, 1);
    this.chispitas.forEach((c, i) => {
      const [parte, alto] = CHISPITAS[i];
      c.visible = conCola;
      c.position.set(-parte * largo - radio * 0.4, alto * radio, 0);
      c.scale.setScalar(radio * 0.16 * (1 - parte * 0.6));
    });
  }
}

/** Pino de la colina: tronco y tres conos. */
function pino(padre: THREE.Object3D, pos: V3, escala: number, mCopa: THREE.Material): void {
  const g = grupo(padre, pos, [0, 0, 0], escala);
  malla(g, cilindro(0.1, 0.14, 0.6, 10), material(0x4a3a3a), [0, 0.3, 0]);
  for (let i = 0; i < 3; i++) malla(g, cono(0.8 - i * 0.2, 1.1, 18), mCopa, [0, 1.0 + i * 0.6, 0]);
}

/** Forma de estrella de cinco puntas de radio 1 (se escala en cada copia). */
function formaEstrella(): THREE.BufferGeometry {
  const forma = silueta(
    (s) => {
      for (let i = 0; i < 10; i++) {
        const angulo = (i / 10) * PI * 2 + PI / 2;
        const r = i % 2 ? 0.5 : 1;
        if (i === 0) s.moveTo(Math.cos(angulo) * r, Math.sin(angulo) * r);
        else s.lineTo(Math.cos(angulo) * r, Math.sin(angulo) * r);
      }
      s.closePath();
    },
    0.25,
    0.12,
  );
  forma.translate(0, 0, -0.125);
  return forma;
}

/** Material de lo que brilla en el cielo: no le afecta la niebla y se suma a lo que hay detrás. */
function brillo(color: number, opacidad: number, textura?: THREE.Texture): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    map: textura ?? null,
    transparent: true,
    opacity: opacidad,
    depthWrite: false,
    fog: false,
    blending: THREE.AdditiveBlending,
  });
}

class Observatorio implements Escena3d {
  readonly palabra: Escena3d['palabra'];
  private readonly fugaces: Fugaz[] = [];
  private readonly astronoma: Personaje;
  private readonly camaraFotos: THREE.Group;
  private readonly mira: THREE.Group;
  private readonly destello: THREE.Mesh;
  private readonly rayos: THREE.Mesh[] = [];
  private readonly chispas: Chispas;
  private readonly luzFlash: THREE.PointLight;
  private readonly luzFarol: THREE.PointLight;
  private readonly telescopio: THREE.Group;
  // Materiales que cambian con la música (cada uno lo usa una sola pieza o un solo grupo)
  private readonly mEstrellas: THREE.MeshStandardMaterial[];
  private readonly mFoto: THREE.MeshStandardMaterial;
  private readonly mColas: THREE.Material[];
  private readonly mAro: THREE.MeshBasicMaterial;
  private readonly mRayos: THREE.MeshBasicMaterial;
  private readonly mDestello: THREE.MeshBasicMaterial;
  private readonly mBombilla: THREE.MeshStandardMaterial;
  private readonly cielos: THREE.PointsMaterial[] = [];
  private readonly titilan: THREE.MeshStandardMaterial[] = [];
  private readonly lucesPueblo: THREE.MeshStandardMaterial[] = [];
  /** Lado de cada nota: solo depende de la canción, así que se calcula una vez por canción. */
  private teclasVistas: unknown = null;
  private lados: number[] = [];
  /** Cuánto tiene la astrónoma la cámara levantada (0 a 1); cambia poco a poco. */
  private prepara = 0;
  // Vectores y colores de trabajo: se reutilizan para no crear objetos nuevos en cada fotograma
  private readonly punto = new THREE.Vector3();
  private readonly objetivo = new THREE.Vector3();
  private readonly centroMira = new THREE.Vector3(...MIRA);
  private readonly blanco = new THREE.Color(0xffffff);
  private readonly rojo = new THREE.Color(0xff5a7a);

  constructor(motor: Motor) {
    const S = motor.escena;
    this.palabra = {
      ...motor.proyectar([1.35, 2.75, 1.6]),
      aciertos: ['¡Clic!', '¡Flash!', '¡Chas!'],
    };
    this.decorado(S);

    // Estrellas fugaces: amarillas por la izquierda, azuladas por la derecha y cometas naranjas
    const textoCola = texturaPintada(256, 64, (c, ancho, alto) => {
      const degradado = c.createLinearGradient(0, 0, ancho, 0);
      degradado.addColorStop(0, 'rgba(255,255,255,0)');
      degradado.addColorStop(1, 'rgba(255,255,255,1)');
      c.fillStyle = degradado;
      c.beginPath();
      c.moveTo(0, alto / 2);
      c.quadraticCurveTo(ancho * 0.6, 0, ancho, alto * 0.08);
      c.lineTo(ancho, alto * 0.92);
      c.quadraticCurveTo(ancho * 0.6, alto, 0, alto / 2);
      c.fill();
    });
    const lucero = (color: number, fuerza: number) =>
      material(color, { rugoso: 0.3, barniz: 0.6, luz: color, fuerzaLuz: fuerza, niebla: false });
    this.mEstrellas = [
      lucero(COLOR_IZQUIERDA, 1.5),
      lucero(COLOR_DERECHA, 1.5),
      lucero(COLOR_COMETA, 1.6),
      lucero(COLOR_APAGADA, 0.25),
    ];
    this.mFoto = lucero(0xfff2a0, 2.2);
    this.mColas = [COLOR_IZQUIERDA, COLOR_DERECHA, COLOR_COMETA, COLOR_APAGADA].map((c, i) =>
      brillo(c, i === 3 ? 0.3 : 0.75, textoCola),
    );
    const piezas: PiezasFugaz = {
      forma: formaEstrella(),
      plano: new THREE.PlaneGeometry(1, 1),
      bola: esfera(1, 8, 6),
      mBola: luminoso(0xffffff, 2),
      mColaBlanca: brillo(0xffffff, 0.9, textoCola),
    };
    for (let i = 0; i < FUGACES; i++) this.fugaces.push(new Fugaz(S, piezas));

    // La mira del cielo, el destello y los rayos de la foto
    this.mAro = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, fog: false });
    this.mira = this.crearMira(S);
    this.mDestello = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      fog: false,
      depthWrite: false,
    });
    this.destello = sinSombra(malla(S, esfera(0.9, 24, 16), this.mDestello, MIRA));
    this.mRayos = brillo(0xffffff, 0.8);
    const rayo = caja(0.9, 0.05, 0.02, 0.01);
    for (let i = 0; i < 8; i++) {
      const r = sinSombra(malla(S, rayo, this.mRayos, MIRA, [0, 0, (i * PI) / 4 + 0.2]));
      this.rayos.push(r);
    }
    this.chispas = new Chispas(S, 10, [0xfff2a0, 0xffffff, 0x8fe4ff]);

    // Flash: una luz que ilumina la terraza un instante. No se aclara la pantalla entera: con
    // notas cada medio pulso sería un parpadeo molesto y taparía la estrella siguiente
    this.luzFlash = new THREE.PointLight(0xfff2dc, 2, 7);
    this.luzFlash.position.set(3.2, 3.4, 2.6);
    S.add(this.luzFlash);
    this.luzFarol = new THREE.PointLight(0xffc27a, 14, 10);
    this.luzFarol.position.set(5.3, 2.9, 1.6);
    S.add(this.luzFarol);

    this.astronoma = this.crearAstronoma(S);
    this.camaraFotos = this.crearCamaraFotos(this.astronoma.cuerpo);
    this.mBombilla = this.camaraFotos.userData['bombilla'] as THREE.MeshStandardMaterial;
    this.telescopio = this.observatorio(S);
  }

  actualizar(v: VistaEscena, reloj: number, dt: number): void {
    const pulsoASegundos = 60 / v.bpm;
    if (v.teclas !== this.teclasVistas) {
      this.teclasVistas = v.teclas;
      this.lados = ladosDeLasEstrellas(v.notas.map((n) => n.pulso)).map((l) =>
        l === 'izquierda' ? -1 : 1,
      );
    }
    this.ambiente(v, reloj);

    // --- Estrellas: una por cada nota que esté cerca en el tiempo ---
    for (const f of this.fugaces) f.g.visible = false;
    /** Lo que falta para la próxima nota sin juzgar, y dónde está su estrella. */
    let faltaProxima = Infinity;
    v.notas.forEach((nota, i) => {
      const falta = nota.pulso - v.pulso;
      if (falta > VIAJE || falta < -SE_QUEDA) return;
      const f = this.fugaces[i % FUGACES];
      const lado = this.lados[i] ?? -1;
      const cometa = v.teclas[i] === 'alterna';
      const acierto = nota.juicio === 'perfect' || nota.juicio === 'great';
      if (acierto)
        this.fotografiada(f, -falta, pulsoASegundos, cometa, nota.juicio === 'perfect', reloj);
      else this.volar(f, lado, falta, cometa, nota.juicio === 'miss', pulsoASegundos, reloj);
      if (nota.juicio === null && falta < faltaProxima) {
        faltaProxima = falta;
        this.objetivo.copy(f.g.position);
      }
    });

    this.moverMira(v, pulsoASegundos);
    this.moverAstronoma(v, reloj, dt, faltaProxima, pulsoASegundos);
  }

  /** Coloca en `destino` el punto del camino de un lado: k = 0 al salir y k = 1 en la mira. */
  private enCamino(lado: number, k: number, destino: THREE.Vector3): void {
    destino.set(lado * ORIGEN_X * (1 - k), MIRA[1] + SUBIDA * (1 - k), MIRA[2]);
  }

  /**
   * Estrella que viaja hacia la mira a velocidad fija. Si se falla, sigue de largo, se escapa
   * por el otro lado del cielo cayendo un poco y se apaga.
   */
  private volar(
    f: Fugaz,
    lado: number,
    falta: number,
    cometa: boolean,
    fallada: boolean,
    pulsoASegundos: number,
    reloj: number,
  ): void {
    const k = 1 - falta / VIAJE;
    this.enCamino(lado, k, this.punto);
    // Una nota sin pulsar no se da por fallada hasta que pasa la ventana de 90 ms
    const hace = fallada ? Math.max(0, -falta * pulsoASegundos - 0.09) : 0;
    this.punto.y -= 1.2 * hace * hace;
    const apaga = 1 - suave(tramo(-falta, SE_QUEDA * 0.5, SE_QUEDA));
    const entra = suave(tramo(k, 0, 0.06));
    const radio = (cometa ? RADIO_COMETA : RADIO_ESTRELLA) * entra * apaga;
    const largo = (cometa ? COLA_COMETA : COLA_ESTRELLA) * entra * apaga;
    // La fallada pierde el color y se aleja apagada: así se ve que la foto no salió
    const tipo = hace > 0 ? 3 : cometa ? 2 : lado < 0 ? 0 : 1;
    const angulo = Math.atan2(-SUBIDA - 2.4 * hace, -lado * ORIGEN_X);
    const giro = reloj * (fallada ? 6 : 1.2) * -lado;
    f.colocar(this.punto, angulo, radio, largo, giro, this.mEstrellas[tipo], this.mColas[tipo]);
  }

  /** Foto hecha: la estrella se queda en la mira, crece con un rebote, gira y se apaga. */
  private fotografiada(
    f: Fugaz,
    pulsos: number,
    pulsoASegundos: number,
    cometa: boolean,
    perfecta: boolean,
    reloj: number,
  ): void {
    const hace = Math.max(0, pulsos * pulsoASegundos);
    // Con un PERFECT la foto sale más grande y brillante que con un GREAT
    const crece = 1 + (perfecta ? 0.45 : 0.2) * rebote(tramo(hace, 0, 0.18));
    // Se apaga pronto: en los tramos densos la siguiente estrella llega medio pulso después
    const apaga = 1 - suave(tramo(pulsos, 0.2, 0.5));
    const radio = (cometa ? RADIO_COMETA : RADIO_ESTRELLA + 0.08) * crece * apaga;
    const mEstrella = perfecta ? this.mFoto : this.mEstrellas[cometa ? 2 : 0];
    f.colocar(this.centroMira, 0, radio, 0, 0.2 + reloj * 0.8, mEstrella, this.mColas[0]);
  }

  /** La mira late con el compás, se pone roja al fallar y dispara destello, rayos y chispas al acertar. */
  private moverMira(v: VistaEscena, pulsoASegundos: number): void {
    const compas = v.notas.length ? latido(v.pulso) : 0;
    const juzgada = ultimaJuzgada(v, 1);
    const hace = juzgada ? juzgada.hace * pulsoASegundos : Infinity;
    const fallo =
      juzgada?.juicio === 'miss' ? golpe(Math.max(0, hace - 0.09), 0.5) * (hace > 0.09 ? 1 : 0) : 0;
    this.mAro.color.lerpColors(this.blanco, this.rojo, fallo);
    this.mAro.opacity = 0.85 + 0.15 * compas;
    this.mira.scale.setScalar(1 + 0.04 * compas - 0.06 * fallo);
    this.mira.rotation.z = fallo > 0 ? fallo * 0.12 * Math.sin(hace * 30) : 0;

    const acertada = notaAcertada(v);
    const desde = acertada === null ? -1 : v.desdePulsacion;
    const perfecta = acertada !== null && v.notas[acertada].juicio === 'perfect';
    const k = desde < 0 ? 1 : limitar(desde / 0.35);
    this.mDestello.opacity = 0.32 * (1 - k);
    this.destello.visible = k < 1;
    this.destello.scale.setScalar(0.8 + 0.35 * frenar(k));
    this.mRayos.opacity = 0.85 * (1 - k);
    const lejos = 1.35 + 0.8 * frenar(k);
    this.rayos.forEach((r, i) => {
      const angulo = (i * PI) / 4 + 0.2;
      r.visible = k < 1;
      r.position.set(
        MIRA[0] + Math.cos(angulo) * lejos,
        MIRA[1] + Math.sin(angulo) * lejos,
        MIRA[2],
      );
      r.scale.set(0.3 + 0.9 * frenar(tramo(k, 0, 0.4)), 1, 1);
    });
    this.chispas.actualizar(this.centroMira, desde, perfecta ? 2.4 : 1.8);
  }

  private moverAstronoma(
    v: VistaEscena,
    reloj: number,
    dt: number,
    falta: number,
    pulsoASegundos: number,
  ): void {
    const p = this.astronoma;
    const d = v.desdePulsacion;
    // Anticipación: un pulso antes de la nota levanta la cámara y apunta al cielo
    this.prepara = acercar(this.prepara, suave(tramo(falta, 1.1, 0.35)), 12, dt);
    // Acción: el flash dura 0,08 s y la cámara da un respingo que se apaga en 0,15 s
    const respingo = golpe(d, 0.15);

    // Reacción al último juicio
    const juzgada = ultimaJuzgada(v, 1.5);
    const hace = juzgada ? juzgada.hace * pulsoASegundos : Infinity;
    const acierto = juzgada !== null && juzgada.juicio !== 'miss';
    const perfecto = juzgada?.juicio === 'perfect';
    // El fallo de una nota sin pulsar no se sabe hasta pasada la ventana de 90 ms
    const pena =
      juzgada && !acierto
        ? rebote(tramo(hace, 0.09, 0.3)) * (1 - suave(tramo(hace, 0.55, 0.8)))
        : 0;
    const salto = acierto ? arco(tramo(hace, 0.04, 0.38)) * (perfecto ? 1 : 0.55) : 0;
    // El puño solo si la siguiente estrella no está ya encima (si no, sigue apuntando)
    const celebra = perfecto
      ? suave(tramo(hace, 0.02, 0.14)) *
        (1 - suave(tramo(hace, 0.42, 0.62))) *
        suave(tramo(falta, 0.8, 1.2))
      : 0;

    // Cámara de fotos: entre el reposo y apuntando; con pena la baja
    const alza = this.prepara * (1 - pena);
    const cam = this.camaraFotos;
    cam.position.set(
      mezclar(CAMARA_REPOSO[0], CAMARA_APUNTA[0], alza),
      mezclar(CAMARA_REPOSO[1], CAMARA_APUNTA[1], alza) + 0.035 * respingo - 0.06 * pena,
      mezclar(CAMARA_REPOSO[2], CAMARA_APUNTA[2], alza) - 0.04 * respingo,
    );
    cam.rotation.set(
      mezclar(GIRO_REPOSO[0], GIRO_APUNTA[0], alza) - 0.15 * respingo + 0.3 * pena,
      mezclar(GIRO_REPOSO[1], GIRO_APUNTA[1], alza),
      mezclar(GIRO_REPOSO[2], GIRO_APUNTA[2], alza),
    );
    cam.updateMatrix();
    // Las manos agarran la cámara por los lados; en un PERFECT la izquierda sube en puño
    this.agarrar(p.manoD, 1, 0);
    this.agarrar(p.manoI, -1, celebra);

    // Cuerpo: se echa atrás al apuntar, da un respingo con el flash y se encoge con la pena
    const compas = v.notas.length ? latido(v.pulso) : 0;
    p.torso.rotation.x = -0.09 * alza - 0.05 * respingo + 0.16 * pena;
    p.torso.rotation.y = -0.18 * alza;
    p.raiz.position.y = POS_ASTRONOMA[1] + salto * 0.14;
    p.raiz.scale.y = ESCALA_ASTRONOMA * (1 - 0.02 * compas);

    // Mira la estrella que llega; al fallar, la que se escapa; si no hay ninguna, a quien juega.
    // Lo del cielo se mira como si estuviera delante, para no girar la cabeza hacia atrás
    if (juzgada && !acierto && hace < 0.8) {
      const f = this.fugaces[juzgada.indice % FUGACES];
      this.punto.copy(f.g.visible ? f.g.position : this.centroMira);
    } else if (falta < VIAJE) this.punto.copy(this.objetivo);
    else if (hace < 0.8) this.punto.copy(this.centroMira);
    else this.punto.set(1.5 + Math.sin(reloj * 0.4), 3.2 + 1.5 * Math.sin(reloj * 0.23), 9);
    this.punto.z = Math.max(this.punto.z, 3.5);
    p.mirarA(this.punto, dt);
    p.cabeza.rotation.z = pena > 0 ? pena * 0.13 * Math.sin(hace * 24) : 0;

    if (juzgada && hace < 0.8) {
      if (acierto) p.expresion = perfecto ? 'risa' : 'feliz';
      else p.expresion = hace < 0.35 ? 'sorpresa' : 'triste';
    } else if (alza > 0.5) p.expresion = 'concentrado';
    else p.expresion = 'feliz';
    p.actualizar(reloj, dt);
  }

  /**
   * Pone una mano en el costado de la cámara (o, con `celebra`, la sube en puño).
   * @param lado 1 la mano derecha, que va al costado +X de la cámara, y −1 la izquierda
   */
  private agarrar(mano: V3, lado: number, celebra: number): void {
    this.punto.set(lado * 0.25, -0.02, -0.02).applyMatrix4(this.camaraFotos.matrix);
    const agarre = alcanzar([this.punto.x, this.punto.y, this.punto.z], lado);
    for (let i = 0; i < 3; i++) mano[i] = mezclar(agarre[i], MANO_CELEBRA[i], celebra);
  }

  /** Lo que se mueve siempre: el cielo titila, el pueblo parpadea y el telescopio barre el cielo. */
  private ambiente(v: VistaEscena, t: number): void {
    // El flash de la cámara: luz sobre la terraza y la bombilla encendida
    const flash = v.desdePulsacion < FLASH ? 1 - v.desdePulsacion / FLASH : 0;
    this.luzFlash.intensity = 2 + 22 * flash;
    this.mBombilla.emissiveIntensity = 0.6 + 4 * flash;

    this.cielos.forEach((m, i) => {
      m.opacity = 0.7 + 0.3 * Math.sin(t * (1.3 + i * 0.7) + i * 2);
    });
    this.titilan.forEach((m, i) => {
      m.emissiveIntensity = 1.3 + 0.5 * Math.sin(t * (2 + i * 0.9) + i);
    });
    this.lucesPueblo.forEach((m, i) => {
      m.emissiveIntensity = 2.6 + 0.6 * Math.sin(t * (3.1 + i * 1.7));
    });
    const compas = v.notas.length ? latido(v.pulso) : 0;
    for (let i = 0; i < 3; i++) this.mEstrellas[i].emissiveIntensity = 1.4 + 0.4 * compas;
    this.luzFarol.intensity = 14 + 1.5 * Math.sin(t * 7) * Math.sin(t * 2.3);
    this.telescopio.rotation.y = 0.25 + 0.12 * Math.sin(t * 0.3);
  }

  /** La mira del cielo: un aro luminoso con su aro exterior y cuatro marcas. */
  private crearMira(S: THREE.Scene): THREE.Group {
    const g = grupo(S, MIRA);
    sinSombra(malla(g, aro(0.95, 0.045), this.mAro));
    const azul = new THREE.MeshBasicMaterial({
      color: 0x8fe4ff,
      transparent: true,
      opacity: 0.7,
      fog: false,
    });
    sinSombra(malla(g, aro(1.25, 0.02), azul));
    const marca = caja(0.34, 0.06, 0.03, 0.01);
    for (let i = 0; i < 4; i++) {
      const angulo = (i * PI) / 2;
      sinSombra(
        malla(
          g,
          marca,
          this.mAro,
          [Math.cos(angulo) * 1.2, Math.sin(angulo) * 1.2, 0],
          [0, 0, angulo],
        ),
      );
    }
    // Los dos caminos por los que llegan las estrellas, muy tenues, como en la plana
    const puntos = texturaPintada(512, 16, (c, ancho, alto) => {
      c.fillStyle = '#ffffff';
      for (let x = 8; x < ancho; x += 22) {
        c.beginPath();
        c.arc(x, alto / 2, 4, 0, PI * 2);
        c.fill();
      }
    });
    const camino = brillo(0xa9b4ff, 0.22, puntos);
    const largo = Math.hypot(ORIGEN_X, SUBIDA);
    for (const lado of [-1, 1]) {
      // Empieza por fuera del aro exterior, para no cruzar la mira
      sinSombra(
        malla(
          S,
          new THREE.PlaneGeometry(largo - 1.25, 0.09),
          camino,
          [
            MIRA[0] + (lado * (ORIGEN_X + 1.25)) / 2,
            MIRA[1] + (SUBIDA * (1 + 1.25 / largo)) / 2,
            MIRA[2] - 0.1,
          ],
          [0, 0, lado * Math.atan2(SUBIDA, ORIGEN_X)],
        ),
      );
    }
    return g;
  }

  private crearAstronoma(S: THREE.Scene): Personaje {
    const p = new Personaje(S, {
      pos: POS_ASTRONOMA,
      giro: GIRO_ASTRONOMA,
      escala: ESCALA_ASTRONOMA,
      piel: 0xe8a87c,
      ropa: 0xffb347,
      pantalon: 0x4a3f7c,
      zapatos: 0xff6b6b,
      pelo: ['melena', 0x6a3fa0],
      cuello: 0xff6b8f,
      cejas: 0x4a2a78,
      desfase: 0.6,
    });
    // Gafas redondas: dos aros delante de los ojos, el puente y las patillas hasta las orejas
    const cab = p.cabeza;
    const R = p.radioCabeza;
    const montura = material(0x3a2e4a, { rugoso: 0.4 });
    for (const s of [1, -1]) {
      malla(
        cab,
        aro(R * 0.27, R * 0.035),
        montura,
        [s * R * 0.37, R * 0.06, R * 0.95],
        [0, s * 0.2, 0],
      );
      const patilla = malla(
        cab,
        cilindro(R * 0.025, R * 0.025, R * 0.75, 6),
        montura,
        [s * R * 0.72, R * 0.08, R * 0.5],
        [PI / 2, 0, 0],
      );
      patilla.rotation.y = s * 0.55;
    }
    malla(
      cab,
      cilindro(R * 0.03, R * 0.03, R * 0.2, 6),
      montura,
      [0, R * 0.08, R * 0.99],
      [0, 0, PI / 2],
    );
    return p;
  }

  /** Cámara de fotos de la astrónoma, con objetivo y bombilla de flash. Va en su cuerpo. */
  private crearCamaraFotos(cuerpo: THREE.Object3D): THREE.Group {
    const g = grupo(cuerpo);
    malla(g, caja(0.38, 0.24, 0.16, 0.04), plastico(0x4fd1c5));
    malla(
      g,
      cilindro(0.09, 0.1, 0.14, 20),
      material(0x2a2233, { rugoso: 0.3 }),
      [0, 0, 0.13],
      [PI / 2, 0, 0],
    );
    malla(
      g,
      cilindro(0.065, 0.065, 0.02, 20),
      material(0x8fd0ff, { rugoso: 0.05, barniz: 1, luz: 0x4fb0ff, fuerzaLuz: 0.6 }),
      [0, 0, 0.205],
      [PI / 2, 0, 0],
    );
    malla(g, caja(0.1, 0.06, 0.08, 0.02), plastico(0xfff3dc), [-0.1, 0.15, 0]);
    const bombilla = luminoso(0xffffff, 0.6);
    sinSombra(malla(g, esfera(0.07, 16, 12), bombilla, [-0.1, 0.2, 0.04]));
    g.userData['bombilla'] = bombilla;
    return g;
  }

  private decorado(S: THREE.Scene): void {
    const azar = crearAzar(17);
    // Cielo: dos nubes de puntitos que titilan por turnos
    const circulo = texturaPintada(64, 64, (c) => {
      const degradado = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      degradado.addColorStop(0, '#fff');
      degradado.addColorStop(0.3, 'rgba(255,255,255,.9)');
      degradado.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = degradado;
      c.fillRect(0, 0, 64, 64);
    });
    for (let n = 0; n < 2; n++) {
      const pos: number[] = [];
      for (let i = 0; i < 260; i++) {
        pos.push((azar() - 0.5) * 120, 4 + azar() * 46, -60 - azar() * 12);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const m = new THREE.PointsMaterial({
        map: circulo,
        size: 0.75,
        transparent: true,
        depthWrite: false,
        fog: false,
        color: 0xfff6dc,
      });
      this.cielos.push(m);
      S.add(new THREE.Points(geo, m));
    }
    // Estrellitas de fondo en tres colores, que titilan
    const forma = formaEstrella();
    for (const color of [0xfff2b0, 0xbfe0ff, 0xffc8e0]) {
      this.titilan.push(
        material(color, { luz: color, fuerzaLuz: 1.5, rugoso: 0.3, niebla: false }),
      );
    }
    for (let i = 0; i < 26; i++) {
      const r = 0.25 + azar() * 0.3;
      sinSombra(
        malla(
          S,
          forma,
          this.titilan[i % 3],
          [(azar() - 0.5) * 70, 8 + azar() * 26, -58],
          [0, 0, azar() * 2],
          r,
        ),
      );
    }

    // Luna con cráteres y un halo
    sinSombra(
      malla(
        S,
        esfera(5.5, 32, 24),
        material(0xfff6dc, { rugoso: 0.9, luz: 0xfff0c8, fuerzaLuz: 0.7, niebla: false }),
        [20, 8, -58],
      ),
    );
    const mCrater = material(0xe8dcc0, { rugoso: 1, luz: 0xe8dcc0, fuerzaLuz: 0.7, niebla: false });
    for (const [x, y, r] of [
      [18.5, 9.3, 1.2],
      [21.6, 6.6, 0.8],
      [20.8, 10.6, 0.5],
    ]) {
      sinSombra(malla(S, esfera(r, 16, 12), mCrater, [x, y, -54.6], [0, 0, 0], [1, 1, 0.3]));
    }
    const mHalo = new THREE.MeshBasicMaterial({
      color: 0xbfc8ff,
      transparent: true,
      opacity: 0.12,
      fog: false,
      depthWrite: false,
    });
    sinSombra(malla(S, esfera(9, 32, 24), mHalo, [20, 8, -57]));

    // Montañas lejanas y un pueblo con lucecitas
    const montes: [number, number, number, number][] = [
      [-30, 16, 0x2a2466, -48],
      [-8, 12, 0x322a72, -50],
      [12, 9, 0x2a2466, -48],
      [34, 10, 0x322a72, -46],
    ];
    for (const [x, r, color, z] of montes) {
      sinSombra(
        malla(
          S,
          cono(r, r * 0.9, 5),
          material(color, { rugoso: 1 }),
          [x, r * 0.3, z],
          [0, azar() * 2, 0],
        ),
      );
    }
    this.lucesPueblo.push(luminoso(0xffd27a, 3), luminoso(0xffd27a, 3));
    const bombilla = esfera(0.12, 8, 6);
    for (let i = 0; i < 22; i++) {
      const pos: V3 = [-14 + azar() * 30, 0.6 + azar() * 1.2, -30 - azar() * 6];
      sinSombra(malla(S, bombilla, this.lucesPueblo[i % 2], pos));
    }

    // Colina de hierba con pinos
    malla(
      S,
      esfera(30, 32, 24),
      material(0x3a7e78, { rugoso: 1, textura: texturaRuido(0x3a7e78, 0.16, [16, 10]) }),
      [0, -28.6, -4],
      [0, 0, 0],
      [1.2, 1, 0.9],
    );
    const copas = [0x1f4a52, 0x245a5c, 0x1a3f4a].map((c) => material(c, { rugoso: 0.9 }));
    const pinos: V3[] = [
      [-9.5, -6, 1.7],
      [-11.5, -3, 2.2],
      [-7.5, -9, 1.5],
      [9.8, -5, 2.0],
      [11.8, -8, 2.5],
      [7.6, -10, 1.6],
      [13.5, -3, 1.8],
    ];
    for (const [x, z, s] of pinos) pino(S, [x, 0.6, z], s, copas[Math.floor(azar() * 3)]);

    this.terraza(S);
  }

  /** Terraza de madera con barandilla, farol y el telescopio pequeño en su trípode. */
  private terraza(S: THREE.Scene): void {
    const ter = grupo(S, [2.6, 0, 0.4]);
    malla(
      ter,
      cilindro(3.2, 3.3, 0.5, 32),
      material(0xc89a78, { rugoso: 0.8, textura: texturaMadera(0xc89a78, 8, [1, 1]) }),
      [0, 0.85, 0],
      [0, 0, 0],
      [1.25, 1, 0.75],
    );
    const crema = material(0xf2e6d8);
    const barrote = cilindro(0.05, 0.05, 0.9, 8);
    for (let i = 0; i <= 10; i++) {
      const a = PI + 0.25 + (i / 10) * (PI - 0.5);
      malla(ter, barrote, crema, [Math.cos(a) * 3.8, 1.55, Math.sin(a) * 2.25]);
    }
    malla(ter, aro(3.05, 0.06, PI - 0.5), crema, [0, 2.0, 0], [-PI / 2, 0, 0.25], [1.25, 0.74, 1]);
    // Farol (su luz se crea en el constructor, para hacerla parpadear)
    const farol = grupo(ter, [2.9, 1.1, 0.9]);
    const hierro = material(0x3a2e4a);
    malla(farol, cilindro(0.05, 0.07, 1.5, 8), hierro, [0, 0.75, 0]);
    sinSombra(malla(farol, esfera(0.24, 20, 14), luminoso(0xffd88a, 1.8), [0, 1.65, 0]));
    malla(farol, cono(0.36, 0.26, 16), hierro, [0, 1.98, 0]);
    // Telescopio pequeño en su trípode
    const tripode = grupo(ter, [-2.1, 1.1, 0.7]);
    const pata = cilindro(0.035, 0.035, 1.5, 8);
    for (const a of [0, 2.1, 4.2]) {
      malla(
        tripode,
        pata,
        metal(0x9aa6c0),
        [Math.cos(a) * 0.3, 0.68, Math.sin(a) * 0.3],
        [Math.sin(a) * 0.38, 0, -Math.cos(a) * 0.38],
      );
    }
    malla(tripode, cilindro(0.16, 0.13, 1.3, 20), plastico(0x4fd1c5), [0.1, 1.6, 0], [0, 0, -0.75]);
    malla(
      tripode,
      cilindro(0.19, 0.19, 0.14, 20),
      plastico(0xfff3dc),
      [0.56, 2.03, 0],
      [0, 0, -0.75],
    );
  }

  /** Observatorio con la cúpula abierta y el telescopio asomando; devuelve el telescopio. */
  private observatorio(S: THREE.Scene): THREE.Group {
    const ob = grupo(S, [-7.4, 0.9, -7], [0, 0, 0], 0.82);
    malla(
      ob,
      cilindro(2.3, 2.5, 2.4, 32),
      material(0xf2e6d8, { rugoso: 0.8, textura: texturaRuido(0xf2e6d8, 0.08, [4, 1]) }),
      [0, 1.2, 0],
    );
    const lila = material(0x6a5a9c, { rugoso: 0.5 });
    malla(ob, aro(2.4, 0.16), lila, [0, 2.4, 0], [PI / 2, 0, 0]);
    // Cúpula metálica con la rendija abierta, y el interior oscuro
    malla(
      ob,
      new THREE.SphereGeometry(2.3, 32, 16, 0.5, PI * 2 - 0.62, 0, PI / 2),
      material(0x8f9ad8, { rugoso: 0.32, metal: 0.55, barniz: 0.5, dobleCara: true }),
      [0, 2.45, 0],
      [0, -1.35, 0],
    );
    malla(
      ob,
      new THREE.SphereGeometry(2.2, 32, 16, 0, PI * 2, 0, PI / 2),
      material(0x1a1840, { rugoso: 1, dobleCara: true }),
      [0, 2.45, 0],
    );
    // El telescopio gira sobre su base para barrer el cielo despacio
    const base = grupo(ob, [0.2, 3.1, 0.5]);
    const tel = grupo(base, [0, 0, 0], [0.72, 0, 0]);
    malla(
      tel,
      cilindro(0.5, 0.42, 3.4, 28),
      material(0xfff3dc, { rugoso: 0.3, barniz: 0.7 }),
      [0, 1.2, 0],
    );
    malla(tel, cilindro(0.56, 0.56, 0.3, 28), plastico(0xff6b6b), [0, 2.9, 0]);
    malla(
      tel,
      cilindro(0.44, 0.44, 0.05, 28),
      material(0x6fd0ff, { rugoso: 0.05, barniz: 1, luz: 0x4fb0ff, fuerzaLuz: 0.8 }),
      [0, 3.06, 0],
    );
    // Puerta y ventana encendida, con su luz cálida
    malla(ob, caja(0.9, 1.5, 0.12, 0.08), lila, [1.2, 0.75, 2.05], [0, 0.55, 0]);
    sinSombra(
      malla(
        ob,
        caja(0.6, 0.6, 0.1, 0.1),
        luminoso(0xffd27a, 2.2),
        [-0.4, 1.4, 2.42],
        [0, -0.15, 0],
      ),
    );
    const luz = new THREE.PointLight(0xffc27a, 10, 8);
    luz.position.set(-7.6, 2.2, -4.2);
    S.add(luz);
    return base;
  }
}

export const observatorio3d: Definicion3d = {
  motor: {
    cielo: [
      [0, 0x0e1038],
      [0.45, 0x242066],
      [0.72, 0x5a3c8c],
      [0.86, 0xd9799a],
      [1, 0xffb38a],
    ],
    niebla: [0x3a2c70, 30, 110],
    camara: [0, 2.3, 11.5],
    mira: [0, 3.7, 0],
    angulo: 32,
    sol: { pos: [-7, 8, 4], color: 0x9fb8ff, fuerza: 1.7 },
    contraluz: { pos: [6, 3, -7], color: 0xff9ab0, fuerza: 1.3 },
    ambiente: { cielo: 0x6f78d8, suelo: 0x3a2c5c, fuerza: 0.7 },
    exposicion: 0.95,
    reflejos: 0.15,
    resplandor: 0.3,
    foco: 10.5,
    zonaSombra: 10,
  },
  crear: (motor) => new Observatorio(motor),
};
