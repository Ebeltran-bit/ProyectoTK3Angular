/**
 * Escena 3D «Duelo de barberos» (difícil).
 *
 * Pregunta y respuesta, igual que la versión plana: el maestro barbero (a la izquierda) corta
 * un ritmo en la barba de su cliente y, cuatro pulsos después, tú lo repites en la de tu
 * cliente. J es un tijeretazo y K una pasada de navaja. Cada golpe se cuenta en tres tiempos:
 *  - Anticipación: el barbero acerca la herramienta a la barba (abre las tijeras o levanta
 *    la navaja hasta la mejilla).
 *  - Acción: las tijeras se cierran de golpe o la navaja baja por la barba, en el pulso.
 *  - Reacción: si se acierta, cae un mechón, la barba queda más corta y salen chispas; si se
 *    falla, cae un mechón enorme y al cliente le queda un trasquilón.
 * El patrón del maestro se queda escrito en una píldora («tris · tris · ras») sobre su puesto,
 * y tus respuestas salen en otra, verdes o rojas.
 *
 * Como en las demás escenas, todo se calcula en cada fotograma a partir de la `VistaEscena`.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { Juicio } from '../evaluacion';
import { VistaEscena } from '../escenarios/tipos';
import { arco, frenar, limitar, mezclar, rebote, suave, tramo } from './animacion';
import {
  aro,
  caja,
  cilindro,
  cono,
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
  metal,
  plastico,
  tela,
  texturaCuadros,
  texturaMadera,
  texturaPintada,
  texturaRayas,
  tono,
} from './materiales';
import { Motor } from './motor';
import { Chispas } from './objetos';
import { alcanzar, Personaje } from './personaje';
import { Definicion3d, Escena3d } from './tipos';

const PI = Math.PI;

// Ritmo de pregunta y respuesta: los mismos números que el escenario plano
/** Pulso en que empieza el primer compás del maestro, justo después de la cuenta atrás. */
const INICIO = 4;
/** Un ciclo es el compás del maestro más el tuyo. */
const CICLO = 8;
/** El maestro da cada golpe cuatro pulsos antes que tú (`aviso_antes` de la canción). */
const AVISO = 4;

/** Segundos antes del golpe en que la herramienta empieza a acercarse a la barba. */
const ACERCA = 0.5;
/** Segundos que tardan las tijeras en cerrarse y la navaja en bajar: el gesto seco. */
const CIERRE = 0.05;
const PASADA = 0.1;
/** Segundos que un mechón cortado tarda en caer y en desaparecer del suelo. */
const VIDA_MECHON = 1.3;
/** Tamaño de un mechón cortado (y del enorme que cae con un fallo). */
const MECHON = 1.5;
const MECHON_FALLO = 2.4;
const GRAVEDAD = 6;

const ESCALA_CLIENTE = 1.5;
const ESCALA_BARBERO = 1.62;
/** Largo de las tijeras y de la navaja desde la mano hasta la punta (en medidas del personaje). */
const LARGO_TIJERAS = 0.44;
const LARGO_NAVAJA = 0.34;
const COLOR_CAMISA = 0xfffaf1;

/** Barba: largo de cada una de las nueve columnas de mechones (en bolitas que cuelgan). */
const LARGO_COLUMNA = [1, 1, 2, 2, 3, 2, 2, 1, 1];
/** Columnas que se pierden con cada fallo, en orden: el trasquilón va saltando de sitio. */
const HUECOS = [5, 2, 7, 3, 6];
/** Píldoras del patrón: como mucho hay cinco golpes en un compás. */
const PILDORAS = 6;

/** Pulso en que empieza el ciclo (compás del maestro + el tuyo) en el que estamos. */
function inicioCiclo(pulso: number): number {
  return INICIO + Math.max(0, Math.floor((pulso - INICIO) / CICLO)) * CICLO;
}

/** Tubo fijo que pasa por tres puntos (patas cromadas, bigotes). */
function tuboFijo(
  padre: THREE.Object3D,
  a: V3,
  medio: V3,
  b: V3,
  radio: (t: number) => number,
  mat: THREE.Material,
): THREE.Mesh {
  const tubo = new TuboFlexible(radio, 10, 10);
  // Punto de control que hace que la curva pase por `medio` (ver `controlPorCodo` del personaje)
  const control = [0, 1, 2].map((i) => 2 * medio[i] - (a[i] + b[i]) / 2) as V3;
  tubo.colocar(a, control, b);
  return malla(padre, tubo.geometria, mat);
}

/** Cuánto se acerca a la barba una herramienta: se prepara antes del golpe y se aparta después. */
function cercania(t: Tarea, tecla: 'accion' | 'alterna'): number {
  const prepara = t.proxima === tecla ? suave(tramo(t.falta, ACERCA, 0.18)) : 0;
  const despues = t.ultima === tecla ? 1 - suave(tramo(t.desde, 0.18, 0.4)) : 0;
  return Math.max(prepara, despues);
}

/** Textura que se repite: la versión pintada a mano no lo hace, así que se le cambia el modo. */
function repetir(t: THREE.Texture, x: number, y: number): THREE.Texture {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(x, y);
  return t;
}

/** Píldora de color con un texto blanco: rótulos de turno y palabras del patrón. */
function texturaPildora(texto: string, fondo: string, letra: string, ancho = 512): THREE.Texture {
  return texturaPintada(ancho, 128, (g, w, h) => {
    g.fillStyle = fondo;
    g.beginPath();
    g.roundRect(0, 0, w, h, h / 2);
    g.fill();
    g.fillStyle = letra;
    g.font = '700 76px Fredoka, Nunito, system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(texto, w / 2, h / 2 + 5);
  });
}

/** Material que se ve tal cual, sin luces: rótulos y píldoras. */
const plano = (textura: THREE.Texture) =>
  new THREE.MeshBasicMaterial({
    map: textura,
    transparent: true,
    fog: false,
    toneMapped: false,
    depthWrite: false,
  });

/** Materiales que comparten las tijeras y las navajas de los dos barberos. */
interface Utensilios {
  acero: THREE.Material;
  asa: THREE.Material;
  eje: THREE.Material;
  mango: THREE.Material;
  /** Piezas finas de las tijeras: cajas sin redondear, que en algo tan pequeño no se nota. */
  hoja: THREE.BufferGeometry;
  mangoTijeras: THREE.BufferGeometry;
}

/** Tijeras con el origen entre las anillas, que es donde las coge la mano. Las hojas miran a +Y. */
class Tijeras {
  readonly g: THREE.Group;
  private readonly hojas: THREE.Group[] = [];

  constructor(padre: THREE.Object3D, u: Utensilios) {
    this.g = grupo(padre);
    for (const k of [-1, 1]) {
      // Cada mitad es una pieza rígida que gira en el eje: hoja arriba y anilla abajo
      const mitad = grupo(this.g, [0, 0.09, 0]);
      malla(mitad, u.hoja, u.acero, [0, 0.15, k * 0.01]);
      malla(
        mitad,
        cono(0.023, 0.07, 4),
        u.acero,
        [0, 0.335, k * 0.01],
        [0, PI / 4, 0],
        [1, 1, 0.4],
      );
      malla(mitad, u.mangoTijeras, u.acero, [k * 0.02, -0.04, k * 0.01], [0, 0, k * 0.4]);
      malla(mitad, aro(0.04, 0.014), u.asa, [k * 0.04, -0.09, k * 0.01]);
      this.hojas.push(mitad);
    }
    malla(this.g, esfera(0.022, 10, 8), u.eje, [0, 0.09, 0]);
  }

  /** @param abertura ángulo de cada hoja: 0 cerradas, 0,5 bien abiertas */
  abrir(abertura: number): void {
    this.hojas.forEach((h, i) => (h.rotation.z = (i === 0 ? -1 : 1) * abertura));
  }
}

/** Navaja de barbero abierta: mango oscuro en la mano y hoja que brilla al pasar. */
class Navaja {
  readonly g: THREE.Group;
  private readonly hoja: THREE.MeshStandardMaterial;

  constructor(padre: THREE.Object3D, u: Utensilios) {
    this.g = grupo(padre);
    this.hoja = material(0xe8eef5, { rugoso: 0.2, metal: 0.9, luz: 0xffffff, fuerzaLuz: 0 });
    malla(this.g, new THREE.BoxGeometry(0.05, 0.2, 0.032), u.mango, [0, 0.04, 0]);
    malla(this.g, esfera(0.02, 10, 8), u.eje, [0, 0.14, 0.012]);
    malla(this.g, new THREE.BoxGeometry(0.08, 0.2, 0.012), this.hoja, [0.015, 0.25, 0]);
  }

  /** @param k de 0 a 1: la hoja se ilumina durante la pasada */
  brillar(k: number): void {
    this.hoja.emissiveIntensity = 0.9 * k;
  }
}

/** Cliente sentado en el sillón, con barba de mechones redondos que se va recortando. */
class Cliente {
  readonly p: Personaje;
  /** Columnas de la barba: la bolita pegada a la cara y las que cuelgan debajo. */
  private readonly columnas: { base: THREE.Mesh; colgantes: THREE.Mesh[] }[] = [];

  constructor(padre: THREE.Object3D, pos: V3, giro: number, colores: number[], barba: number) {
    const [piel, pantalon, pelo, rayas] = colores;
    this.p = new Personaje(padre, {
      pos,
      giro,
      escala: ESCALA_CLIENTE,
      sentado: true,
      piel,
      ropa: COLOR_CAMISA,
      pantalon,
      zapatos: 0x3a2e4a,
      pelo: ['corto', pelo],
      cejas: pelo,
      barriga: 0.8,
      desfase: giro * 3,
    });
    // Camisa a rayas: se cambia el material de la ropa que pone el personaje
    const camisa = material(0xffffff, {
      rugoso: 0.85,
      textura: texturaRayas(rayas, 0xfffaf0, 8, [3, 1]),
    });
    this.p.raiz.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const m = o.material as THREE.MeshStandardMaterial;
      if (m.color?.getHex() === COLOR_CAMISA) o.material = camisa;
    });
    // Pies en el reposapiés y manos sobre las rodillas
    this.p.pieI.splice(0, 3, -0.12, 0.1, 0.44);
    this.p.pieD.splice(0, 3, 0.12, 0.1, 0.44);
    this.p.manoD.splice(0, 3, 0.3, 0.62, 0.3);
    this.p.manoI.splice(0, 3, -0.3, 0.62, 0.3);

    // Barba: nueve columnas alrededor de la mandíbula; las del centro cuelgan más
    const R = this.p.radioCabeza;
    const m = material(barba, { rugoso: 0.8, pelusa: 0.4 });
    const bola = esfera(R * 0.3, 12, 9);
    for (let i = -4; i <= 4; i++) {
      const a = (i / 4) * 1.15;
      const x = Math.sin(a) * R * 0.92;
      const z = Math.cos(a) * R * 0.86 - R * 0.05;
      const y = -R * 0.52 + Math.abs(i) * R * 0.11;
      const base = malla(this.p.cabeza, bola, m, [x, y, z]);
      const colgantes: THREE.Mesh[] = [];
      for (let k = 1; k <= LARGO_COLUMNA[i + 4]; k++) {
        colgantes.push(
          malla(
            this.p.cabeza,
            bola,
            m,
            [x * (1 - k * 0.1), y - k * R * 0.26, z * (1 - k * 0.04)],
            [0, 0, 0],
            1 - k * 0.1,
          ),
        );
      }
      this.columnas.push({ base, colgantes });
    }
  }

  /**
   * Deja la barba como corresponde a los golpes de este ciclo.
   * @param cortes golpes buenos: cada uno quita un quinto del largo
   * @param fallos cada fallo arranca una columna entera (el trasquilón)
   */
  recortar(cortes: number, fallos: number): void {
    const largo = Math.max(0, 1 - cortes * 0.2);
    this.columnas.forEach((c, i) => {
      const hueco = HUECOS.slice(0, fallos).includes(i);
      c.base.visible = !hueco;
      const quedan = Math.round(LARGO_COLUMNA[i] * largo);
      c.colgantes.forEach((m, k) => (m.visible = !hueco && k < quedan));
    });
  }

  /** Punto de la cara en coordenadas de la escena (x hacia el barbero, y, z hacia delante). */
  punto(lado: number, x: number, y: number, z: number, destino: THREE.Vector3): THREE.Vector3 {
    const R = this.p.radioCabeza;
    this.p.cabeza.updateWorldMatrix(true, false);
    return this.p.cabeza.localToWorld(destino.set(lado * x * R, y * R, z * R));
  }
}

/** Mechones que caen al suelo después de cada corte. Se reparten con `i % n`. */
class Mechones {
  private readonly grupos: THREE.Group[] = [];

  constructor(padre: THREE.Object3D, mat: THREE.Material, cuantos: number) {
    // Dos bolitas aplastadas fundidas en una sola pieza
    const mechon = mergeGeometries([
      esfera(0.06, 10, 8).scale(1.7, 0.6, 0.9).rotateZ(0.4),
      esfera(0.06, 10, 8).scale(1.3, 0.5, 0.8).rotateY(0.8).translate(0.07, -0.02, 0.03),
    ]);
    for (let i = 0; i < cuantos; i++) {
      const g = grupo(padre);
      malla(g, mechon, mat).castShadow = false;
      this.grupos.push(g);
    }
  }

  ocultar(): void {
    for (const g of this.grupos) g.visible = false;
  }

  /**
   * Coloca un mechón que cayó de `origen` hace `desde` segundos: tiro parabólico hasta el
   * suelo, donde se queda un rato y se encoge.
   */
  colocar(i: number, origen: THREE.Vector3, desde: number, lado: number, grande: boolean): void {
    const g = this.grupos[i % this.grupos.length];
    g.visible = desde >= 0 && desde < VIDA_MECHON;
    if (!g.visible) return;
    const deriva = 0.25 + (i % 3) * 0.12;
    const y = origen.y + 0.8 * desde - 0.5 * GRAVEDAD * desde * desde;
    g.position.set(origen.x + lado * deriva * desde, Math.max(0.03, y), origen.z + 0.5 * desde);
    g.rotation.set(0, i * 1.7, y > 0.03 ? desde * 9 : 0);
    const encoge = 1 - suave(tramo(desde, VIDA_MECHON - 0.3, VIDA_MECHON));
    g.scale.setScalar((grande ? MECHON_FALLO : MECHON) * encoge);
  }
}

/** Un barbero con sus dos herramientas. `lado` es −1 para el maestro (izquierda) y 1 para ti. */
interface Barbero {
  p: Personaje;
  lado: number;
  tijeras: Tijeras;
  navaja: Navaja;
  /** La mano de las tijeras (la que queda hacia el cliente) y la de la navaja. */
  manoTijeras: V3;
  manoNavaja: V3;
  reposoTijeras: V3;
  reposoNavaja: V3;
  apartaTijeras: V3;
}

/** Lo que tiene que hacer un barbero en este instante. */
interface Tarea {
  /** Segundos que faltan para el próximo golpe y con qué herramienta (Infinity si no hay). */
  falta: number;
  proxima: 'accion' | 'alterna';
  /** Segundos desde el último golpe dado y con qué herramienta (Infinity si no hay). */
  desde: number;
  ultima: 'accion' | 'alterna' | null;
}

class Barberia implements Escena3d {
  readonly palabra: Escena3d['palabra'];
  private readonly clientes: Cliente[] = [];
  private readonly barberos: Barbero[] = [];
  private readonly mechones: Mechones[] = [];
  private readonly chispas: Chispas;
  private readonly bombillas: THREE.MeshStandardMaterial[] = [];
  private readonly poste: THREE.Texture;
  /** Rótulos de turno: [maestro, tú], con su textura encendida y apagada. */
  private readonly rotulos: {
    m: THREE.MeshBasicMaterial;
    on: THREE.Texture;
    off: THREE.Texture;
  }[] = [];
  /** Píldoras con el patrón del maestro y con tus respuestas. */
  private readonly pildoras: THREE.Mesh[][] = [[], []];
  private readonly mPildora: Record<string, THREE.Material> = {};
  // Vectores de trabajo: se reutilizan para no crear objetos nuevos en cada fotograma
  private readonly punta = new THREE.Vector3();
  private readonly puntaNavaja = new THREE.Vector3();
  private readonly local = new THREE.Vector3();
  private readonly direccion = new THREE.Vector3();
  private readonly reposo = new THREE.Vector3();
  private readonly arriba = new THREE.Vector3(0, 1, 0);
  private readonly mira = new THREE.Vector3();
  private readonly origen = new THREE.Vector3();
  private readonly apartada: V3 = [0, 0, 0];

  constructor(motor: Motor) {
    const S = motor.escena;
    this.palabra = {
      ...motor.proyectar([1.55, 1.55, 1.2]),
      aciertos: ['¡Tris!', '¡Ras!', '¡Chas!'],
    };
    this.poste = this.decorado(S);
    this.rotulosYPildoras(S);

    const u: Utensilios = {
      acero: metal(0xe8eef5),
      asa: plastico(0xff6b6b),
      eje: metal(0x8a93a6),
      mango: material(0x3a2e4a, { rugoso: 0.4, barniz: 0.5 }),
      hoja: new THREE.BoxGeometry(0.045, 0.3, 0.018),
      mangoTijeras: new THREE.BoxGeometry(0.022, 0.08, 0.016),
    };
    // Puesto del maestro (izquierda) y el tuyo (derecha): uno es el espejo del otro
    // Colores de cada puesto: sillón y cliente (piel, pantalón, pelo y barba, rayas de la camisa)
    const puestos: [number, number, number[]][] = [
      [-1, 0x5aa0c8, [0xf0c098, 0x6a5a9c, 0x7a4a2a, 0xbfe4ff]],
      [1, 0xff6b6b, [0xc98a5e, 0x4f8f6a, 0xd9552b, 0xffc8d0]],
    ];
    for (const [lado, sillon, cliente] of puestos) {
      const barba = cliente[2];
      this.sillon(S, [lado * 2.5, 0, -0.4], -lado * 0.28, sillon);
      this.clientes.push(new Cliente(S, [lado * 2.4, 0.22, -0.2], -lado * 0.28, cliente, barba));
      this.mechones.push(new Mechones(S, material(barba, { rugoso: 0.8 }), 6));
    }
    this.barberos.push(
      this.barbero(S, u, -1, { piel: 0xe0a070, ropa: 0x8fd0e8, pelo: ['tupe', 0x2a1e2e] }),
      this.barbero(S, u, 1, { piel: 0xf3c09a, ropa: 0xff9a9a, pelo: ['corto', 0x4a3020] }),
    );
    this.chispas = new Chispas(S, 10, [0xffd23c, 0xffffff, 0xff8fa3]);
  }

  actualizar(v: VistaEscena, reloj: number, dt: number): void {
    const seg = 60 / v.bpm;
    const ultimaNota = v.notas.length ? v.notas[v.notas.length - 1].pulso : 0;
    // Al acabar la canción se queda el último ciclo, para que no vuelva a crecer la barba
    const ciclo = Math.min(inicioCiclo(v.pulso), inicioCiclo(ultimaNota));
    const mitad = ciclo + AVISO;
    this.ambiente(v, reloj);

    // --- Turno: se enciende el rótulo del que toca ---
    const enJuego = v.notas.length > 0 && v.pulso >= INICIO - 0.5 && v.pulso < ultimaNota + 1;
    this.rotulos.forEach((r, i) => {
      const encendido = enJuego && (i === 1) === v.pulso >= mitad;
      r.m.map = encendido ? r.on : r.off;
    });

    // --- Maestro: sus golpes son las notas adelantadas cuatro pulsos ---
    const maestro: Tarea = { falta: Infinity, proxima: 'accion', desde: Infinity, ultima: null };
    let cortesMaestro = 0;
    this.mechones[0].ocultar();
    for (const p of this.pildoras[0]) p.visible = false;
    v.notas.forEach((n, i) => {
      const golpe = n.pulso - AVISO;
      const k = v.teclas[i] === 'alterna';
      const falta = (golpe - v.pulso) * seg;
      if (falta >= 0 && falta < maestro.falta) {
        maestro.falta = falta;
        maestro.proxima = k ? 'alterna' : 'accion';
      }
      if (falta > 0) return;
      if (-falta < maestro.desde) {
        maestro.desde = -falta;
        maestro.ultima = k ? 'alterna' : 'accion';
      }
      if (golpe >= ciclo && golpe < mitad) {
        this.pildora(0, cortesMaestro, k ? 'ras' : 'tris', -falta);
        cortesMaestro++;
      }
      this.mechones[0].colocar(i, this.mechonDe(0), -falta, -1, false);
    });
    this.clientes[0].recortar(cortesMaestro, 0);

    // --- Tú: la próxima nota sin juzgar y la última tecla que has pulsado ---
    const tu: Tarea = {
      falta: Infinity,
      proxima: 'accion',
      desde: v.desdePulsacion,
      ultima: v.ultimaTecla,
    };
    let buenas = 0;
    let fallos = 0;
    this.mechones[1].ocultar();
    for (const p of this.pildoras[1]) p.visible = false;
    v.notas.forEach((n, i) => {
      const k = v.teclas[i] === 'alterna';
      const falta = (n.pulso - v.pulso) * seg;
      if (n.juicio === null) {
        if (falta > -0.1 && falta < tu.falta) {
          tu.falta = Math.max(0, falta);
          tu.proxima = k ? 'alterna' : 'accion';
        }
        return;
      }
      const fallo = n.juicio === 'miss';
      if (n.pulso >= mitad && n.pulso < ciclo + CICLO) {
        const palabra = (k ? 'ras' : 'tris') + (fallo ? '-mal' : '-bien');
        this.pildora(1, buenas + fallos, palabra, -falta);
        if (fallo) fallos++;
        else buenas++;
      }
      // Un fallo sin pulsar no se sabe hasta que pasa la ventana de 90 ms
      const desde = -falta - (fallo ? 0.09 : 0);
      this.mechones[1].colocar(i, this.mechonDe(1, fallo ? fallos : 0), desde, 1, fallo);
    });
    this.clientes[1].recortar(buenas, fallos);

    // --- Chispas en la barba con cada acierto ---
    const acertada = notaAcertada(v);
    this.chispas.actualizar(
      this.clientes[1].punto(1, 0.5, -0.9, 1.1, this.origen),
      acertada === null ? -1 : v.desdePulsacion,
      acertada !== null && v.notas[acertada].juicio === 'perfect' ? 1.5 : 1,
    );

    const juzgada = ultimaJuzgada(v, 1.5);
    const hace = juzgada ? juzgada.hace * seg : Infinity;
    const juicio = juzgada ? juzgada.juicio : null;
    this.moverClientes(v, reloj, dt, maestro, hace, juicio === 'miss');
    this.moverBarbero(this.barberos[0], this.clientes[0], maestro, v, reloj, dt, hace, juicio);
    this.moverBarbero(this.barberos[1], this.clientes[1], tu, v, reloj, dt, hace, juicio);
  }

  /** Enseña una píldora del patrón, que aparece con un rebote. */
  private pildora(fila: number, k: number, palabra: string, pulsosDesde: number): void {
    if (k >= PILDORAS) return;
    const p = this.pildoras[fila][k];
    p.visible = true;
    p.material = this.mPildora[palabra];
    p.scale.setScalar(Math.max(0.01, rebote(tramo(pulsosDesde, 0, 0.25))));
  }

  /** De dónde cae el mechón: la punta de la barba o, si es un fallo, la columna arrancada. */
  private mechonDe(i: number, fallos = 0): THREE.Vector3 {
    if (fallos === 0) return this.clientes[i].punto(1, 0, -1.2, 0.8, this.origen);
    const a = ((HUECOS[(fallos - 1) % HUECOS.length] - 4) / 4) * 1.15;
    return this.clientes[i].punto(1, Math.sin(a), -1.1, Math.cos(a) + 0.3, this.origen);
  }

  /**
   * Los clientes miran de reojo las tijeras, marcan el compás con el pie y reaccionan a
   * cada corte: el del maestro con un gesto tranquilo, el tuyo con alegría o con susto.
   */
  private moverClientes(
    v: VistaEscena,
    reloj: number,
    dt: number,
    maestro: Tarea,
    hace: number,
    fallo: boolean,
  ): void {
    const compas = v.notas.length ? latido(v.pulso) : 0;
    this.clientes.forEach((c, i) => {
      const p = c.p;
      const b = this.barberos[i];
      // Mira de reojo las tijeras (un poco por encima, para no bajar la cara)
      b.tijeras.g.getWorldPosition(this.mira);
      this.mira.y += 0.6;
      p.mirarA(this.mira, dt);
      // Toque de pie con el compás
      p.pieD[1] = 0.1 + 0.035 * compas;
      const tuyo = i === 1;
      const susto = tuyo && fallo ? rebote(tramo(hace, 0, 0.2)) * (1 - tramo(hace, 0.5, 0.75)) : 0;
      const alegria = tuyo && !fallo ? arco(tramo(hace, 0, 0.35)) : 0;
      const corteMaestro =
        !tuyo && maestro.ultima !== null ? arco(tramo(maestro.desde, 0, 0.3)) : 0;
      p.torso.rotation.x = -0.06 * susto + 0.04 * (alegria + corteMaestro);
      p.cabeza.rotation.z = susto > 0 ? susto * 0.18 * Math.sin(hace * 26) : 0;
      p.raiz.position.y = 0.22 + 0.04 * alegria;
      if (tuyo && hace < 0.8) p.expresion = fallo ? (hace < 0.35 ? 'sorpresa' : 'triste') : 'feliz';
      else if (!tuyo && corteMaestro > 0.2) p.expresion = 'feliz';
      else p.expresion = 'neutral';
      p.actualizar(reloj, dt);
    });
  }

  /**
   * Coloca a un barbero según su tarea. Cada mano tiene su herramienta; la que toca se
   * acerca a la barba antes del golpe, da el golpe en el pulso y vuelve a su sitio.
   */
  private moverBarbero(
    b: Barbero,
    cliente: Cliente,
    t: Tarea,
    v: VistaEscena,
    reloj: number,
    dt: number,
    hace: number,
    juicio: Juicio | null,
  ): void {
    const p = b.p;
    const tuyo = b.lado > 0;
    const fallo = juicio === 'miss';
    // Cuánto se acerca cada herramienta: se prepara antes del golpe y se aparta después
    const cercaTijeras = cercania(t, 'accion');
    const cercaNavaja = cercania(t, 'alterna');
    const cerca = Math.max(cercaTijeras, cercaNavaja);

    // Reacción: tú saltas con un acierto y te encoges con un fallo; el maestro se ríe de tus fallos
    const salto =
      tuyo && !fallo ? arco(tramo(hace, 0.05, 0.4)) * (juicio === 'perfect' ? 1 : 0.5) : 0;
    const pena = fallo ? rebote(tramo(hace, 0.05, 0.25)) * (1 - tramo(hace, 0.55, 0.8)) : 0;
    const compas = v.notas.length ? latido(v.pulso) : 0;
    p.raiz.position.y = salto * 0.14;
    p.raiz.scale.y = ESCALA_BARBERO * (1 - 0.025 * compas);
    // Se inclina hacia el cliente al trabajar (el cliente queda hacia −X en ti y hacia +X en el maestro)
    p.torso.rotation.z = b.lado * 0.1 * cerca;
    p.torso.rotation.x = 0.1 * cerca - (tuyo ? 0.12 * pena : -0.05 * pena);
    p.cuerpo.updateWorldMatrix(true, false);

    // Tijeras: abiertas al prepararse, se cierran de golpe en el pulso
    const abre = t.proxima === 'accion' ? suave(tramo(t.falta, 0.35, 0.06)) : 0;
    const cierra =
      t.ultima === 'accion'
        ? frenar(limitar(t.desde / CIERRE)) * (1 - suave(tramo(t.desde, 0.12, 0.3)))
        : 0;
    const enReposo = v.notas.length ? 0.12 : 0.15 + 0.12 * Math.sin(reloj * 3);
    b.tijeras.abrir(mezclar(mezclar(enReposo, 0.5, abre), 0.02, cierra));
    cliente.punto(b.lado, 0.62, -0.95, 0.85, this.punta);
    // Mientras trabaja la navaja, las tijeras se apartan hacia abajo para no cruzarse
    for (let i = 0; i < 3; i++) {
      this.apartada[i] = mezclar(b.reposoTijeras[i], b.apartaTijeras[i], cercaNavaja);
    }
    const { tijeras, manoTijeras, lado } = b;
    this.empunar(b, tijeras.g, manoTijeras, this.apartada, -lado, LARGO_TIJERAS, cercaTijeras);

    // Navaja: espera en la mejilla y baja por la barba en el pulso
    const pasa = t.ultima === 'alterna' ? frenar(limitar(t.desde / PASADA)) : 0;
    cliente.punto(b.lado, 0.85, -0.3, 0.6, this.puntaNavaja);
    cliente.punto(b.lado, 0.62, -1.15, 0.8, this.punta);
    this.punta.lerpVectors(this.puntaNavaja, this.punta, t.ultima === 'alterna' ? pasa : 0);
    this.empunar(b, b.navaja.g, b.manoNavaja, b.reposoNavaja, b.lado, LARGO_NAVAJA, cercaNavaja);
    b.navaja.brillar(t.ultima === 'alterna' ? 1 - tramo(t.desde, 0.05, 0.3) : 0);

    // Mira la barba mientras trabaja; si no, a la cámara (tú) o a tu cliente (el maestro)
    if (cerca > 0.3) cliente.punto(b.lado, 0.3, -0.9, 0.8, this.mira);
    else if (tuyo) this.mira.set(2, 3, 9);
    else this.clientes[1].punto(1, 0, 0, 0, this.mira);
    p.mirarA(this.mira, dt);
    p.cabeza.rotation.z = pena > 0 ? pena * 0.14 * Math.sin(hace * 24) : 0;

    if (tuyo && hace < 0.75 && !fallo) p.expresion = juicio === 'perfect' ? 'risa' : 'feliz';
    else if (fallo && hace < 0.8) p.expresion = tuyo ? 'triste' : 'risa';
    else if (cerca > 0.4) p.expresion = 'concentrado';
    else p.expresion = 'feliz';
    p.actualizar(reloj, dt);
  }

  /**
   * Lleva una mano con su herramienta hacia `this.punta` (la punta de la herramienta toca ese
   * punto) y la orienta hacia él. Con `cerca` = 0 la deja en reposo apuntando hacia arriba.
   * @param ladoMano 1 si es la mano derecha del personaje y −1 si es la izquierda
   */
  private empunar(
    b: Barbero,
    herramienta: THREE.Group,
    mano: V3,
    reposo: V3,
    ladoMano: number,
    largo: number,
    cerca: number,
  ): void {
    const p = b.p;
    // Todo en coordenadas del personaje: hombro, punto de trabajo y dirección entre ambos
    const objetivo = p.cuerpo.worldToLocal(this.local.copy(this.punta));
    this.direccion.set(objetivo.x - ladoMano * 0.15, objetivo.y - 0.93, objetivo.z).normalize();
    const { x, y, z } = this.reposo.copy(objetivo).addScaledVector(this.direccion, -largo);
    const alcanzada = alcanzar([x, y, z], ladoMano);
    for (let i = 0; i < 3; i++) mano[i] = mezclar(reposo[i], alcanzada[i], cerca);
    // Apunta a la barba desde donde está la mano; en reposo, hacia arriba y un poco al cliente
    this.direccion
      .set(objetivo.x - mano[0], objetivo.y - mano[1], objetivo.z - mano[2])
      .normalize();
    this.reposo.set(-b.lado * 0.3, 1, 0.35).normalize();
    this.direccion.lerp(this.reposo, 1 - cerca).normalize();
    herramienta.quaternion.setFromUnitVectors(this.arriba, this.direccion);
  }

  private barbero(
    S: THREE.Scene,
    u: Utensilios,
    lado: number,
    o: { piel: number; ropa: number; pelo: ['tupe' | 'corto', number] },
  ): Barbero {
    const p = new Personaje(S, {
      ...o,
      cejas: o.pelo[1],
      desfase: lado + 1,
      pos: [lado * 4.45, 0, 0.3],
      giro: -lado * 0.75,
      escala: ESCALA_BARBERO,
      pantalon: 0x3a2e4a,
      zapatos: 0x2a2233,
      cuello: 0xfffaf0,
      barriga: 0.3,
    });
    this.bigote(p, o.pelo[1]);
    // La mano de las tijeras es la que queda hacia el cliente: la derecha del maestro y tu izquierda
    const manoTijeras = lado < 0 ? p.manoD : p.manoI;
    const manoNavaja = lado < 0 ? p.manoI : p.manoD;
    return {
      p,
      lado,
      tijeras: new Tijeras(lado < 0 ? p.objetoManoD : p.objetoManoI, u),
      navaja: new Navaja(lado < 0 ? p.objetoManoI : p.objetoManoD, u),
      manoTijeras,
      manoNavaja,
      reposoTijeras: [-lado * 0.32, 0.92, 0.38],
      reposoNavaja: [lado * 0.3, 0.64, 0.3],
      apartaTijeras: [-lado * 0.36, 0.6, 0.12],
    };
  }

  /**
   * Bigote de manillar pegado a la cara: nace justo debajo de la nariz, sigue la curva de la
   * piel (medida sobre la esfera de la cabeza) y la punta se riza hacia arriba.
   */
  private bigote(p: Personaje, color: number): void {
    const R = p.radioCabeza;
    const m = material(color, { rugoso: 0.7, pelusa: 0.4 });
    for (const s of [1, -1]) {
      tuboFijo(
        p.cabeza,
        [0, -0.27 * R, 0.99 * R],
        [s * 0.3 * R, -0.31 * R, 0.9 * R],
        [s * 0.47 * R, -0.12 * R, 0.83 * R],
        (t) => R * (0.085 - 0.055 * t),
        m,
      );
    }
  }

  /** Sillón de barbero: asiento a la altura 1, pie cromado y reposapiés. */
  private sillon(S: THREE.Scene, pos: V3, giro: number, color: number): void {
    const g = grupo(S, pos, [0, giro, 0]);
    const cuero = material(color, { rugoso: 0.35, barniz: 0.5 });
    const cromo = metal(0xdfe6f0);
    malla(g, cilindro(0.62, 0.7, 0.1, 32), cromo, [0, 0.05, 0]);
    malla(g, cilindro(0.13, 0.16, 0.75, 20), cromo, [0, 0.45, 0]);
    malla(g, caja(1.2, 0.28, 1.1, 0.12), cuero, [0, 0.9, 0]);
    malla(g, caja(1.15, 1.35, 0.26, 0.12), cuero, [0, 1.6, -0.5], [-0.12, 0, 0]);
    malla(g, caja(0.6, 0.32, 0.22, 0.1), cuero, [0, 2.4, -0.58], [-0.12, 0, 0]);
    const fino = () => 0.035;
    for (const s of [-1, 1]) {
      malla(g, caja(0.16, 0.14, 0.9, 0.06), cuero, [s * 0.66, 1.3, -0.02]);
      tuboFijo(g, [s * 0.66, 1.24, 0.38], [s * 0.66, 1.0, 0.42], [s * 0.6, 0.9, 0.3], fino, cromo);
      tuboFijo(g, [s * 0.3, 0.8, 0.5], [s * 0.3, 0.4, 0.95], [s * 0.3, 0.28, 1.0], fino, cromo);
    }
    malla(g, caja(0.9, 0.08, 0.4, 0.04), cromo, [0, 0.26, 1.08]);
  }

  /** Rótulos de turno sobre los espejos y las píldoras del patrón (todas ocultas al principio). */
  private rotulosYPildoras(S: THREE.Scene): void {
    const rotulos: [number, string, string][] = [
      [-3.4, 'RIVAL', '#5a4a6c'],
      [3.4, 'TU TURNO', '#ff6b6b'],
    ];
    for (const [x, texto, color] of rotulos) {
      const on = texturaPildora(texto, color, '#ffffff');
      const off = texturaPildora(texto, '#c9bfd6', '#a596b8');
      const m = plano(off);
      sinSombra(malla(S, new THREE.PlaneGeometry(2.0, 0.5), m, [x, 4.75, -3.8]));
      this.rotulos.push({ m, on, off });
    }
    const colores: Record<string, string> = {
      tris: '#8a7d97',
      ras: '#e0a21a',
      'tris-bien': '#3fb67e',
      'ras-bien': '#2f9a6a',
      'tris-mal': '#ff6b6b',
      'ras-mal': '#e04a5a',
    };
    for (const [nombre, color] of Object.entries(colores)) {
      this.mPildora[nombre] = plano(texturaPildora(nombre.split('-')[0], color, '#ffffff', 256));
    }
    const forma = new THREE.PlaneGeometry(0.56, 0.28);
    for (const [fila, x] of [
      [0, -2.55],
      [1, 2.55],
    ]) {
      for (let k = 0; k < PILDORAS; k++) {
        const m = malla(S, forma, this.mPildora['tris'], [x - 1.24 + k * 0.62, 3.2, 0.9]);
        m.castShadow = m.receiveShadow = false;
        m.visible = false;
        this.pildoras[fila].push(m);
      }
    }
  }

  /** Lo que se mueve siempre: el poste gira (sus rayas suben) y las bombillas laten con el compás. */
  private ambiente(v: VistaEscena, t: number): void {
    this.poste.offset.y = -t * 0.25;
    const compas = v.notas.length ? latido(v.pulso) : 0.5 + 0.5 * Math.sin(t * 2);
    this.bombillas.forEach((m, i) => (m.emissiveIntensity = 1.8 + 1.2 * (i ? compas : 1 - compas)));
  }

  /** Local de la barbería: suelo de damero, pared a rayas, espejos, poste y carrito. Devuelve la textura del poste. */
  private decorado(S: THREE.Scene): THREE.Texture {
    malla(
      S,
      new THREE.BoxGeometry(30, 0.2, 22),
      material(0xffffff, {
        rugoso: 0.3,
        barniz: 0.5,
        textura: texturaCuadros(0x3a2e4a, 0xe8dcc8, 8, [5, 4]),
      }),
      [0, -0.1, 0],
    );
    malla(
      S,
      new THREE.BoxGeometry(30, 10, 0.3),
      material(0x5fbfae, { rugoso: 0.9, textura: texturaRayas(0x5fbfae, 0x6fcaba, 8, [10, 1]) }),
      [0, 5, -4.2],
    );
    malla(
      S,
      new THREE.BoxGeometry(30, 1.8, 0.36),
      material(0xfffaf0, { rugoso: 0.3, barniz: 0.6, textura: texturaAzulejos(0xfffaf0, [14, 1]) }),
      [0, 0.9, -4.1],
    );
    malla(S, caja(30, 0.16, 0.42, 0.04), plastico(0xff6b6b), [0, 1.85, -4.08]);

    // Dos espejos con bombillas, y una repisa con frascos debajo de cada uno
    const espejo = texturaPintada(256, 256, (g, w, h) => {
      const degradado = g.createLinearGradient(0, 0, w, h);
      degradado.addColorStop(0, '#d8f2ff');
      degradado.addColorStop(1, '#9fd0ee');
      g.fillStyle = degradado;
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255, 255, 255, 0.55)';
      // Dos reflejos en diagonal
      for (const x of [40, 90]) {
        const ancho = x < 50 ? 30 : 15;
        g.beginPath();
        g.moveTo(x, h);
        g.lineTo(x + 130, 0);
        g.lineTo(x + 130 + ancho, 0);
        g.lineTo(x + ancho, h);
        g.fill();
      }
    });
    const mEspejo = new THREE.MeshStandardMaterial({
      map: espejo,
      roughness: 0.2,
      emissive: 0xffffff,
      emissiveMap: espejo,
      emissiveIntensity: 0.05,
    });
    const marco = material(0xffc93c, { rugoso: 0.4, barniz: 0.5 });
    const repisa = material(0xc98d5a, { rugoso: 0.5, textura: texturaMadera(0xc98d5a, 1, [2, 1]) });
    // Las siete bombillas de cada espejo son una sola pieza
    const bombillas = mergeGeometries(
      [0, 1, 2, 3, 4, 5, 6].map((i) => esfera(0.11, 12, 8).translate(-1.5 + i * 0.5, 0, 0)),
    );
    const frascos: [number, number, number][] = [
      [-1.4, 0xff8fa3, 0.5],
      [-1.0, 0x7cf2c0, 0.36],
      [-0.55, 0x5aa0c8, 0.44],
      [1.0, 0xffc93c, 0.4],
      [1.42, 0xb58cff, 0.52],
    ];
    const tapon = material(0xfffaf0);
    const cuenco = material(0xfffaf0, { rugoso: 0.3, barniz: 0.6 });
    const brocha = material(0x8a5a3a);
    const mFrascos = frascos.map(([, c]) =>
      material(c, { rugoso: 0.15, barniz: 1, opacidad: 0.9 }),
    );
    for (const x of [-3.4, 3.4]) {
      malla(S, caja(3.5, 2.9, 0.16, 0.2), marco, [x, 4.0, -4.0]);
      malla(S, new THREE.BoxGeometry(3.1, 2.5, 0.18), mEspejo, [x, 4.0, -3.98]);
      const mBombilla = luminoso(0xfff2c8, 2.4);
      this.bombillas.push(mBombilla);
      malla(S, bombillas, mBombilla, [x, 5.55, -3.86]).castShadow = false;
      malla(S, caja(3.7, 0.12, 0.6, 0.04), repisa, [x, 2.25, -3.75]);
      frascos.forEach(([dx, , alto], i) => {
        malla(S, cilindro(0.13, 0.15, alto, 18), mFrascos[i], [x + dx, 2.31 + alto / 2, -3.7]);
        malla(S, cilindro(0.06, 0.06, 0.12, 12), tapon, [x + dx, 2.37 + alto, -3.7]);
      });
      // Cuenco de espuma con su brocha
      malla(S, cilindro(0.24, 0.2, 0.32, 20), cuenco, [x + 0.3, 2.47, -3.7]);
      malla(S, cilindro(0.02, 0.02, 0.5, 6), brocha, [x + 0.36, 2.6, -3.7], [0, 0, -0.35]);
    }

    // Poste de barbero entre los espejos: sus rayas suben moviendo la textura
    const rayas = texturaPintada(128, 256, (g, w, h) => {
      g.fillStyle = '#fffaf0';
      g.fillRect(0, 0, w, h);
      for (let i = -4; i < 8; i++) {
        g.fillStyle = i % 2 ? '#ff6b6b' : '#5aa0c8';
        g.beginPath();
        g.moveTo(0, i * 64);
        g.lineTo(w, i * 64 - 70);
        g.lineTo(w, i * 64 - 38);
        g.lineTo(0, i * 64 + 32);
        g.fill();
      }
    });
    repetir(rayas, 1, 1);
    const mPoste = new THREE.MeshStandardMaterial({
      map: rayas,
      roughness: 0.25,
      emissive: 0xffffff,
      emissiveMap: rayas,
      emissiveIntensity: 0.35,
    });
    malla(S, cilindro(0.3, 0.3, 1.9, 28), mPoste, [0, 4.1, -3.8]);
    const cromo = metal(0xdfe6f0);
    for (const y of [3.05, 5.15]) malla(S, cilindro(0.36, 0.36, 0.22, 28), cromo, [0, y, -3.8]);
    malla(S, esfera(0.3, 20, 14), cromo, [0, 5.4, -3.8]);

    this.carrito(S, cromo);

    // Pelo cortado por el suelo de cada puesto
    const azar = crearAzar(19);
    for (const [x, color] of [
      [-2.5, 0x7a4a2a],
      [2.7, 0xd9552b],
    ]) {
      const piezas: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 7; i++) {
        const r = 0.7 + azar() * 0.5;
        piezas.push(
          esfera(0.07, 10, 8)
            .scale(1.6 * r, 0.35 * r, 0.9 * r)
            .rotateY(azar() * 3)
            .translate(x - 0.9 + azar() * 1.8, 0.02, 0.9 + azar() * 1.2),
        );
      }
      const m = malla(S, mergeGeometries(piezas), material(color, { rugoso: 0.8 }));
      m.castShadow = false;
    }
    return rayas;
  }

  /** Carrito de dos baldas con un bote de peines, una toalla doblada y una pastilla de jabón. */
  private carrito(S: THREE.Scene, cromo: THREE.Material): void {
    const car = grupo(S, [0, 0, -1.6]);
    const balda = caja(1.5, 0.08, 0.9, 0.04);
    malla(car, balda, cromo, [0, 1.5, 0]);
    malla(car, balda, cromo, [0, 0.7, 0]);
    const pata = cilindro(0.03, 0.03, 1.5, 8);
    for (const x of [-0.68, 0.68])
      for (const z of [-0.38, 0.38]) malla(car, pata, cromo, [x, 0.78, z]);
    malla(car, cilindro(0.26, 0.2, 0.4, 20), plastico(0xff8fa3), [-0.35, 1.74, 0]);
    const peine = cilindro(0.02, 0.02, 0.55, 6);
    [0x5aa0c8, 0xffc93c, 0x3a2e4a, 0x7cf2c0].forEach((c, i) => {
      malla(car, peine, material(c), [-0.35 + (i - 1.5) * 0.06, 1.9, 0], [0, 0, (i - 1.5) * 0.14]);
    });
    malla(
      car,
      esfera(0.26, 16, 10),
      material(0xfffaf0, { rugoso: 0.9 }),
      [0.32, 1.72, 0.05],
      [0, 0, 0],
      [1.2, 0.7, 1],
    );
    malla(car, caja(0.8, 0.5, 0.6, 0.06), tela(0xfffaf0), [0, 0.98, 0]);
  }
}

/** Azulejos con junta, para el zócalo. */
function texturaAzulejos(color: number, veces: [number, number]): THREE.Texture {
  const azar = crearAzar(3);
  const css = (c: number) => '#' + new THREE.Color(c).getHexString();
  const t = texturaPintada(512, 512, (g, w) => {
    const lado = w / 4;
    g.fillStyle = css(tono(color, -0.25));
    g.fillRect(0, 0, w, w);
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        g.fillStyle = css(tono(color, (azar() - 0.5) * 0.12));
        g.beginPath();
        g.roundRect(i * lado + 4, j * lado + 4, lado - 8, lado - 8, 8);
        g.fill();
      }
  });
  return repetir(t, ...veces);
}

export const barberia3d: Definicion3d = {
  motor: {
    cielo: [
      [0, 0xfff1dc],
      [1, 0xffe2b8],
    ],
    niebla: [0xffe9cc, 30, 80],
    camara: [0, 3.2, 11.4],
    mira: [0, 2.25, 0],
    angulo: 30,
    sol: { pos: [-3, 9, 7], color: 0xffdcb0, fuerza: 2.5 },
    contraluz: { pos: [6, 5, -5], color: 0xa8d8ff, fuerza: 1.1 },
    ambiente: { cielo: 0xfff1dc, suelo: 0xd9a06a, fuerza: 0.6 },
    exposicion: 0.83,
    reflejos: 0.2,
    resplandor: 0.14,
    foco: 11.6,
    zonaSombra: 10,
  },
  crear: (motor) => new Barberia(motor),
};
