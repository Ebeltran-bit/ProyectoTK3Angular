/**
 * Escena 3D «Ramen a contratiempo» (media).
 *
 * Un cocinero corta verduras en la barra de un puesto de ramen. Igual que en la versión
 * plana, cada verdura avanza por la tabla hacia un cuchillo que no cambia de sitio y lleva
 * anillos de puntos: cada anillo llega bajo el cuchillo justo en el pulso de su corte (J),
 * así que la distancia entre anillos ES el ritmo. Medio pulso después del último corte, con
 * la tapa de la olla ya levantada, la K (a contratiempo) echa los trozos a la olla.
 *
 * Cada nota tiene tres tiempos:
 *  - Anticipación: el cocinero levanta el cuchillo mientras llega el anillo. Antes de la K
 *    la tapa se levanta (un pulso antes) y él apoya el cuchillo en la tabla, listo para barrer.
 *  - Acción: el cuchillo cae de golpe (0,07 s) o, con la K, barre los trozos hacia la olla.
 *  - Reacción: con acierto el trozo se separa de un saltito y saltan chispas; con fallo
 *    queda una marca roja, el trozo sigue pegado y lo que no llega a la olla se cae.
 *
 * Como en las demás escenas, todo se calcula en cada fotograma a partir de la `VistaEscena`.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { tandas } from '../escenarios/ramen';
import { VistaEscena } from '../escenarios/tipos';
import { arco, frenar, golpe, limitar, mezclar, rebote, suave, tramo } from './animacion';
import {
  V3,
  aro,
  caja,
  capsula,
  casquete,
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
  luminoso,
  material,
  plastico,
  tela,
  texturaMadera,
  texturaPintada,
  tono,
} from './materiales';
import { Motor } from './motor';
import { Chispas } from './objetos';
import { alcanzar, Personaje } from './personaje';
import { Definicion3d, Escena3d } from './tipos';

const PI = Math.PI;
type Tanda = ReturnType<typeof tandas>[number];

// --- Mesa de trabajo. Todo lo que se juega va en el grupo `mesa`, algo reducido para que
// quepa en el encuadre como en la propuesta: estas medidas son de ese grupo ---
const POS_MESA: V3 = [0.35, -0.04, 0.1];
const ESCALA_MESA = 0.78;
/** Altura de la cara de arriba de la tabla de cortar y de la barra. */
const TABLA = 1.48;
const BARRA = 1.33;
/** Línea por la que avanzan las verduras (z). */
const FILA = 0.75;
/** El cuchillo no cambia de x: los anillos llegan aquí en el pulso de su corte. */
const X_CUCHILLO = 0.62;
/** Lo que avanza la verdura en un pulso. */
const AVANCE = 0.65;
/** Hasta dónde llegan los trozos cortados: ahí se amontonan. */
const X_MONTON = 2.35;
/** Separación que se abre entre un trozo recién cortado y el resto. */
const HUECO = 0.07;
/** Largo de la punta y del extremo de las hojas, sin contar sus remates redondos. */
const LARGO_PUNTA = 0.04;
const LARGO_CABEZA = 0.12;
/** Pulsos antes del primer corte en los que la verdura cae sobre la tabla. */
const APARECE = 4;
/** Pulsos que una tanda sigue a la vista después de su K. */
const SE_QUEDA = 0.9;
/** Pulsos antes de la K en los que la tapa empieza a levantarse (igual que en el plano). */
const AVISO_OLLA = 1;
/** Pulsos que tardan los trozos en llegar a la olla. */
const VUELO = 0.5;
/** Verduras que pueden verse a la vez y cortes que tiene como mucho una tanda. */
const A_LA_VEZ = 3;
const MAX_CORTES = 5;

// Cuchillo: alturas de su centro. El filo queda MEDIO_FILO por debajo
const MEDIO_FILO = 0.5;
const ABAJO = TABLA + MEDIO_FILO;
const REPOSO = ABAJO + 0.72;
const ARRIBA = REPOSO + 0.3;
/** Cuánto empuja el cuchillo hacia la olla al pulsar K. */
const BARRIDO = 0.55;
/** Por dónde lo agarra el cocinero, en coordenadas del cuchillo. */
const MANGO: V3 = [0, 0.18, -0.92];

const OLLA: V3 = [3.5, BARRA, 0.5];
/** Altura del caldo dentro de la olla. */
const CALDO = 1.08;
const CUENCO_RESTOS: V3 = [1.7, BARRA + 0.2, 2.5];
const ESCALA_COCINERO = 1.7;

/**
 * Cómo es cada verdura (mismos nombres y orden que el escenario plano): grosor, largo de la
 * punta redonda (en radios) y colores de la piel, de la carne y del centro del corte.
 */
interface Hortaliza {
  radio: number;
  punta: number;
  piel: number;
  carne: number;
  centro: number;
}
const HORTALIZAS: Record<string, Hortaliza> = {
  zanahoria: { radio: 0.3, punta: 1.1, piel: 0xff8a22, carne: 0xffa94d, centro: 0xffc98a },
  cebolleta: { radio: 0.14, punta: 0.6, piel: 0xe4f2c4, carne: 0xf7fbe6, centro: 0xc8e89a },
  seta: { radio: 0.2, punta: 0.5, piel: 0xf2e2c8, carne: 0xfff4e2, centro: 0xf6e8d0 },
  pimiento: { radio: 0.28, punta: 0.8, piel: 0xe8505b, carne: 0xffe2d6, centro: 0xfff6ee },
  maíz: { radio: 0.23, punta: 0.8, piel: 0xffd84a, carne: 0xffe98a, centro: 0xfff6d0 },
  nabo: { radio: 0.25, punta: 0.9, piel: 0xf4f1f8, carne: 0xffffff, centro: 0xefe6f8 },
};

/** Lo que se prepara una vez por verdura y comparten todas las copias. */
interface Tipo {
  h: Hortaliza;
  mPiel: THREE.Material;
  mCorte: THREE.Material;
  anillo: THREE.BufferGeometry;
  marca: THREE.BufferGeometry;
}

/** Geometrías de un trozo, de radio 1 y tumbadas en el eje x. */
interface PiezasTrozo {
  cuerpo: THREE.BufferGeometry;
  cara: THREE.BufferGeometry;
  punta: THREE.BufferGeometry;
  provisional: THREE.Material;
}

/** Un trozo de verdura entre dos líneas. Su origen está en el centro, sobre el eje. */
class Trozo {
  readonly g: THREE.Group;
  private readonly cuerpo: THREE.Mesh;
  private readonly caraI: THREE.Mesh;
  private readonly caraD: THREE.Mesh;
  private readonly punta: THREE.Mesh;

  constructor(padre: THREE.Object3D, p: PiezasTrozo) {
    this.g = grupo(padre);
    // Los materiales se ponen en `formar`, según la verdura que toque
    this.cuerpo = malla(this.g, p.cuerpo, p.provisional);
    this.caraI = malla(this.g, p.cara, p.provisional);
    this.caraD = malla(this.g, p.cara, p.provisional);
    this.punta = malla(this.g, p.punta, p.provisional);
  }

  /** Da forma al trozo: largo, grosor y qué extremos enseñan la carne del corte. */
  formar(t: Tipo, largo: number, cortadoI: boolean, cortadoD: boolean, esPunta: boolean): void {
    const r = t.h.radio;
    this.cuerpo.material = this.punta.material = t.mPiel;
    this.caraI.material = this.caraD.material = t.mCorte;
    this.cuerpo.scale.set(largo, r, r);
    this.caraI.visible = cortadoI;
    this.caraD.visible = cortadoD;
    this.caraI.position.x = -largo / 2 - 0.004;
    this.caraD.position.x = largo / 2 + 0.004;
    this.caraI.scale.set(1, r * 0.97, r * 0.97);
    this.caraD.scale.set(1, r * 0.97, r * 0.97);
    this.punta.visible = esPunta;
    this.punta.position.x = largo / 2;
    this.punta.scale.set(r * t.h.punta, r, r);
  }
}

/** Una verdura de la tabla: sus trozos, sus anillos de puntos, las marcas de fallo y las hojas. */
class Verdura {
  readonly g: THREE.Group;
  readonly trozos: Trozo[] = [];
  readonly anillos: THREE.Mesh[] = [];
  readonly marcas: THREE.Mesh[] = [];
  /** Extremo que no se corta (hojas, sombrero, rabito). Su origen es el final del cuerpo. */
  readonly cabeza: THREE.Group;
  private readonly adornos = new Map<string, THREE.Object3D>();

  constructor(
    padre: THREE.Object3D,
    piezas: PiezasTrozo,
    plantillas: Map<string, THREE.Object3D>,
    mPuntos: THREE.Material,
    mMarca: THREE.Material,
  ) {
    this.g = grupo(padre);
    for (let i = 0; i <= MAX_CORTES; i++) this.trozos.push(new Trozo(this.g, piezas));
    for (let i = 0; i < MAX_CORTES; i++) {
      this.anillos.push(sinSombra(malla(this.g, piezas.cara, mPuntos)));
      this.marcas.push(sinSombra(malla(this.g, piezas.cara, mMarca)));
    }
    this.cabeza = grupo(this.g);
    // Cada copia lleva los seis adornos (comparten geometría) y enseña el de su verdura
    for (const [nombre, plantilla] of plantillas) {
      const adorno = plantilla.clone();
      this.cabeza.add(adorno);
      this.adornos.set(nombre, adorno);
    }
  }

  vestir(nombre: string, t: Tipo): void {
    for (const [n, adorno] of this.adornos) adorno.visible = n === nombre;
    for (const m of this.anillos) m.geometry = t.anillo;
    for (const m of this.marcas) m.geometry = t.marca;
  }
}

/** Cómo está el cuchillo en este fotograma: lo usa el cocinero para acompañarlo. */
interface EstadoCuchillo {
  prepara: number;
  corte: number;
  barrido: number;
}

class Ramen implements Escena3d {
  readonly palabra: Escena3d['palabra'];
  private readonly tipos = new Map<string, Tipo>();
  private readonly verduras: Verdura[] = [];
  private readonly cuchillo: THREE.Group;
  private readonly marcaCorte: THREE.MeshStandardMaterial;
  private readonly cocinero: Personaje;
  private readonly tapa: THREE.Group;
  private readonly caldo: THREE.Mesh;
  private readonly vapor: THREE.Mesh[] = [];
  /** Trocitos que flotan en el caldo: dos por cada tanda bien echada (las seis últimas). */
  private readonly tropezones: THREE.Mesh[] = [];
  private readonly llama: THREE.MeshStandardMaterial;
  private readonly faroles: THREE.Group[] = [];
  private readonly cortinas: THREE.Mesh[] = [];
  private readonly chispasCorte: Chispas;
  private readonly chispasOlla: Chispas;
  // Cálculos intermedios de cada fotograma (se rellenan de nuevo cada vez, no recuerdan nada)
  private readonly lineas: number[] = [];
  private readonly desplazamiento: number[] = [];
  private readonly saltos: number[] = [];
  private readonly sueltos: boolean[] = [];
  /** Altura de lo más alto que hay bajo el cuchillo: ahí se para si el corte no vale. */
  private bajoCuchillo = TABLA;
  /** Las tandas solo dependen de las teclas de la canción: se calculan una vez por canción. */
  private teclasVistas: unknown = null;
  private lista: Tanda[] = [];
  // Vectores de trabajo: se reutilizan para no crear objetos nuevos en cada fotograma
  private readonly punto = new THREE.Vector3();
  private readonly mira = new THREE.Vector3();
  private readonly sobreElCorte = new THREE.Vector3(X_CUCHILLO, TABLA + 0.45, FILA + 0.35);
  private readonly bocaOlla = new THREE.Vector3(OLLA[0], OLLA[1] + CALDO + 0.25, OLLA[2]);

  constructor(motor: Motor) {
    const S = motor.escena;
    // La palabra sale arriba a la derecha del cuchillo: la verdura llega por la izquierda
    const sitio = enMundo([X_CUCHILLO + 0.45, 3.0, FILA]);
    this.palabra = {
      ...motor.proyectar([sitio.x, sitio.y, sitio.z]),
      aciertos: ['¡Chop!', '¡Tac!', '¡Chas!'],
    };
    this.decorado(S);
    const T = grupo(S, POS_MESA, [0, 0, 0], ESCALA_MESA);
    this.mesa(T);

    // Tabla de cortar y la marca dorada que señala dónde cae el cuchillo
    const madera = material(0xf2cf9a, {
      rugoso: 0.55,
      textura: texturaMadera(0xf2cf9a, 3, [2, 1]),
    });
    malla(T, caja(7.2, 0.16, 1.5, 0.06), madera, [-0.9, TABLA - 0.08, FILA]);
    this.marcaCorte = luminoso(0xffe58a, 1.8);
    const marca = malla(T, aro(0.42, 0.035), this.marcaCorte, [X_CUCHILLO, TABLA + 0.01, FILA]);
    marca.rotation.x = PI / 2;
    sinSombra(marca).scale.set(0.5, 1.4, 1);

    // Cuchillo de cocinero: hoja de canto hacia la cámara y mango hacia el cocinero
    this.cuchillo = grupo(T, [X_CUCHILLO, REPOSO, FILA], [0, 0, 0.1]);
    const hoja = material(0xe8eef5, { rugoso: 0.18, metal: 0.95 });
    malla(this.cuchillo, caja(0.07, MEDIO_FILO * 2, 1.3, 0.025), hoja);
    const mango = material(0x5a3a2a, { rugoso: 0.5, barniz: 0.4 });
    malla(this.cuchillo, caja(0.1, 0.22, 0.6, 0.05), mango, MANGO);

    this.prepararVerduras(T);
    this.chispasCorte = new Chispas(T, 10, [0xffffff, 0xffd23c, 0xff8a22]);
    this.chispasOlla = new Chispas(T, 10, [0xffd23c, 0xffffff, 0x7cf2c0]);

    // Olla humeante sobre el fogón. La tapa está sujeta por su borde izquierdo (bisagra)
    const olla = grupo(T, OLLA);
    const acero = material(0xc9d2de, { rugoso: 0.25, metal: 0.85 });
    const negro = material(0x3a3340, { rugoso: 0.4, metal: 0.6 });
    malla(olla, caja(2.2, 0.16, 1.8, 0.05), negro, [0, 0.08, 0]);
    this.llama = luminoso(0x6fb8ff, 2.5);
    sinSombra(malla(olla, aro(0.55, 0.05), this.llama, [0, 0.2, 0], [PI / 2, 0, 0]));
    const perfilOlla = [0.001, 0.25, 0.72, 0.25, 0.8, 0.32, 0.84, 1.15, 0.9, 1.2, 0.84, 1.24];
    malla(olla, torno(pares([...perfilOlla, 0.76, 1.15, 0.74, 0.4, 0.001, 0.36])), acero);
    for (const lado of [-1, 1]) {
      const asa = malla(olla, aro(0.16, 0.045, PI), negro, [lado * 0.92, 1.0, 0]);
      asa.rotation.set(PI / 2, 0, -lado * (PI / 2));
    }
    const caldo = material(0xf2b05a, { rugoso: 0.2, barniz: 1, luz: 0xd9802a, fuerzaLuz: 0.25 });
    this.caldo = malla(olla, cilindro(0.77, 0.77, 0.04, 32), caldo, [0, CALDO, 0]);
    this.ramen(olla);
    this.tapa = grupo(grupo(olla, [-0.86, 1.24, 0]));
    const tapa = grupo(this.tapa, [0.86, 0, 0]);
    const perfilTapa = [0.001, 0.14, 0.4, 0.12, 0.86, 0.02, 0.9, 0, 0.86, -0.03, 0.001, -0.02];
    malla(tapa, torno(pares(perfilTapa)), acero);
    malla(tapa, esfera(0.13, 16, 12), negro, [0, 0.22, 0]);
    const mVapor = material(0xffffff, { rugoso: 1, opacidad: 0.22, luz: 0xffffff, fuerzaLuz: 0.2 });
    const bola = esfera(1, 16, 12);
    for (let i = 0; i < 6; i++) this.vapor.push(sinSombra(malla(olla, bola, mVapor)));

    // Cocinero con cinta en la frente y delantal
    this.cocinero = new Personaje(S, {
      pos: [0.2, 0.3, -0.8],
      giro: 0.05,
      escala: ESCALA_COCINERO,
      piel: 0xf0c098,
      ropa: 0xfdfaf2,
      pelo: ['corto', 0x2a1e2e],
      cejas: 0x2a1e2e,
      barriga: 0.5,
    });
    const cab = this.cocinero.cabeza;
    const R = this.cocinero.radioCabeza;
    malla(cab, aro(R, R * 0.1), tela(0xfff3dc), [0, R * 0.52, -R * 0.03], [PI / 2 - 0.2, 0, 0]);
    const botonRojo = malla(cab, esfera(R * 0.13, 14, 10), plastico(0xd9443f), [0, R * 0.56, R]);
    botonRojo.scale.z = 0.4;
    const cuerpo = this.cocinero.cuerpo;
    malla(cuerpo, caja(0.36, 0.34, 0.05, 0.03), tela(0x2f3f6c), [0, 0.74, 0.185]);
    const boton = plastico(0x2a1e2e);
    for (const y of [0.98, 0.9]) malla(cuerpo, esfera(0.02, 10, 8), boton, [0.06, y, 0.165]);
  }

  /** Materiales y geometrías de las verduras, y las tres verduras que se van turnando. */
  private prepararVerduras(T: THREE.Group): void {
    const piezas: PiezasTrozo = {
      cuerpo: cilindro(1, 1, 1, 28).rotateZ(PI / 2),
      cara: cilindro(1, 1, 0.012, 28).rotateZ(PI / 2),
      punta: casquete(1, 0.5, 24, 10).rotateZ(-PI / 2),
      provisional: material(0xffffff),
    };
    for (const [nombre, h] of Object.entries(HORTALIZAS)) {
      const r = h.radio + 0.03;
      // Anillo de nueve puntos que rodea la verdura por delante y por encima
      const puntos: THREE.BufferGeometry[] = [];
      for (let k = 0; k < 9; k++) {
        const a = -0.3 + (k / 8) * (PI + 0.6);
        puntos.push(esfera(0.032, 6, 4).translate(0, Math.sin(a) * r, Math.cos(a) * r));
      }
      const piel = texturaPiel(nombre);
      this.tipos.set(nombre, {
        h,
        mPiel: material(piel ? 0xffffff : h.piel, { rugoso: 0.45, barniz: 0.3, textura: piel }),
        mCorte: material(0xffffff, { rugoso: 0.5, textura: texturaCorte(h) }),
        anillo: mergeGeometries(puntos),
        // Raya roja torcida alrededor del frente, como la del escenario plano
        marca: aro(h.radio + 0.015, 0.03, 2.4)
          .rotateZ(PI - 1.2)
          .rotateY(PI / 2)
          .rotateZ(0.35),
      });
    }
    const plantillas = new Map<string, THREE.Object3D>();
    for (const [nombre, t] of this.tipos) plantillas.set(nombre, adorno(nombre, t.mPiel));
    const mPuntos = luminoso(0xffffff, 1.4);
    const mMarca = luminoso(0xe0435f, 0.8);
    for (let i = 0; i < A_LA_VEZ; i++) {
      this.verduras.push(new Verdura(T, piezas, plantillas, mPuntos, mMarca));
    }
  }

  actualizar(v: VistaEscena, reloj: number, dt: number): void {
    const seg = 60 / v.bpm;
    if (v.teclas !== this.teclasVistas) {
      this.teclasVistas = v.teclas;
      this.lista = tandas(v.teclas).filter((ta) => ta.cortes.length > 0);
    }

    // --- Verduras: una por cada tanda que esté cerca en el tiempo ---
    for (const ver of this.verduras) ver.g.visible = false;
    this.bajoCuchillo = TABLA;
    this.lista.forEach((ta, j) => {
      const primera = v.notas[ta.cortes[0]].pulso;
      if (v.pulso < primera - APARECE || v.pulso > v.notas[ta.olla].pulso + SE_QUEDA) return;
      this.colocarTanda(this.verduras[j % A_LA_VEZ], ta, v, seg);
    });

    // --- Lo que falta para el próximo corte y para la próxima olla sin juzgar ---
    let faltaCorte = Infinity;
    let faltaOlla = Infinity;
    v.notas.forEach((n, i) => {
      const falta = n.pulso - v.pulso;
      if (n.juicio !== null || falta < -0.3) return;
      if (v.teclas[i] === 'accion') faltaCorte = Math.min(faltaCorte, falta);
      else faltaOlla = Math.min(faltaOlla, falta);
    });

    this.colocarOlla(v, seg, reloj);
    const cuchillo = this.colocarCuchillo(v, faltaCorte, faltaOlla);

    // --- Chispas: en el corte o, con la K, cuando los trozos caen al caldo ---
    const acertada = notaAcertada(v);
    const fuerza = acertada !== null && v.notas[acertada].juicio === 'perfect' ? 1.4 : 1;
    const esCorte = acertada !== null && v.teclas[acertada] === 'accion';
    this.chispasCorte.actualizar(this.sobreElCorte, esCorte ? v.desdePulsacion : -1, fuerza);
    const llegada = acertada === null ? -1 : (v.pulso - v.notas[acertada].pulso - VUELO) * seg;
    this.chispasOlla.actualizar(this.bocaOlla, esCorte ? -1 : llegada, fuerza);

    this.moverCocinero(v, reloj, dt, seg, faltaCorte, faltaOlla, cuchillo);
    this.ambiente(v, reloj, cuchillo.prepara);
  }

  /** Coloca la verdura de una tanda: sus trozos, sus anillos y, tras la K, adónde vuelan. */
  private colocarTanda(ver: Verdura, ta: Tanda, v: VistaEscena, seg: number): void {
    const tipo = this.tipos.get(ta.verdura.nombre)!;
    const r = tipo.h.radio;
    const n = ta.cortes.length;
    ver.g.visible = true;
    ver.vestir(ta.verdura.nombre, tipo);

    // Como en el plano: avanza hasta que su último corte llega al cuchillo y ahí se para
    const ahora = Math.min(v.pulso, v.notas[ta.cortes[n - 1]].pulso);
    const lineas = this.lineas;
    for (let c = 0; c < n; c++) {
      lineas[c] = X_CUCHILLO - (v.notas[ta.cortes[c]].pulso - ahora) * AVANCE;
    }

    // Al aparecer cae sobre la tabla desde arriba y se aplasta un poco al tocarla
    const antes = v.notas[ta.cortes[0]].pulso - v.pulso;
    const cae = tramo(antes, APARECE, APARECE - 0.3);
    const altura = 0.9 * (1 - cae * cae);
    const aplasta = golpe((APARECE - 0.3 - antes) * seg, 0.2);

    // Cada línea bien cortada suelta un trozo (con los segmentos que haya hasta la anterior)
    let derecha = lineas[0] + LARGO_PUNTA;
    let tope = X_MONTON;
    let inicio = 0;
    for (let c = 0; c < n; c++) {
      const nota = v.notas[ta.cortes[c]];
      if (!acierto(nota.juicio)) continue;
      const hace = Math.max(0, (v.pulso - nota.pulso) * seg);
      // Se aparta un poco del resto y, si llega al montón, se queda pegado al anterior
      const desde = Math.min(
        lineas[c] + HUECO * rebote(tramo(hace, 0, 0.12)),
        tope - (derecha - lineas[c]),
      );
      for (let s = inicio; s <= c; s++) {
        this.desplazamiento[s] = desde - lineas[c];
        this.saltos[s] = arco(tramo(hace, 0, 0.26)) * 0.14;
        this.sueltos[s] = true;
      }
      tope = desde - 0.03;
      derecha = lineas[c];
      inicio = c + 1;
    }
    for (let s = inicio; s <= n; s++) {
      this.desplazamiento[s] = this.saltos[s] = 0;
      this.sueltos[s] = false;
    }
    const finResto = lineas[n - 1] - LARGO_CABEZA;
    const centroResto = (finResto + derecha) / 2;

    // Tras la K los trozos sueltos vuelan a la olla (o se caen) y el resto va al cuenco.
    // Un fallo sin pulsar no se sabe hasta que pasa la ventana de 90 ms
    const olla = v.notas[ta.olla];
    const echada = olla.juicio !== null && v.pulso >= olla.pulso;
    const aLaOlla = acierto(olla.juicio);
    const hace = Math.max(0, (v.pulso - olla.pulso) * seg - (aLaOlla ? 0 : 0.09));
    const vuelo = echada ? hace / (VUELO * seg) : 0;
    const desvanece = 1 - suave(tramo(v.pulso - olla.pulso, SE_QUEDA - 0.3, SE_QUEDA));
    if (!echada && finResto < X_CUCHILLO && derecha > X_CUCHILLO + 0.02) {
      this.bajoCuchillo = Math.max(this.bajoCuchillo, TABLA + 2 * r + altura);
    }

    ver.trozos.forEach((t, s) => {
      t.g.visible = s <= n;
      if (s > n) return;
      const x1 = s === 0 ? lineas[0] + LARGO_PUNTA : lineas[s - 1];
      const x0 = s === n ? finResto : lineas[s];
      const cortadoD = s > 0 && acierto(v.notas[ta.cortes[s - 1]].juicio);
      const cortadoI = s < n && acierto(v.notas[ta.cortes[s]].juicio);
      t.formar(tipo, x1 - x0, cortadoI, cortadoD, s === 0);
      const x = (x0 + x1) / 2 + this.desplazamiento[s];
      this.punto.set(x, TABLA + r + altura + this.saltos[s], FILA);
      t.g.rotation.set(0, 0, 0);
      t.g.scale.set(1 + 0.2 * aplasta, 1 - 0.25 * aplasta, 1 + 0.2 * aplasta);
      if (!echada) t.g.position.copy(this.punto);
      else if (!this.sueltos[s]) this.alCuenco(t.g, this.punto, centroResto, r, vuelo);
      else if (aLaOlla) this.aLaOlla(t.g, this.punto, s, vuelo);
      else this.caerse(t.g, this.punto, s, r, vuelo, desvanece);
    });

    // Hojas, sombrero o rabito: van con el resto que no se ha soltado
    this.punto.set(finResto, TABLA + r + altura, FILA);
    ver.cabeza.visible = true;
    ver.cabeza.scale.set(1, 1 - 0.25 * aplasta, 1);
    if (echada) this.alCuenco(ver.cabeza, this.punto, centroResto, r, vuelo);
    else ver.cabeza.position.copy(this.punto);

    // Anillos de puntos de los cortes pendientes y marcas rojas de los fallados
    for (let c = 0; c < MAX_CORTES; c++) {
      const juicio = c < n ? v.notas[ta.cortes[c]].juicio : 'perfect';
      ver.anillos[c].visible = c < n && juicio === null;
      ver.marcas[c].visible = c < n && juicio === 'miss' && !echada;
      if (c >= n) continue;
      const x = lineas[c] + this.desplazamiento[c];
      ver.anillos[c].position.set(x, TABLA + r + altura, FILA);
      ver.marcas[c].position.set(x, TABLA + r + this.saltos[c], FILA);
    }
  }

  /** Trozo bien echado: salta en arco hasta el caldo, dando vueltas, y se hunde. */
  private aLaOlla(g: THREE.Object3D, desde: THREE.Vector3, i: number, k: number): void {
    g.visible = k < 1;
    const x = OLLA[0] + ((i % 3) - 1) * 0.28;
    const z = OLLA[2] + ((i % 2) - 0.5) * 0.3;
    const y = mezclar(desde.y, OLLA[1] + CALDO, k) + arco(limitar(k)) * 1.3;
    g.position.set(mezclar(desde.x, x, k), y, mezclar(desde.z, z, k));
    g.rotation.z = -k * 5;
  }

  /** Trozo que no llega a la olla: rueda hacia delante, cae a la barra y se desvanece. */
  private caerse(
    g: THREE.Object3D,
    desde: THREE.Vector3,
    i: number,
    r: number,
    k: number,
    desvanece: number,
  ): void {
    const c = limitar(k);
    const y = mezclar(desde.y, BARRA + r, c * c) + arco(c) * 0.3;
    const z = mezclar(desde.z, FILA + 1.15 + (i % 3) * 0.12, c);
    g.position.set(desde.x + 0.15 * c + (i % 2) * 0.1 * c, y, z);
    g.rotation.x = c * 3;
    g.scale.multiplyScalar(Math.max(0.001, desvanece));
  }

  /** Lo que queda sin soltar (las hojas y lo mal cortado) salta al cuenco de los restos. */
  private alCuenco(g: THREE.Object3D, desde: THREE.Vector3, centro: number, r: number, k: number) {
    const c = limitar(k);
    g.visible = c < 1;
    const encoge = mezclar(1, 0.4, c);
    // Todo el resto se mueve junto: cada pieza guarda su distancia al centro, encogida
    g.position.set(
      mezclar(centro, CUENCO_RESTOS[0], c) + (desde.x - centro) * encoge,
      mezclar(desde.y, CUENCO_RESTOS[1] + r * 0.4, c) + arco(c) * 1.1,
      mezclar(desde.z, CUENCO_RESTOS[2], c),
    );
    g.scale.multiplyScalar(encoge);
  }

  /**
   * La olla: la tapa se levanta un pulso antes de la K (del todo medio pulso antes, como en
   * el plano) y se cierra de golpe si la K falla, o con calma cuando los trozos ya están dentro.
   */
  private colocarOlla(v: VistaEscena, seg: number, reloj: number): void {
    // La tanda de la olla: la primera cuya K aún no ha pasado (o acaba de pasar)
    let actual = this.lista[this.lista.length - 1];
    for (const ta of this.lista) {
      if (v.pulso < v.notas[ta.olla].pulso + 0.6) {
        actual = ta;
        break;
      }
    }
    let abre = 0;
    let tiembla = 0;
    let chapoteo = 0;
    if (actual) {
      const k = v.notas[actual.olla];
      const falta = k.pulso - v.pulso;
      const hace = -falta * seg;
      if (k.juicio === null) {
        abre = falta <= AVISO_OLLA ? frenar(limitar((AVISO_OLLA - falta) / 0.5)) : 0;
        // Al empezar a subir, la tapa tintinea (a la vez que suena el aviso)
        tiembla = golpe((AVISO_OLLA - falta) * seg, 0.3) * Math.sin(reloj * 55) * 0.06;
      } else if (acierto(k.juicio)) {
        const cierre = hace - VUELO * seg;
        abre = 1 - suave(tramo(cierre, 0.05, 0.22));
        tiembla = golpe(cierre - 0.22, 0.3) * Math.sin(reloj * 45) * 0.05;
        chapoteo = golpe(cierre, 0.3);
      } else {
        abre = 1 - frenar(tramo(hace, 0.09, 0.2));
        tiembla = golpe(hace - 0.2, 0.4) * Math.sin(reloj * 40) * 0.07;
      }
    }
    this.tapa.rotation.z = abre * 0.8 + tiembla;
    this.caldo.position.y = CALDO + chapoteo * 0.05;
    this.caldo.scale.y = 1 + chapoteo * 2;

    // Vapor: bolas que suben sin parar; con la tapa abierta salen más grandes y deprisa
    this.vapor.forEach((bola, i) => {
      const fase = (reloj * (0.45 + abre * 0.4) + i / this.vapor.length) % 1;
      const r = (0.16 + (i % 3) * 0.05) * (1 + abre * 1.1) * Math.sin(PI * fase);
      bola.position.set(-0.15 + Math.sin(fase * 3 + i) * 0.22, 1.35 + fase * (1.8 + abre), 0);
      bola.scale.setScalar(Math.max(0.001, r));
    });

    // Tropezones: dos trocitos por cada tanda que ya ha caído al caldo, de las seis últimas
    let cuantas = 0;
    for (let j = this.lista.length - 1; j >= 0 && cuantas * 2 < this.tropezones.length; j--) {
      const ta = this.lista[j];
      const k = v.notas[ta.olla];
      if (!acierto(k.juicio) || v.pulso < k.pulso + VUELO) continue;
      const m = this.tipos.get(ta.verdura.nombre)!.mPiel;
      this.tropezones[cuantas * 2].material = this.tropezones[cuantas * 2 + 1].material = m;
      cuantas++;
    }
    this.tropezones.forEach((t, i) => {
      t.visible = i < cuantas * 2;
      t.position.y = CALDO + 0.03 + Math.sin(reloj * 2 + i) * 0.008;
    });
  }

  /**
   * Coloca el cuchillo: sube mientras llega un anillo, cae de golpe al pulsar J y barre
   * hacia la olla al pulsar K. Después del último corte espera apoyado en la tabla.
   */
  private colocarCuchillo(v: VistaEscena, faltaCorte: number, faltaOlla: number): EstadoCuchillo {
    const d = v.desdePulsacion;
    const prepara = suave(tramo(faltaCorte, 0.6, 0.2));
    const espera = faltaOlla < faltaCorte ? suave(tramo(faltaOlla, 0.55, 0.35)) : 0;
    // Nunca se apoya encima de una verdura que tenga debajo (por ejemplo, tras un corte fallado)
    const encima = this.bajoCuchillo + MEDIO_FILO;
    const base = Math.max(encima, mezclar(mezclar(REPOSO, ARRIBA, prepara), ABAJO, espera));
    let y = base;
    let corte = 0;
    let barrido = 0;
    if (v.ultimaTecla === 'accion' && d < 0.24) {
      // Si no corta nada, se queda encima de la verdura y rebota
      const vale = notaAcertada(v) !== null;
      const fondo = vale ? ABAJO : Math.max(ABAJO, this.bajoCuchillo + MEDIO_FILO);
      corte = d < 0.07 ? frenar(d / 0.07) : 1 - suave(tramo(d, 0.1, 0.22));
      y = mezclar(base, fondo, corte) + (vale ? 0 : golpe(d - 0.07, 0.12) * 0.08);
    } else if (v.ultimaTecla === 'alterna' && d < 0.45) {
      const vuelta = suave(tramo(d, 0.18, 0.45));
      barrido = frenar(limitar(d / 0.09)) * (1 - vuelta);
      y = mezclar(Math.max(ABAJO, encima), base, vuelta);
    }
    this.cuchillo.position.set(X_CUCHILLO + BARRIDO * barrido, y, FILA);
    this.cuchillo.rotation.x = -0.22 * prepara * (1 - corte);
    return { prepara, corte, barrido };
  }

  private moverCocinero(
    v: VistaEscena,
    reloj: number,
    dt: number,
    seg: number,
    faltaCorte: number,
    faltaOlla: number,
    cuchillo: EstadoCuchillo,
  ): void {
    const p = this.cocinero;
    const hayVerdura = this.verduras.some((ver) => ver.g.visible);
    const juzgada = ultimaJuzgada(v, 1.2);
    const hace = juzgada ? juzgada.hace * seg : Infinity;
    const bien = juzgada !== null && juzgada.juicio !== 'miss';
    const esOlla = juzgada !== null && v.teclas[juzgada.indice] === 'alterna';
    // Reacción: saltito y mano arriba al acertar; se echa atrás y niega con la cabeza al fallar
    const salto = bien
      ? arco(tramo(hace, 0.05, 0.35)) * (juzgada.juicio === 'perfect' ? 1 : 0.6)
      : 0;
    const alegria = bien
      ? suave(tramo(hace, 0, 0.12)) * (1 - suave(tramo(hace, 0.45, 0.7))) * (esOlla ? 1 : 0.45)
      : 0;
    const susto =
      juzgada && !bien ? rebote(tramo(hace, 0.09, 0.3)) * (1 - tramo(hace, 0.55, 0.8)) : 0;
    const compas = v.notas.length ? latido(v.pulso) : 0;

    // Inclinado sobre la tabla: se yergue al preparar, acompaña el golpe y gira hacia la olla
    p.raiz.position.y = 0.3 + salto * 0.1;
    p.raiz.scale.y = ESCALA_COCINERO * (1 - 0.02 * compas);
    p.torso.rotation.x = 0.1 - 0.06 * cuchillo.prepara + 0.08 * cuchillo.corte - 0.12 * susto;
    p.torso.rotation.y = 0.08 + 0.25 * cuchillo.barrido;

    // La mano derecha va siempre al mango del cuchillo
    this.cuchillo.updateWorldMatrix(true, false);
    this.cuchillo.localToWorld(this.punto.set(...MANGO));
    p.cuerpo.updateWorldMatrix(true, false);
    p.cuerpo.worldToLocal(this.punto);
    const mano = alcanzar([this.punto.x, this.punto.y, this.punto.z], 1);
    // La izquierda descansa en la tabla, detrás de la verdura, y sube al celebrar
    const vaiven = Math.sin(reloj * 1.4) * 0.012;
    const reposo: V3 = [-0.3, 0.52 + vaiven, 0.52];
    const arriba: V3 = [-0.4, 1.45, 0.3];
    for (let i = 0; i < 3; i++) {
      p.manoD[i] = mano[i];
      p.manoI[i] = mezclar(reposo[i], arriba[i], alegria);
    }

    // Mira al corte; antes de la K, a la olla; sin nada que hacer, a quien juega
    if (faltaOlla < faltaCorte && faltaOlla < 1)
      enMundo([OLLA[0], OLLA[1] + 1.3, OLLA[2]], this.mira);
    else if (hayVerdura) enMundo([X_CUCHILLO - 0.3, TABLA + 0.3, FILA], this.mira);
    else this.mira.set(0, 3, 9);
    p.mirarA(this.mira, dt);
    p.cabeza.rotation.z = susto > 0 ? susto * 0.13 * Math.sin(hace * 24) : 0;

    if (juzgada && hace < 0.7) {
      // Solo se ríe a carcajadas con una olla perfecta; con los cortes, sonríe
      if (juzgada.juicio === 'perfect' && esOlla) p.expresion = 'risa';
      else if (bien) p.expresion = 'feliz';
      else p.expresion = hace < 0.3 ? 'sorpresa' : 'triste';
    } else if (cuchillo.prepara > 0.3 || (hayVerdura && faltaCorte < 3)) {
      p.expresion = 'concentrado';
    } else p.expresion = 'feliz';
    p.actualizar(reloj, dt);
  }

  /** Lo que se mueve siempre: faroles, cortinas, fogón y la marca, que brilla al llegar un anillo. */
  private ambiente(v: VistaEscena, t: number, prepara: number): void {
    this.faroles.forEach((f, i) => (f.rotation.z = 0.04 * Math.sin(t * 1.2 + i * 1.7)));
    this.cortinas.forEach((c, i) => (c.rotation.x = 0.03 * Math.sin(t * 1.5 + i * 0.9)));
    this.llama.emissiveIntensity = 2.2 + 0.5 * Math.sin(t * 13) + 0.3 * Math.sin(t * 29);
    const compas = v.notas.length ? latido(v.pulso) : 0;
    this.marcaCorte.emissiveIntensity = 0.9 + 0.5 * compas + 2.2 * prepara;
  }

  /** Fideos, huevo y naruto que adornan el caldo, y los sitios de los trocitos que se echan. */
  private ramen(olla: THREE.Group): void {
    const fideo = material(0xfff0b8, { rugoso: 0.5 });
    const sitios = [0.1, -0.12, 0.05, 0.14, -0.06, 0.02, -0.1];
    for (let i = 0; i < 5; i++) {
      const pos: V3 = [sitios[i], CALDO + 0.03, sitios[i + 2]];
      malla(olla, aro(0.2 + i * 0.09, 0.03), fideo, pos, [PI / 2, 0, 0]);
    }
    const huevo: V3 = [-0.3, CALDO + 0.05, 0.3];
    malla(olla, esfera(0.2, 20, 14), material(0xffffff, { rugoso: 0.4 }), huevo).scale.set(
      1,
      0.4,
      1.3,
    );
    const yema = malla(olla, esfera(0.1, 16, 12), material(0xffb72e, { rugoso: 0.4 }), huevo);
    yema.position.y += 0.06;
    yema.scale.y = 0.4;
    const naruto: V3 = [0.3, CALDO + 0.05, 0.35];
    malla(olla, cilindro(0.18, 0.18, 0.05, 20), material(0xfff3f6, { rugoso: 0.5 }), naruto);
    malla(olla, aro(0.08, 0.025), material(0xff8fa3), naruto, [PI / 2, 0, 0]).position.y += 0.03;
    // Rodajas de verdura: se pintan del color de cada tanda que se va echando
    const rodaja = cilindro(0.1, 0.1, 0.05, 16);
    const huecos = [0.35, -0.3, 0.05, -0.45, -0.4, -0.2, 0.5, 0.05, -0.1, 0.1, 0.15, 0.55];
    const mas = [-0.5, 0.15, 0.55, -0.35, -0.2, -0.5, 0.05, 0.35, -0.55, -0.05, 0.35, -0.05];
    const todos = [...huecos, ...mas];
    for (let i = 0; i < todos.length; i += 2) {
      this.tropezones.push(
        malla(olla, rodaja, fideo, [todos[i], CALDO, todos[i + 1]], [0.1, 0, 0.08]),
      );
    }
  }

  /** Cosas de la mesa que no se juegan: verduras esperando, palillos y el cuenco de restos. */
  private mesa(T: THREE.Group): void {
    const cola = grupo(T, [-4.3, BARRA, 1.6]);
    const tomate = material(0xe8505b, { rugoso: 0.3, barniz: 0.6 });
    malla(cola, esfera(0.34, 24, 18), tomate, [0, 0.37, 0], [0, 0, 0], [1, 1.1, 1]);
    malla(cola, cilindro(0.04, 0.05, 0.16, 8), material(0x3f8f3a), [0, 0.8, 0]);
    const perfilSeta = [0.001, 0.36, 0.34, 0.3, 0.38, 0.24, 0.1, 0.2, 0.1, 0, 0.001, 0];
    const seta = material(0xf2e2c8, { rugoso: 0.6 });
    malla(cola, torno(pares(perfilSeta)), seta, [0.95, 0, -0.3], [0.3, 0, -0.25], 1.5);
    malla(cola, capsula(0.07, 1.3), material(0xb6e37a), [-0.9, 0.07, 0.35], [0, 0.3, PI / 2]);
    malla(cola, capsula(0.07, 1.2), material(0xa2d86a), [-0.9, 0.07, 0.6], [0, 0.4, PI / 2]);
    const bote = grupo(T, [-2.9, BARRA, 2.4]);
    const azul = material(0x2f5f9c, { rugoso: 0.3, barniz: 0.8 });
    malla(bote, cilindro(0.22, 0.2, 0.5, 24), azul, [0, 0.25, 0]);
    const palillo = cilindro(0.02, 0.02, 0.9, 6);
    const madera = material(0xf2cf9a);
    const giros = [-0.12, 0.08, -0.04, 0.13, 0.02];
    giros.forEach((a, i) => {
      malla(bote, palillo, madera, [a * 0.6, 0.6, giros[(i + 2) % 5] * 0.6], [a, 0, -a]);
    });
    cuenco(T, [CUENCO_RESTOS[0], BARRA, CUENCO_RESTOS[2]], 1.3, 0xd9443f);
  }

  private decorado(S: THREE.Scene): void {
    // Pared de madera del puesto, estantes con cuencos y pizarra del menú
    const vetas = texturaMadera(0x7a4a36, 1, [14, 1]);
    vetas.rotation = PI / 2;
    const pared = material(0x7a4a36, { rugoso: 0.85, textura: vetas });
    malla(S, caja(26, 9, 0.3, 0.02), pared, [0, 4.5, -4.2]);
    const colores = [0x2f5f9c, 0xfff3dc, 0xff6b6b, 0x2f5f9c, 0x4fae8a, 0xfff3dc, 0xffc93c];
    const estante = material(0xc98d5a, {
      rugoso: 0.6,
      textura: texturaMadera(0xc98d5a, 1, [3, 1]),
    });
    for (const y of [2.4, 3.5]) {
      malla(S, caja(7.5, 0.12, 0.7, 0.04), estante, [-3.4, y, -3.8]);
      const arriba = y > 3 ? 1 : 0;
      for (let i = 0; i < 7; i++) {
        const c = colores[(i + arriba * 3) % 7];
        cuenco(S, [-6.7 + i * 1.05, y + 0.06, -3.8], 1, c);
        // Algunos están apilados de dos en dos
        if ((i + arriba) % 3 === 0) cuenco(S, [-6.7 + i * 1.05, y + 0.2, -3.8], 1, c);
      }
    }
    const menu = texturaPintada(512, 384, (g, w, h) => {
      g.fillStyle = '#2a3a34';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff3dc';
      g.font = '700 64px Fredoka, sans-serif';
      g.textAlign = 'center';
      g.fillText('RAMEN', w / 2, 80);
      g.font = '600 36px Fredoka, sans-serif';
      g.textAlign = 'left';
      ['Clásico:♪♪', 'Picante:♪♪♪', 'Verduras:♪'].forEach((linea, i) => {
        const [plato, notas] = linea.split(':');
        g.fillStyle = '#ffd27a';
        g.fillText(plato, 50, 160 + i * 70);
        g.fillStyle = '#ff8fa3';
        g.fillText(notas, 340, 160 + i * 70);
      });
    });
    malla(S, caja(3.0, 2.3, 0.12, 0.06), material(0xc98d5a, { rugoso: 0.6 }), [5.3, 2.75, -4.0]);
    const pizarra = material(0xffffff, { rugoso: 0.9, textura: menu });
    malla(S, new THREE.PlaneGeometry(2.7, 2.0), pizarra, [5.3, 2.75, -3.93]);

    // Cortinas noren colgadas de una barra, con el dibujo de un cuenco humeante
    for (let i = 0; i < 6; i++) {
      const [fondo, trazo] = i % 2 ? ['#d9443f', '#fff3dc'] : ['#fff3dc', '#d9443f'];
      const dibujo = texturaPintada(256, 256, (g, w, h) => {
        g.fillStyle = fondo;
        g.fillRect(0, 0, w, h);
        g.strokeStyle = trazo;
        g.lineWidth = 16;
        g.beginPath();
        g.arc(w / 2, h / 2 + 10, 62, 0, 7);
        g.stroke();
        g.beginPath();
        g.moveTo(w / 2 - 40, h / 2 + 10);
        g.bezierCurveTo(w / 2 - 15, h / 2 - 20, w / 2 + 15, h / 2 + 40, w / 2 + 40, h / 2 + 10);
        g.stroke();
      });
      // Tela ondulada que cuelga de su borde de arriba, para poder mecerse
      const ondas = deformar(
        new THREE.PlaneGeometry(2.4, 1.7, 16, 4).translate(0, -0.85, 0),
        (p) => {
          p.z = Math.sin(p.x * 4 + i) * 0.06 * -p.y;
        },
      );
      const m = material(0xffffff, { rugoso: 0.9, textura: dibujo, dobleCara: true });
      this.cortinas.push(malla(S, ondas, m, [-6.25 + i * 2.5, 4.95, -1.6]));
    }
    const barra = malla(S, cilindro(0.07, 0.07, 18, 12), material(0x5a3a2a), [0, 4.95, -1.6]);
    barra.rotation.z = PI / 2;

    // Faroles de papel con su luz cálida
    this.faroles.push(farol(S, [-5.9, 2.6, -2.2], 0xff5a4a, 0.95));
    this.faroles.push(farol(S, [3.4, 3.3, -2.6], 0xffb03a, 0.7));
    const luzRoja = new THREE.PointLight(0xff7a4a, 16, 12);
    luzRoja.position.set(-5.2, 3.9, -1.6);
    const luzAmbar = new THREE.PointLight(0xffb85a, 12, 12);
    luzAmbar.position.set(5.6, 4, -1.4);
    S.add(luzRoja, luzAmbar);

    // Barra de trabajo
    const tablero = material(0xd9a06a, {
      rugoso: 0.45,
      barniz: 0.35,
      barnizRugoso: 0.4,
      textura: texturaMadera(0xd9a06a, 5, [2, 1]),
    });
    malla(S, caja(18, 0.25, 5.4, 0.08), tablero, [0, 0.875, 1.6]);
  }
}

/** Pasa un punto de la mesa (reducida) a coordenadas de la escena. */
function enMundo(p: V3, destino = new THREE.Vector3()): THREE.Vector3 {
  const [x, y, z] = POS_MESA;
  return destino.set(x + p[0] * ESCALA_MESA, y + p[1] * ESCALA_MESA, z + p[2] * ESCALA_MESA);
}

const acierto = (juicio: string | null) => juicio === 'perfect' || juicio === 'great';

/** Lista plana [radio, altura, radio, altura…] a pares, para los perfiles de `torno`. */
function pares(lista: number[]): [number, number][] {
  const res: [number, number][] = [];
  for (let i = 0; i < lista.length; i += 2) res.push([lista[i], lista[i + 1]]);
  return res;
}

const css = (c: number) => '#' + new THREE.Color(c).getHexString();

/** Corte de una verdura: piel fina, carne y un centro más claro (la tapa del cilindro). */
function texturaCorte(h: Hortaliza): THREE.CanvasTexture {
  return texturaPintada(128, 128, (g) => {
    g.fillStyle = css(h.piel);
    g.fillRect(0, 0, 128, 128);
    for (const [radio, color] of [
      [58, h.carne],
      [24, h.centro],
    ]) {
      g.fillStyle = css(color);
      g.beginPath();
      g.arc(64, 64, radio, 0, PI * 2);
      g.fill();
    }
  });
}

/**
 * Piel con dibujo, que se repite alrededor y a lo largo: anillos finos en la zanahoria y
 * granos en la mazorca. Las demás verduras son lisas (devuelve undefined).
 */
function texturaPiel(nombre: string): THREE.CanvasTexture | undefined {
  if (nombre !== 'zanahoria' && nombre !== 'maíz') return undefined;
  const maiz = nombre === 'maíz';
  const t = texturaPintada(64, 64, (g) => {
    g.fillStyle = maiz ? '#d9a420' : '#ff8a22';
    g.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 4; i++) {
      const x = (i % 2) * 32;
      const y = Math.floor(i / 2) * 32;
      g.fillStyle = maiz ? '#ffd84a' : '#e8741a';
      g.beginPath();
      if (maiz) g.ellipse(x + 16, y + 16, 13, 14, 0, 0, PI * 2);
      else g.ellipse(x + 10 + i * 5, y + 16, 10, 1.5, 0, 0, PI * 2);
      g.fill();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(maiz ? 7 : 3, maiz ? 4 : 3);
  return t;
}

/** Hojas, tallos o vainas: tubos que salen del final del cuerpo y se curvan hacia arriba. */
function hojas(g: THREE.Group, color: number, grosor: number, puntas: V3[], plano = 1): void {
  const m = material(color, { rugoso: 0.7 });
  for (const punta of puntas) {
    const tubo = new TuboFlexible((t) => grosor * (1 - 0.5 * t), 8, 8, plano);
    tubo.colocar([0.02, 0, 0], [punta[0] * 0.3, punta[1] * 0.7, punta[2] * 0.4], punta);
    malla(g, tubo.geometria, m);
  }
}

/**
 * El extremo que no se corta de cada verdura, como en el plano: hojas de zanahoria, tallos
 * de cebolleta, sombrero de seta, rabito de pimiento, hojas de mazorca y tallos de nabo.
 * El origen es el final del cuerpo; todo crece hacia atrás (−x) y hacia arriba, para no
 * chocar con la verdura que viene detrás.
 */
function adorno(nombre: string, mPiel: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const r = HORTALIZAS[nombre].radio;
  // Remate redondo del extremo, del color de la piel (la seta lleva el sombrero en su lugar)
  const remate = casquete(1, 0.5, 24, 10).rotateZ(PI / 2);
  if (nombre !== 'seta') malla(g, remate, mPiel, [0, 0, 0], [0, 0, 0], [r * 0.6, r, r]);
  if (nombre === 'zanahoria') {
    const puntas: V3[] = [
      [-0.32, 0.5, -0.3],
      [-0.4, 0.6, -0.12],
      [-0.42, 0.62, 0.06],
      [-0.36, 0.52, 0.2],
      [-0.2, 0.55, -0.4],
    ];
    hojas(g, 0x4faf55, 0.05, puntas);
  } else if (nombre === 'cebolleta') {
    hojas(g, 0x3f8f3a, 0.06, [
      [-0.55, 0.45, -0.25],
      [-0.65, 0.35, 0],
      [-0.5, 0.55, 0.12],
    ]);
  } else if (nombre === 'seta') {
    const sombrero = material(0xa8653a, { rugoso: 0.6, barniz: 0.3 });
    malla(g, esfera(1, 24, 16), sombrero, [-0.05, 0, 0], [0, 0, 0], [0.17, 0.34, 0.34]);
    malla(g, cilindro(0.3, 0.3, 0.02, 24), material(0xf6dcb8), [0.04, 0, 0], [0, 0, PI / 2]);
  } else if (nombre === 'pimiento') {
    const verde = material(0x3f8f3a, { rugoso: 0.5, barniz: 0.4 });
    malla(g, esfera(1, 18, 12), verde, [-r * 0.5, 0, 0], [0, 0, 0], [0.05, 0.16, 0.16]);
    const rabito = cilindro(0.035, 0.045, 0.2, 10);
    malla(g, rabito, verde, [-r * 0.5 - 0.08, 0.04, 0], [0, 0, PI / 2 - 0.4]);
  } else if (nombre === 'maíz') {
    const vainas: V3[] = [
      [-0.3, 0.45, -0.28],
      [-0.38, 0.5, 0.05],
      [-0.25, 0.38, 0.28],
    ];
    hojas(g, 0x9ad46a, 0.12, vainas, 0.3);
  } else {
    // Nabo: hombro morado y tallos morados, como en el plano
    const morado = material(0xb57ad0, { rugoso: 0.45 });
    malla(g, esfera(1, 20, 14), morado, [-0.02, 0, 0], [0, 0, 0], [r * 0.62, r * 0.98, r * 0.98]);
    hojas(g, 0x9b59b6, 0.035, [
      [-0.3, 0.5, -0.2],
      [-0.36, 0.56, 0.05],
      [-0.25, 0.48, 0.22],
    ]);
  }
  return g;
}

/** Cuenco de cerámica con brillo (comparten todos la misma geometría). */
const CUENCO = torno(
  pares([
    0.001, 0.03, 0.16, 0.03, 0.17, 0, 0.2, 0, 0.36, 0.26, 0.38, 0.28, 0.34, 0.26, 0.18, 0.07, 0.001,
    0.07,
  ]),
  16,
);
function cuenco(padre: THREE.Object3D, pos: V3, escala: number, color: number): THREE.Mesh {
  return malla(
    padre,
    CUENCO,
    material(color, { rugoso: 0.25, barniz: 0.8 }),
    pos,
    [0, 0, 0],
    escala,
  );
}

/** Farol de papel con aros y tapas oscuras. Cuelga de su cordón para poder mecerse. */
function farol(padre: THREE.Object3D, pos: V3, color: number, escala: number): THREE.Group {
  const cuelga = grupo(padre, [pos[0], pos[1] + 1.35 * escala, pos[2]], [0, 0, 0], escala);
  const g = grupo(cuelga, [0, -1.35, 0]);
  const papel = material(color, { rugoso: 0.6, luz: color, fuerzaLuz: 1.1 });
  sinSombra(malla(g, esfera(0.5, 28, 20), papel, [0, 0, 0], [0, 0, 0], [1, 1.15, 1]));
  const oscuro = material(0x2a1e2e, { rugoso: 0.5 });
  for (const y of [-0.55, 0.55]) malla(g, cilindro(0.26, 0.26, 0.1, 20), oscuro, [0, y, 0]);
  const aros = material(tono(color, -0.35));
  for (let i = -2; i <= 2; i++) {
    malla(g, aro(0.5 * Math.cos(i * 0.5) + 0.01, 0.012), aros, [0, i * 0.26, 0], [PI / 2, 0, 0]);
  }
  malla(g, cilindro(0.01, 0.01, 1.4, 6), oscuro, [0, 1.3, 0]);
  return cuelga;
}

export const ramen3d: Definicion3d = {
  motor: {
    cielo: [
      [0, 0x2b2350],
      [1, 0x513a6e],
    ],
    niebla: [0x47305f, 14, 36],
    camara: [0, 3.3, 9.0],
    mira: [0, 2.05, 0],
    angulo: 30,
    sol: { pos: [-3.5, 7, 6], color: 0xffc48a, fuerza: 2.7 },
    contraluz: { pos: [6, 5, -6], color: 0x8fb8ff, fuerza: 1.3 },
    ambiente: { cielo: 0xc9b8ff, suelo: 0xff9a6a, fuerza: 0.55 },
    exposicion: 0.94,
    reflejos: 0.2,
    resplandor: 0.3,
    foco: 9.2,
    zonaSombra: 9,
  },
  crear: (motor) => new Ramen(motor),
};
