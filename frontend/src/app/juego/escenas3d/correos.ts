/**
 * Escena 3D «Correos exprés» (media).
 *
 * Una cartera sella cartas en la cinta transportadora de una oficina de correos. Igual que en
 * la versión plana, las cartas avanzan a velocidad fija y cada una pasa bajo el sello justo en
 * el pulso de su nota: la distancia que le queda a la carta hasta las marcas amarillas ES el
 * ritmo. Las urgentes (rojas) caen a contratiempo. Cada nota tiene tres tiempos:
 *  - Anticipación: mientras la carta llega, la cartera levanta el sello y se echa atrás.
 *  - Acción: al pulsar, el sello cae de golpe sobre la cinta (0,06 s) y se aplasta un poco.
 *  - Reacción: si se acierta, la carta queda con el matasellos, da un saltito y saltan chispas;
 *    si se falla, la carta sale volando de la cinta y se cae, y la cartera se lleva un susto.
 *
 * Como en las demás escenas, todo se calcula en cada fotograma a partir de la `VistaEscena`.
 */
import * as THREE from 'three';

import { VistaEscena } from '../escenarios/tipos';
import { acercar, arco, frenar, golpe, mezclar, rebote, suave, tramo } from './animacion';
import { V3, aro, caja, casquete, cilindro, deformar, esfera, grupo, malla, torno } from './formas';
import { latido, notaAcertada, ultimaJuzgada } from './golpes';
import {
  crearAzar,
  luminoso,
  material,
  metal,
  plastico,
  tela,
  texturaCuadros,
  texturaMadera,
  texturaPintada,
  texturaRayas,
  texturaRuido,
} from './materiales';
import { Motor } from './motor';
import { Chispas } from './objetos';
import { alcanzar, Personaje } from './personaje';
import { Definicion3d, Escena3d } from './tipos';

const PI = Math.PI;

// --- Cinta y cartas ---
/** Altura de la goma de la cinta, donde se apoyan las cartas. */
const CINTA = 1.25;
/** Línea por la que avanzan las cartas (z). */
const FILA = 0.9;
/** El sello no cambia de x: cada carta llega aquí en el pulso de su nota. */
const X_SELLO = 0.55;
/** Fondo (z) en el que cae el sello: un poco por detrás del centro de la carta. */
const Z_SELLO = 0.7;
/** Lo que avanza la cinta en un pulso. */
const AVANCE = 2.4;
/** Pulsos antes de su nota en los que la carta entra por la izquierda (fuera de cuadro). */
const APARECE = 3;
/** Pulsos que la carta sigue en la cinta después de su nota, hasta salir por la derecha. */
const SE_VA = 2.6;
/** Cartas que se turnan: en 5,6 pulsos nunca caben más de 12 notas. */
const CARTAS = 12;
const ANCHO_CARTA = 1.03;
const FONDO_CARTA = 0.64;
const GROSOR_CARTA = 0.04;
/** Segundos que tarda una carta fallada en caerse de la cinta. */
const CAIDA = 0.75;

// --- Sello ---
/** Segundos que tarda el sello en bajar al pulsar, y cuándo empieza y acaba de volver. */
const BAJADA = 0.06;
const VUELVE: [number, number] = [0.08, 0.24];
/**
 * Dónde va la mano respecto a la base del sello: agarra el pomo por detrás, por el lado que da
 * a la cartera (así el brazo llega a la carta sin estirarse de más).
 */
const AGARRE: V3 = [-0.05, 0.64, -0.22];
/** Dónde está la base del sello en cada postura [x, y, z] y cuánto se inclina. */
const SELLO_REPOSO: V3 = [X_SELLO - 0.05, CINTA + 0.4, Z_SELLO - 0.12];
const SELLO_ARRIBA: V3 = [X_SELLO, CINTA + 0.75, Z_SELLO - 0.18];
const SELLO_GOLPE: V3 = [X_SELLO, CINTA + GROSOR_CARTA, Z_SELLO];

// --- Cartera ---
/** Está subida a una tarima, detrás de la cinta, para quedar a la altura de la propuesta. */
const POS_CARTERA: V3 = [0.15, 0.4, -0.62];
const ESCALA_CARTERA = 1.72;
/** Mano libre: apoyada en el borde de la cinta y, al acertar, puño arriba. */
const MANO_APOYADA: V3 = [-0.4, 0.6, 0.24];
const MANO_CELEBRA: V3 = [-0.52, 1.46, 0.04];

/** Las cuatro caras de una carta: normal o urgente, y sin sellar o sellada. */
type Caras = [[THREE.Material, THREE.Material], [THREE.Material, THREE.Material]];

/** Sobre con su cara pintada. El origen está en el centro de la base, para que gire bien al caer. */
class Carta {
  readonly g: THREE.Group;
  private readonly cara: THREE.Mesh;

  constructor(
    padre: THREE.Object3D,
    cuerpo: THREE.BufferGeometry,
    plano: THREE.BufferGeometry,
    papel: THREE.Material,
  ) {
    this.g = grupo(padre);
    malla(this.g, cuerpo, papel, [0, GROSOR_CARTA / 2, 0]);
    this.cara = malla(this.g, plano, papel, [0, GROSOR_CARTA + 0.003, 0], [-PI / 2, 0, 0]);
    this.cara.castShadow = false;
  }

  vestir(caras: Caras, urgente: boolean, sellada: boolean): void {
    this.cara.material = caras[urgente ? 1 : 0][sellada ? 1 : 0];
  }
}

/** Sello de madera con la goma roja. El origen está en la goma, que es lo que toca la carta. */
function crearSello(padre: THREE.Object3D): THREE.Group {
  const g = grupo(padre);
  malla(g, cilindro(0.3, 0.32, 0.14, 28), material(0xd9443f, { rugoso: 0.5 }), [0, 0.07, 0]);
  malla(
    g,
    cilindro(0.26, 0.3, 0.16, 28),
    material(0x8a5a3a, { rugoso: 0.4, barniz: 0.5 }),
    [0, 0.21, 0],
  );
  malla(
    g,
    torno(
      [
        [0.1, -0.08],
        [0.09, 0.12],
        [0.16, 0.26],
        [0.17, 0.36],
        [0.1, 0.44],
        [0.001, 0.45],
      ],
      24,
    ),
    material(0xc98d5a, { rugoso: 0.35, barniz: 0.6 }),
    [0, 0.35, 0],
  );
  return g;
}

/**
 * Cara de una carta pintada en un lienzo: borde de correo aéreo, sello de la esquina y, si
 * ya pasó por el sello, el matasellos «TK3» donde cae la goma.
 */
function pintarCarta(urgente: boolean, sellada: boolean): THREE.Texture {
  return texturaPintada(512, 320, (c, w, h) => {
    c.fillStyle = urgente ? '#ff6b6b' : '#fffaf0';
    c.fillRect(0, 0, w, h);
    // Solapa del sobre
    c.strokeStyle = urgente ? '#c93c3c' : '#e3cfa4';
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(w / 2, h * 0.52);
    c.lineTo(w, 0);
    c.stroke();
    for (let i = 0; i < 26; i++) {
      c.fillStyle = urgente ? (i % 2 ? '#ffffff' : '#ffd23c') : i % 2 ? '#ff6b6b' : '#5aa0c8';
      c.fillRect(i * 20, h - 16, 14, 16);
      c.fillRect(i * 20, 0, 14, 10);
    }
    c.fillStyle = urgente ? '#ffd23c' : '#7cf2c0';
    c.fillRect(w - 110, 34, 76, 92);
    c.fillStyle = urgente ? '#c93c3c' : '#2f9c72';
    c.font = '700 60px Fredoka, sans-serif';
    c.textAlign = 'center';
    c.fillText(urgente ? '!' : '♪', w - 72, 102);
    if (urgente) {
      c.fillStyle = '#ffffff';
      c.font = '700 54px Fredoka, sans-serif';
      c.textAlign = 'left';
      c.fillText('URGENTE', 40, h - 60);
    } else {
      c.fillStyle = '#b9aecb';
      for (const y of [190, 225, 260]) c.fillRect(60, y, 220, 10);
    }
    if (sellada) {
      // El sello cae 0,2 por detrás del centro de la carta: en el lienzo, 100 px por encima
      const x = w / 2;
      const y = h / 2 - ((FILA - Z_SELLO) / FONDO_CARTA) * h;
      c.strokeStyle = '#d9443f';
      c.fillStyle = '#d9443f';
      c.globalAlpha = 0.85;
      c.lineWidth = 9;
      for (const r of [74, 56]) {
        c.beginPath();
        c.arc(x, y, r, 0, PI * 2);
        c.stroke();
      }
      c.font = '700 44px Fredoka, sans-serif';
      c.textAlign = 'center';
      c.fillText('TK3', x, y + 16);
      c.globalAlpha = 1;
    }
  });
}

class Correos implements Escena3d {
  readonly palabra: Escena3d['palabra'];
  private readonly cartas: Carta[] = [];
  private readonly caras: Caras;
  private readonly cartera: Personaje;
  private readonly sello: THREE.Group;
  private readonly chispas: Chispas;
  private readonly goma: THREE.Texture;
  private readonly marcas: THREE.MeshStandardMaterial;
  private readonly minutero: THREE.Group;
  private readonly horario: THREE.Group;
  private readonly toldo: THREE.Mesh;
  /** Cuánto tiene la cartera el sello levantado (0 a 1); cambia poco a poco. */
  private prepara = 0;
  // Vectores y giros de trabajo: se reutilizan para no crear objetos nuevos en cada fotograma
  private readonly punto = new THREE.Vector3();
  private readonly mira = new THREE.Vector3();
  private readonly agarre = new THREE.Vector3();
  private readonly giro = new THREE.Euler();
  private readonly golpeSello = new THREE.Vector3(X_SELLO, CINTA + 0.35, Z_SELLO + 0.3);

  constructor(motor: Motor) {
    const S = motor.escena;
    this.palabra = {
      ...motor.proyectar([1.4, 2.2, 0.9]),
      aciertos: ['¡Pum!', '¡Zas!', '¡Toc!'],
    };
    this.decorado(S);
    this.goma = this.cinta(S);
    this.marcas = luminoso(0xffe58a, 1.6);
    // Marcas amarillas a los lados del sello: la carta encaja entre ellas en su pulso
    for (const lado of [-1, 1]) {
      malla(S, caja(0.08, 0.05, 1.9, 0.02), this.marcas, [
        X_SELLO + lado * 0.66,
        CINTA + 0.02,
        FILA,
      ]).castShadow = false;
    }

    // Cartas: doce sobres que se turnan, todos con las mismas piezas
    const cuerpo = caja(ANCHO_CARTA, GROSOR_CARTA, FONDO_CARTA, 0.015);
    const plano = new THREE.PlaneGeometry(ANCHO_CARTA, FONDO_CARTA);
    const papel = material(0xf3efe6, { rugoso: 0.8 });
    const cara = (urgente: boolean, sellada: boolean) =>
      material(0xffffff, { rugoso: 0.75, textura: pintarCarta(urgente, sellada) });
    this.caras = [
      [cara(false, false), cara(false, true)],
      [cara(true, false), cara(true, true)],
    ];
    for (let i = 0; i < CARTAS; i++) this.cartas.push(new Carta(S, cuerpo, plano, papel));

    this.sello = crearSello(S);
    this.chispas = new Chispas(S, 10, [0xffd23c, 0xffffff, 0xff6b6b]);
    this.cartera = this.crearCartera(S);

    // Reloj de pared: las agujas giran con la canción (el minutero da una vuelta por compás)
    const reloj = grupo(S, [2.9, 3.7, -4.75]);
    malla(reloj, cilindro(0.9, 0.9, 0.16, 32), plastico(0xff6b6b), [0, 0, 0], [PI / 2, 0, 0]);
    malla(
      reloj,
      cilindro(0.75, 0.75, 0.18, 32),
      material(0xfffaf0, { rugoso: 0.5 }),
      [0, 0, 0.01],
      [PI / 2, 0, 0],
    );
    const tinta = material(0x3a2e4a);
    const punto = esfera(0.04, 8, 6);
    for (let i = 0; i < 12; i++) {
      malla(reloj, punto, tinta, [Math.sin((i * PI) / 6) * 0.6, Math.cos((i * PI) / 6) * 0.6, 0.1]);
    }
    this.horario = grupo(reloj, [0, 0, 0.12]);
    malla(this.horario, caja(0.07, 0.42, 0.03, 0.01), tinta, [0, 0.17, 0]);
    this.minutero = grupo(reloj, [0, 0, 0.13]);
    malla(this.minutero, caja(0.05, 0.6, 0.03, 0.01), tinta, [0, 0.25, 0]);

    // Ventanilla con toldo a rayas
    const ventanilla = grupo(S, [5.6, 0, -4.6]);
    malla(ventanilla, caja(3.4, 2.0, 0.2, 0.06), luminoso(0xbfe4ff, 0.45), [0, 2.75, 0]);
    const crema = material(0xfff3dc);
    for (const x of [-0.85, 0.85])
      malla(ventanilla, caja(0.1, 2.0, 0.24, 0.03), crema, [x, 2.75, 0]);
    malla(ventanilla, caja(3.7, 0.2, 0.4, 0.05), crema, [0, 1.75, 0.1]);
    this.toldo = malla(
      ventanilla,
      deformar(new THREE.PlaneGeometry(3.9, 1.4, 26, 2), (v) => {
        v.z = (0.7 - v.y) * 0.45;
      }),
      material(0xffffff, {
        rugoso: 0.8,
        dobleCara: true,
        textura: texturaRayas(0xff6b6b, 0xfffaf0, 8),
      }),
      [0, 4.2, 0.3],
    );
  }

  actualizar(v: VistaEscena, reloj: number, dt: number): void {
    const pulsoASegundos = 60 / v.bpm;
    this.ambiente(v, reloj);

    // --- Cartas: una por cada nota que esté cerca en el tiempo ---
    for (const c of this.cartas) c.g.visible = false;
    /** Lo que falta para la próxima carta por sellar: la cartera se prepara para ella. */
    let faltaProxima = Infinity;
    v.notas.forEach((nota, i) => {
      const falta = nota.pulso - v.pulso;
      if (falta > APARECE || falta < -SE_VA) return;
      const carta = this.cartas[i % CARTAS];
      const sellada = nota.juicio === 'perfect' || nota.juicio === 'great';
      carta.g.visible = true;
      carta.vestir(this.caras, nota.pulso % 1 !== 0, sellada);
      // Un pelín de desorden fijo para cada carta, como en la propuesta
      const desorden = ((i * 37) % 7) - 3;
      const x = X_SELLO - falta * AVANCE;
      carta.g.position.set(x, CINTA, FILA + desorden * 0.015);
      carta.g.rotation.set(0, desorden * 0.03, 0);
      carta.g.scale.set(1, 1, 1);
      if (nota.juicio === 'miss') this.caerse(carta, -falta * pulsoASegundos, pulsoASegundos);
      else if (sellada) {
        // El matasellos la aplasta y luego da un saltito
        const hace = -falta * pulsoASegundos;
        carta.g.position.y += arco(tramo(hace, 0.08, 0.36)) * 0.12;
        carta.g.scale.y = 1 - 0.5 * golpe(hace - BAJADA, 0.15);
      } else if (falta > -0.2 && falta < faltaProxima) faltaProxima = falta;
    });

    // --- Chispas del último matasellos ---
    const acertada = notaAcertada(v);
    const perfecta = acertada !== null && v.notas[acertada].juicio === 'perfect';
    this.chispas.actualizar(
      this.golpeSello,
      acertada === null ? -1 : v.desdePulsacion - BAJADA,
      perfecta ? 1.5 : 1.05,
    );

    this.moverCartera(v, reloj, dt, faltaProxima, pulsoASegundos);
  }

  /** Fallo: la carta sin sellar sale despedida de la cinta, da vueltas y cae por delante. */
  private caerse(carta: Carta, segundos: number, pulsoASegundos: number): void {
    // Una nota sin pulsar no se da por fallada hasta que pasa la ventana de 90 ms
    const hace = Math.max(0, segundos - 0.09);
    const k = tramo(hace, 0, CAIDA);
    carta.g.visible = k < 1;
    // Mientras vuela ya no la lleva la cinta: se queda donde la soltó
    carta.g.position.x = X_SELLO + (Math.min(segundos, 0.09) / pulsoASegundos) * AVANCE + 0.5 * k;
    carta.g.position.y = CINTA + 2.4 * k - 4.2 * k * k;
    carta.g.position.z = FILA + 1.8 * frenar(k);
    // Gira de espaldas al sol para que el papel no deslumbre
    carta.g.rotation.set(-1.2 * k, 0.5 * k, -2.8 * k);
  }

  private moverCartera(
    v: VistaEscena,
    reloj: number,
    dt: number,
    falta: number,
    pulsoASegundos: number,
  ): void {
    const p = this.cartera;
    const d = v.desdePulsacion;
    // Anticipación: unos tres cuartos de pulso antes de que llegue la carta, levanta el sello
    this.prepara = acercar(this.prepara, suave(tramo(falta, 0.7, 0.2)), 16, dt);
    // Acción: el sello baja de golpe al pulsar (con o sin carta, como en la versión plana)
    const bajada = d < BAJADA ? frenar(d / BAJADA) : 1 - suave(tramo(d, VUELVE[0], VUELVE[1]));
    const compas = v.notas.length ? latido(v.pulso) : 0;

    // Reacción al último juicio: saltito con puño arriba, o susto con la cabeza que tiembla
    const juzgada = ultimaJuzgada(v, 1.2);
    const hace = juzgada ? juzgada.hace * pulsoASegundos : Infinity;
    const acierto = juzgada !== null && juzgada.juicio !== 'miss';
    const alegria = acierto
      ? suave(tramo(hace, 0.04, 0.14)) * (1 - suave(tramo(hace, 0.26, 0.4)))
      : 0;
    const salto = acierto ? arco(tramo(hace, 0.06, 0.3)) : 0;
    const susto =
      juzgada && !acierto ? rebote(tramo(hace, 0.09, 0.3)) * (1 - tramo(hace, 0.55, 0.75)) : 0;

    // El cuerpo acompaña: atrás al levantar el sello, adelante al estampar
    p.raiz.position.y = POS_CARTERA[1] + salto * 0.1;
    p.raiz.scale.y = ESCALA_CARTERA * (1 - 0.02 * compas);
    p.torso.rotation.x = 0.06 - 0.06 * this.prepara + 0.14 * bajada - 0.14 * susto;
    p.torso.rotation.y = 0.1 * this.prepara;

    // Sello: postura de reposo, levantado o estampado; en reposo marca el compás
    const s = this.sello;
    for (let i = 0; i < 3; i++) {
      const arriba = mezclar(SELLO_REPOSO[i], SELLO_ARRIBA[i], this.prepara);
      this.punto.setComponent(i, mezclar(arriba, SELLO_GOLPE[i], bajada));
    }
    this.punto.y += 0.04 * compas * (1 - this.prepara) * (1 - bajada);
    this.giro.set(mezclar(mezclar(0.1, -0.14, this.prepara), 0, bajada), 0, 0.06 * (1 - bajada));
    s.rotation.copy(this.giro);
    // Al tocar la carta, la goma se aplasta un poco
    s.scale.set(1, 1 - 0.14 * golpe(d - BAJADA, 0.14), 1);

    // La mano derecha va encima del pomo; se calcula en coordenadas del personaje
    this.agarre.set(...AGARRE).applyEuler(this.giro);
    this.mira.copy(this.punto).add(this.agarre);
    p.cuerpo.updateWorldMatrix(true, false);
    p.cuerpo.worldToLocal(this.mira);
    const mano = alcanzar([this.mira.x, this.mira.y, this.mira.z], 1);
    for (let i = 0; i < 3; i++) {
      p.manoD[i] = mano[i];
      p.manoI[i] = mezclar(MANO_APOYADA[i], MANO_CELEBRA[i], alegria);
    }
    p.manoI[1] -= 0.02 * compas;

    // Tras un fallo mira la carta que se cae; si no, la que llega; sin cartas, a quien juega
    if (susto > 0.3) this.mira.set(X_SELLO + 0.6, CINTA, FILA + 1.6);
    else if (falta < APARECE)
      this.mira.set(Math.max(X_SELLO - falta * AVANCE, -1.6), CINTA + 0.5, FILA);
    else this.mira.set(0.3, 3.4, 8);
    p.mirarA(this.mira, dt);
    p.cabeza.rotation.z = susto > 0 ? susto * 0.14 * Math.sin(hace * 24) : 0.05 * compas;

    if (juzgada && hace < (acierto ? 0.4 : 0.5))
      p.expresion = juzgada.juicio === 'perfect' ? 'risa' : acierto ? 'feliz' : 'sorpresa';
    else if (juzgada && hace < 0.9 && !acierto) p.expresion = 'triste';
    else if (this.prepara > 0.4) p.expresion = 'concentrado';
    else p.expresion = 'feliz';
    p.actualizar(reloj, dt);

    // El sello cuelga de la mano: así nunca se separa de ella aunque el brazo no llegue
    p.objetoManoD.getWorldPosition(this.mira);
    s.position.copy(this.mira).sub(this.agarre);
  }

  /** Lo que se mueve siempre: la goma de la cinta, las agujas del reloj, las marcas y el toldo. */
  private ambiente(v: VistaEscena, t: number): void {
    // La goma avanza lo mismo que las cartas (cada dibujo del galón mide 1,9)
    this.goma.offset.x = -((v.pulso * AVANCE) / 1.9) % 1;
    this.minutero.rotation.z = -(v.pulso / 4) * PI * 2;
    this.horario.rotation.z = -0.5 - (v.pulso / 48) * PI * 2;
    const compas = v.notas.length ? latido(v.pulso) : 0.5 + 0.5 * Math.sin(t * 2);
    this.marcas.emissiveIntensity = 0.6 + 0.5 * compas;
    this.toldo.rotation.x = 0.03 * Math.sin(t * 0.9);
  }

  private crearCartera(S: THREE.Scene): Personaje {
    const p = new Personaje(S, {
      pos: POS_CARTERA,
      escala: ESCALA_CARTERA,
      piel: 0xc98a5e,
      ropa: 0x4f8fd8,
      pelo: ['moño', 0x2a1e2e],
      cuello: 0xffd23c,
      cejas: 0x2a1e2e,
    });
    // Gorra de cartera con visera y escudo
    const cab = p.cabeza;
    const R = p.radioCabeza;
    malla(
      cab,
      casquete(R * 1.08, 0.34, 32, 12),
      tela(0x3d6fb8),
      [0, R * 0.12, -R * 0.02],
      [-0.25, 0, 0],
    );
    malla(
      cab,
      new THREE.CylinderGeometry(R * 0.75, R * 0.8, R * 0.06, 28, 1, false, -PI / 2, PI),
      plastico(0x2a3f6c),
      [0, R * 0.66, R * 0.55],
      [0.15, PI, 0],
    );
    malla(
      cab,
      esfera(R * 0.14, 16, 12),
      plastico(0xffd23c),
      [0, R * 0.82, R * 0.74],
      [0, 0, 0],
      [1, 1, 0.4],
    );
    const boton = esfera(0.022, 10, 8);
    const dorado = plastico(0xffd23c);
    for (const y of [0.98, 0.86, 0.74]) {
      malla(p.cuerpo, boton, dorado, [0, y, 0.165 + (0.98 - y) * 0.06]);
    }
    return p;
  }

  /** Cinta transportadora; devuelve la textura de la goma para hacerla avanzar. */
  private cinta(S: THREE.Scene): THREE.Texture {
    const chapa = material(0x5e5a6a, { rugoso: 0.5, metal: 0.3 });
    malla(S, caja(19, 0.3, 2.3, 0.1), chapa, [0, CINTA - 0.3, FILA]);
    const goma = texturaPintada(256, 256, (c, w, h) => {
      c.fillStyle = '#625f74';
      c.fillRect(0, 0, w, h);
      // Galón en forma de flecha: apunta hacia donde van las cartas
      c.strokeStyle = '#85849c';
      c.lineWidth = 14;
      c.lineJoin = 'round';
      c.beginPath();
      c.moveTo(90, 70);
      c.lineTo(160, 128);
      c.lineTo(90, 186);
      c.stroke();
      c.fillStyle = '#4c4a5e';
      c.fillRect(0, 0, 6, h);
    });
    goma.wrapS = goma.wrapT = THREE.RepeatWrapping;
    goma.repeat.set(10, 1);
    malla(S, caja(19, 0.12, 1.9, 0.05), material(0xffffff, { rugoso: 0.7, textura: goma }), [
      0,
      CINTA - 0.06,
      FILA,
    ]);
    const borde = plastico(0xffc93c);
    for (const z of [-0.15, 1.95]) malla(S, caja(19, 0.2, 0.16, 0.06), borde, [0, CINTA, z]);
    const rodillo = cilindro(0.16, 0.16, 0.14, 20);
    const pata = caja(0.22, 1.2, 0.22, 0.05);
    const acero = metal(0xdfe3ea);
    for (let i = -5; i <= 5; i++) {
      malla(S, rodillo, acero, [i * 1.7, CINTA - 0.28, 2.08], [PI / 2, 0, 0]);
      malla(S, pata, chapa, [i * 1.7 + 0.85, 0.5, 1.9]);
    }
    return goma;
  }

  private decorado(S: THREE.Scene): void {
    // Oficina: pared, zócalo y suelo de baldosas
    malla(
      S,
      caja(30, 10, 0.3, 0.02),
      material(0x8fd0c8, { rugoso: 0.9, textura: texturaRuido(0x8fd0c8, 0.08, [6, 2]) }),
      [0, 5, -5],
    );
    malla(
      S,
      caja(30, 1.6, 0.4, 0.05),
      material(0xfff3dc, { rugoso: 0.7, textura: texturaMadera(0xfff3dc, 1, [14, 1]) }),
      [0, 0.8, -4.85],
    );
    malla(
      S,
      caja(30, 0.2, 20, 0.02),
      material(0xffffff, { rugoso: 0.5, textura: texturaCuadros(0xf2d9a8, 0xfff3dc, 8, [6, 4]) }),
      [0, -0.1, 0],
    );

    // Casilleros con cartas asomando
    const casilleros = grupo(S, [-3.9, 1.75, -4.55]);
    malla(
      casilleros,
      caja(5.4, 3.5, 0.5, 0.05),
      material(0xc98d5a, { rugoso: 0.7, textura: texturaMadera(0xc98d5a, 2, [2, 1]) }),
      [0, 1.75, -0.1],
    );
    const hueco = caja(0.76, 0.7, 0.3, 0.03);
    const fondo = material(0x6a4028, { rugoso: 0.9 });
    const sobre = caja(0.5, 0.04, 0.4, 0.01);
    const papeles = [0xfffaf0, 0xffe2a8, 0xff8f8f, 0xbfe8ff].map((c) =>
      material(c, { rugoso: 0.8 }),
    );
    const azar = crearAzar(17);
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 4; j++) {
        const x = -2.25 + i * 0.9;
        const y = 0.48 + j * 0.84;
        malla(casilleros, hueco, fondo, [x, y, 0.08]);
        const cuantas = Math.floor(azar() * 4);
        for (let k = 0; k < cuantas; k++) {
          malla(
            casilleros,
            sobre,
            papeles[Math.floor(azar() * 4)],
            [x + (azar() - 0.5) * 0.12, y - 0.3 + k * 0.06, 0.2],
            [0, (azar() - 0.5) * 0.4, 0],
          );
        }
      }

    // Sacas de correo a la derecha y paquetes a la izquierda
    const forma = deformar(esfera(0.8, 28, 20), (v) => {
      v.y = v.y * 1.25 + 0.2;
      if (v.y > 0.7) {
        v.x *= 0.45;
        v.z *= 0.45;
      }
    });
    const cordel = material(0xfff3dc);
    for (const [x, z, color, escala] of [
      [7.2, -2.8, 0xb58a5a, 1.2],
      [6.2, -3.4, 0xc99a6a, 1.0],
    ]) {
      malla(
        S,
        forma,
        material(color, { rugoso: 1, textura: texturaRuido(color, 0.15, [3, 3]) }),
        [x, 0.7 * escala, z],
        [0, 0, 0],
        escala,
      );
      malla(S, aro(0.3 * escala, 0.05), cordel, [x, 1.62 * escala, z], [PI / 2, 0, 0]);
    }
    paquete(S, [-7.4, 0, -2.8], [1.6, 1.2, 1.3], 0.3, 0xd9a06a);
    paquete(S, [-7.2, 1.2, -2.8], [1.1, 0.8, 1.0], -0.2, 0xe8b87a);
    paquete(S, [-5.9, 0, -3.3], [1.0, 0.9, 1.0], 0.1, 0xc98d5a);

    // Tarima de la cartera (queda escondida tras la cinta)
    malla(S, caja(1.6, POS_CARTERA[1], 1.2, 0.04), material(0x8a5a3a, { rugoso: 0.8 }), [
      POS_CARTERA[0],
      POS_CARTERA[1] / 2,
      POS_CARTERA[2],
    ]);
    // Tampón de tinta sobre un taburete alto, junto a la cartera
    malla(
      S,
      caja(1.1, CINTA + 0.36, 0.8, 0.05),
      material(0xc98d5a, { rugoso: 0.7, textura: texturaMadera(0xc98d5a, 2) }),
      [-1.4, (CINTA + 0.36) / 2, -0.5],
    );
    malla(S, caja(0.9, 0.12, 0.6, 0.04), material(0x3a2e4a, { rugoso: 0.4 }), [
      -1.4,
      CINTA + 0.42,
      -0.5,
    ]);
    malla(S, caja(0.75, 0.04, 0.46, 0.02), material(0xd9443f, { rugoso: 0.6 }), [
      -1.4,
      CINTA + 0.49,
      -0.5,
    ]);
  }
}

/** Paquete de cartón con su cinta de embalar en cruz. */
function paquete(
  padre: THREE.Object3D,
  pos: V3,
  [ancho, alto, fondo]: V3,
  giro: number,
  color: number,
): void {
  const g = grupo(padre, pos, [0, giro, 0]);
  malla(
    g,
    caja(ancho, alto, fondo, 0.04),
    material(color, { rugoso: 0.85, textura: texturaRuido(color, 0.12) }),
    [0, alto / 2, 0],
  );
  const precinto = material(0xfff3dc, { rugoso: 0.6 });
  malla(g, caja(ancho + 0.01, alto + 0.01, 0.14, 0.01), precinto, [0, alto / 2, 0]);
  malla(g, caja(0.14, alto + 0.012, fondo + 0.01, 0.01), precinto, [0, alto / 2, 0]);
}

export const correos3d: Definicion3d = {
  motor: {
    cielo: [
      [0, 0xffe9c4],
      [1, 0xffd9a0],
    ],
    niebla: [0xffe2b8, 16, 40],
    camara: [0, 5.2, 8.4],
    mira: [0, 1.9, 0],
    angulo: 30,
    sol: { pos: [-5, 8, 6], color: 0xffe2b8, fuerza: 2.9 },
    contraluz: { pos: [6, 5, -5], color: 0xa8d8ff, fuerza: 1.2 },
    ambiente: { cielo: 0xfff1dc, suelo: 0xd9a06a, fuerza: 1.4 },
    exposicion: 1.0,
    reflejos: 0.5,
    resplandor: 0.2,
    foco: 9.0,
    zonaSombra: 9,
  },
  crear: (motor) => new Correos(motor),
};
