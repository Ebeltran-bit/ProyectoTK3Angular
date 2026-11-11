/**
 * Motor 3D del juego: prepara three.js (librería MIT, aprobada por Eva el 11/11/2026)
 * para dibujar una escena en el lienzo del reproductor.
 *
 * La receta de luz es la misma en las nueve escenas, y eso es lo que les da el aire de
 * película de animación: una luz principal cálida con sombras suaves, un contraluz frío
 * que recorta las siluetas, luz de ambiente, un poco de resplandor en lo que brilla y el
 * fondo ligeramente desenfocado. Cada escena solo cambia colores, posiciones e intensidades.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import { V3 } from './formas';
import { texturaCielo } from './materiales';

export interface OpcionesMotor {
  /** Degradado del cielo: lista de [posición de 0 (arriba) a 1 (abajo), color]. */
  cielo: [number, number][];
  /** Niebla que funde lo lejano con el horizonte: [color, dónde empieza, dónde lo tapa todo]. */
  niebla: [number, number, number];
  camara: V3;
  /** Punto al que mira la cámara. */
  mira: V3;
  /** Ángulo de visión en grados (cuanto menor, más «teleobjetivo»). */
  angulo?: number;
  /** Luz principal: de dónde viene, color y fuerza. */
  sol: { pos: V3; color: number; fuerza: number };
  /** Contraluz: llega desde detrás y dibuja un borde claro en las siluetas. */
  contraluz: { pos: V3; color: number; fuerza: number };
  /** Luz de ambiente: color que llega del cielo, color que rebota del suelo y fuerza. */
  ambiente: { cielo: number; suelo: number; fuerza: number };
  exposicion?: number;
  /** Fuerza de los reflejos del entorno sobre todos los materiales. */
  reflejos?: number;
  /** Cuánto resplandecen las zonas muy claras. */
  resplandor?: number;
  /** Distancia a la que la cámara enfoca; más cerca o más lejos se ve borroso. */
  foco: number;
  /** Mitad del lado del cuadrado de suelo que recibe sombras. */
  zonaSombra?: number;
}

/**
 * Niveles de calidad. Si el ordenador no llega a unos 40 fotogramas por segundo, el
 * motor baja un nivel él solo: antes fluido que bonito, porque es un juego de ritmo.
 */
export type Calidad = 'alta' | 'media' | 'baja';
const ORDEN: Calidad[] = ['alta', 'media', 'baja'];
const AJUSTES: Record<
  Calidad,
  { pixeles: number; sombra: number; desenfoque: boolean; resplandor: boolean }
> = {
  alta: { pixeles: 1.5, sombra: 2048, desenfoque: true, resplandor: true },
  media: { pixeles: 1, sombra: 1024, desenfoque: false, resplandor: true },
  baja: { pixeles: 0.75, sombra: 512, desenfoque: false, resplandor: false },
};
const UMBRAL_RESPLANDOR = 1.8;
/** Fotogramas seguidos demasiado lentos (más de 25 ms) antes de bajar la calidad. */
const LENTOS_PARA_BAJAR = 45;

/**
 * Calidad a la que llegó la última escena: la siguiente empieza ya ahí, para que el ajuste
 * (que da un pequeño tirón) solo ocurra una vez y no en mitad de cada canción.
 */
let calidadRecordada: Calidad = 'alta';

export class Motor {
  readonly escena = new THREE.Scene();
  readonly camara: THREE.PerspectiveCamera;
  private readonly render: THREE.WebGLRenderer;
  private readonly sol: THREE.DirectionalLight;
  private compositor: EffectComposer | null = null;
  private calidadActual: Calidad;
  private lentos = 0;
  private ancho = 960;
  private alto = 540;

  /**
   * @param calidadFija si se indica, el motor no cambia de calidad por su cuenta
   * @throws si el navegador no puede crear el contexto WebGL
   */
  constructor(
    lienzo: HTMLCanvasElement,
    private readonly o: OpcionesMotor,
    private readonly calidadFija: Calidad | null = null,
  ) {
    this.calidadActual = calidadFija ?? calidadRecordada;
    this.render = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true });
    this.render.shadowMap.enabled = true;
    this.render.shadowMap.type = THREE.PCFShadowMap;
    this.render.toneMapping = THREE.ACESFilmicToneMapping;
    this.render.toneMappingExposure = o.exposicion ?? 1.05;

    // Reflejos suaves de una habitación imaginaria: hacen que el plástico y el metal brillen
    const reflejos = new THREE.PMREMGenerator(this.render);
    this.escena.environment = reflejos.fromScene(new RoomEnvironment(), 0.04).texture;
    this.escena.environmentIntensity = o.reflejos ?? 0.45;
    reflejos.dispose();
    this.escena.background = texturaCielo(o.cielo);
    this.escena.fog = new THREE.Fog(...o.niebla);

    this.camara = new THREE.PerspectiveCamera(o.angulo ?? 30, 16 / 9, 0.1, 400);
    this.camara.position.set(...o.camara);
    this.camara.lookAt(...o.mira);

    this.escena.add(
      new THREE.HemisphereLight(o.ambiente.cielo, o.ambiente.suelo, o.ambiente.fuerza),
    );

    this.sol = new THREE.DirectionalLight(o.sol.color, o.sol.fuerza);
    this.sol.position.set(...o.sol.pos);
    this.sol.target.position.set(0, 0.5, 0);
    this.sol.castShadow = true;
    const zona = o.zonaSombra ?? 8;
    const camaraSombra = this.sol.shadow.camera;
    camaraSombra.left = camaraSombra.bottom = -zona;
    camaraSombra.right = camaraSombra.top = zona;
    camaraSombra.near = 0.5;
    camaraSombra.far = 50;
    // Estos dos márgenes evitan rayas de sombra sobre las propias superficies iluminadas
    this.sol.shadow.bias = -0.0004;
    this.sol.shadow.normalBias = 0.03;
    this.sol.shadow.radius = 5;
    this.escena.add(this.sol, this.sol.target);

    const contraluz = new THREE.DirectionalLight(o.contraluz.color, o.contraluz.fuerza);
    contraluz.position.set(...o.contraluz.pos);
    this.escena.add(contraluz);

    this.aplicarCalidad();
  }

  get calidad(): Calidad {
    return this.calidadActual;
  }

  /** Ajusta el dibujo al tamaño que el lienzo ocupa en la página (en píxeles CSS). */
  ajustar(ancho: number, alto: number): void {
    if (ancho < 1 || alto < 1 || (ancho === this.ancho && alto === this.alto)) return;
    this.ancho = ancho;
    this.alto = alto;
    this.aplicarCalidad();
  }

  /**
   * Dibuja un fotograma. `dt` son los segundos desde el anterior: sirve para notar si el
   * ordenador va justo y bajar la calidad.
   */
  pintar(dt: number): void {
    if (this.compositor) this.compositor.render();
    else this.render.render(this.escena, this.camara);
    if (this.calidadFija || this.calidadActual === 'baja') return;
    // Un parón suelto (cambiar de ventana, cargar algo) no cuenta: tienen que ser seguidos
    this.lentos = dt > 0.025 && dt < 0.5 ? this.lentos + 1 : Math.max(0, this.lentos - 2);
    if (this.lentos >= LENTOS_PARA_BAJAR) {
      this.calidadActual = ORDEN[ORDEN.indexOf(this.calidadActual) + 1];
      calidadRecordada = this.calidadActual;
      this.lentos = 0;
      this.aplicarCalidad();
    }
  }

  /** Dónde cae en la pantalla un punto de la escena, en % del ancho y del alto del lienzo. */
  proyectar(punto: V3): { x: number; y: number } {
    // La cámara solo recalcula su posición al dibujar: aquí se le pide antes, por si aún no ha dibujado
    this.camara.updateMatrixWorld();
    const p = new THREE.Vector3(...punto).project(this.camara);
    return { x: (p.x + 1) * 50, y: (1 - p.y) * 50 };
  }

  /** Libera la memoria de la tarjeta gráfica. Hay que llamarlo al salir de la partida. */
  liberar(): void {
    this.escena.traverse((objeto) => {
      if (!(objeto instanceof THREE.Mesh)) return;
      objeto.geometry.dispose();
      const materiales: THREE.Material[] = Array.isArray(objeto.material)
        ? objeto.material
        : [objeto.material];
      for (const m of materiales) {
        (m as THREE.MeshStandardMaterial).map?.dispose();
        m.dispose();
      }
    });
    (this.escena.background as THREE.Texture | null)?.dispose();
    this.escena.environment?.dispose();
    this.sol.shadow.map?.dispose();
    this.compositor?.dispose();
    this.render.dispose();
    // Los navegadores solo permiten unos pocos contextos 3D a la vez: este se devuelve ya
    this.render.forceContextLoss();
  }

  /** Monta el tamaño, las sombras y los efectos de imagen del nivel de calidad actual. */
  private aplicarCalidad(): void {
    const a = AJUSTES[this.calidadActual];
    const pixeles = Math.min(window.devicePixelRatio || 1, a.pixeles);
    this.render.setPixelRatio(pixeles);
    this.render.setSize(this.ancho, this.alto, false);
    this.camara.aspect = this.ancho / this.alto;
    this.camara.updateProjectionMatrix();

    if (this.sol.shadow.mapSize.x !== a.sombra) {
      this.sol.shadow.mapSize.set(a.sombra, a.sombra);
      this.sol.shadow.map?.dispose();
      this.sol.shadow.map = null;
    }

    this.compositor?.dispose();
    this.compositor = null;
    if (!a.resplandor) return;
    // Los efectos se aplican en cadena sobre la imagen ya dibujada
    const c = new EffectComposer(this.render);
    c.setPixelRatio(pixeles);
    c.setSize(this.ancho, this.alto);
    c.addPass(new RenderPass(this.escena, this.camara));
    if (a.desenfoque) {
      c.addPass(
        new BokehPass(this.escena, this.camara, {
          focus: this.o.foco,
          aperture: 0.00035,
          maxblur: 0.0045,
        }),
      );
    }
    c.addPass(
      // Con este umbral solo resplandece lo que tiene luz propia (sol, faroles, chispas) y
      // los brillos más fuertes; una superficie blanca al sol se queda por debajo
      new UnrealBloomPass(
        new THREE.Vector2(this.ancho, this.alto),
        this.o.resplandor ?? 0.25,
        0.6,
        UMBRAL_RESPLANDOR,
      ),
    );
    c.addPass(new OutputPass());
    this.compositor = c;
  }
}
