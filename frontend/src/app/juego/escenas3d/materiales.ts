/**
 * Materiales y texturas del estilo 3D. Todo está hecho por código: no hay imágenes ni
 * modelos de terceros. Un material dice cómo responde una superficie a la luz
 * (mate, brillante, metálica…), y eso es lo que distingue la piel de la tela o del plástico.
 */
import * as THREE from 'three';

export interface OpcionesMaterial {
  /** Rugosidad: 0 espejo, 1 mate. */
  rugoso?: number;
  metal?: number;
  /** Capa de barniz por encima (plástico, ojos, mar). */
  barniz?: number;
  barnizRugoso?: number;
  /** Brillo aterciopelado en los bordes (piel y tela). */
  pelusa?: number;
  colorPelusa?: number;
  opacidad?: number;
  dobleCara?: boolean;
  textura?: THREE.Texture;
  /** Color y fuerza de la luz propia. */
  luz?: number;
  fuerzaLuz?: number;
  /** false para lo que está tan lejos que la niebla no debe apagarlo (sol, nubes). */
  niebla?: boolean;
}

/** Material base. Solo usa el modelo «físico», más caro, cuando hace falta barniz o pelusa. */
export function material(color: number, o: OpcionesMaterial = {}): THREE.MeshStandardMaterial {
  const comun: THREE.MeshStandardMaterialParameters = {
    color,
    roughness: o.rugoso ?? 0.62,
    metalness: o.metal ?? 0,
    transparent: o.opacidad !== undefined,
    opacity: o.opacidad ?? 1,
    side: o.dobleCara ? THREE.DoubleSide : THREE.FrontSide,
    map: o.textura ?? null,
    fog: o.niebla ?? true,
  };
  const m =
    o.barniz || o.pelusa
      ? new THREE.MeshPhysicalMaterial({
          ...comun,
          clearcoat: o.barniz ?? 0,
          clearcoatRoughness: o.barnizRugoso ?? 0.25,
          sheen: o.pelusa ?? 0,
          sheenRoughness: 0.6,
          sheenColor: new THREE.Color(o.colorPelusa ?? 0xffffff),
        })
      : new THREE.MeshStandardMaterial(comun);
  if (o.luz !== undefined) {
    m.emissive = new THREE.Color(o.luz);
    m.emissiveIntensity = o.fuerzaLuz ?? 1;
  }
  return m;
}

export const piel = (color: number) =>
  material(color, {
    rugoso: 0.52,
    pelusa: 0.35,
    colorPelusa: 0xffb090,
    luz: 0x551808,
    fuerzaLuz: 0.1,
  });
export const tela = (color: number) => material(color, { rugoso: 0.85, pelusa: 0.5 });
export const plastico = (color: number) => material(color, { rugoso: 0.35, barniz: 0.6 });
export const metal = (color = 0xcfd6e0) => material(color, { rugoso: 0.28, metal: 0.9 });
/** Algo que brilla con luz propia: faroles, estrellas, chispas. */
export const luminoso = (color: number, fuerza = 2) =>
  material(color, { luz: color, fuerzaLuz: fuerza, rugoso: 0.4 });

/** Aclara (k > 0) u oscurece (k < 0) un color. */
export function tono(color: number, k: number): number {
  const c = new THREE.Color(color);
  if (k < 0) c.multiplyScalar(1 + k);
  else c.lerp(new THREE.Color(0xffffff), k);
  return c.getHex();
}

// ---------- Texturas pintadas en un lienzo 2D ----------

export type Pintar = (g: CanvasRenderingContext2D, ancho: number, alto: number) => void;

function lienzo(ancho: number, alto: number, pintar: Pintar, repetir = true): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = ancho;
  cv.height = alto;
  pintar(cv.getContext('2d')!, ancho, alto);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = repetir ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.anisotropy = 4;
  return t;
}

const css = (color: number) => '#' + new THREE.Color(color).getHexString();

/**
 * Números «al azar» que salen siempre iguales a partir de una semilla: así cada textura
 * queda idéntica en todas las partidas y en todos los ordenadores.
 */
export function crearAzar(semilla = 7): () => number {
  let s = semilla;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Tablones de madera con vetas. */
export function texturaMadera(
  color: number,
  tablas = 6,
  repetir: [number, number] = [1, 1],
): THREE.CanvasTexture {
  const azar = crearAzar(tablas * 31 + (color % 97));
  const t = lienzo(256, 256, (g, w, h) => {
    for (let i = 0; i < tablas; i++) {
      const y = (i * h) / tablas;
      g.fillStyle = css(tono(color, (azar() - 0.5) * 0.22));
      g.fillRect(0, y, w, h / tablas);
      g.globalAlpha = 0.16;
      for (let k = 0; k < 10; k++) {
        g.strokeStyle = azar() > 0.5 ? '#000' : '#fff';
        g.lineWidth = 1 + azar();
        const yy = y + azar() * (h / tablas);
        g.beginPath();
        g.moveTo(0, yy);
        g.bezierCurveTo(w * 0.3, yy + (azar() - 0.5) * 6, w * 0.6, yy + (azar() - 0.5) * 6, w, yy);
        g.stroke();
      }
      g.globalAlpha = 0.5;
      g.fillStyle = css(tono(color, -0.5));
      g.fillRect(0, y, w, 2);
      g.globalAlpha = 1;
    }
  });
  t.repeat.set(repetir[0], repetir[1]);
  return t;
}

/** Rayas de dos colores. */
export function texturaRayas(
  a: number,
  b: number,
  rayas = 8,
  repetir: [number, number] = [1, 1],
): THREE.CanvasTexture {
  const t = lienzo(128, 128, (g, w, h) => {
    for (let i = 0; i < rayas; i++) {
      g.fillStyle = css(i % 2 ? a : b);
      g.fillRect((i * w) / rayas, 0, w / rayas + 1, h);
    }
  });
  t.repeat.set(repetir[0], repetir[1]);
  return t;
}

/** Manchas suaves para que la piedra, la tierra o la pared no sean un color liso. */
export function texturaRuido(
  color: number,
  fuerza = 0.2,
  repetir: [number, number] = [1, 1],
): THREE.CanvasTexture {
  const azar = crearAzar(11 + (color % 89));
  const t = lienzo(256, 256, (g, w, h) => {
    g.fillStyle = css(color);
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) {
      g.globalAlpha = 0.05 + azar() * fuerza;
      g.fillStyle = css(tono(color, azar() > 0.5 ? -0.4 : 0.4));
      g.beginPath();
      g.arc(azar() * w, azar() * h, 1 + azar() * 5, 0, 7);
      g.fill();
    }
  });
  t.repeat.set(repetir[0], repetir[1]);
  return t;
}

/** Suelo de baldosas de dos colores, como un tablero de ajedrez. */
export function texturaCuadros(
  a: number,
  b: number,
  cuadros = 8,
  repetir: [number, number] = [1, 1],
): THREE.CanvasTexture {
  const t = lienzo(256, 256, (g, w, h) => {
    const lado = w / cuadros;
    for (let i = 0; i < cuadros; i++)
      for (let j = 0; j < cuadros; j++) {
        g.fillStyle = css((i + j) % 2 ? a : b);
        g.fillRect(i * lado, j * lado, lado, (h / w) * lado);
      }
  });
  t.repeat.set(...repetir);
  return t;
}

/** Textura pintada a mano por la escena (una pantalla, un cartel, una carta). No se repite. */
export function texturaPintada(ancho: number, alto: number, pintar: Pintar): THREE.CanvasTexture {
  return lienzo(ancho, alto, pintar, false);
}

/** Cielo en degradado de arriba abajo: lista de [posición de 0 a 1, color]. */
export function texturaCielo(paradas: [number, number][]): THREE.CanvasTexture {
  return lienzo(
    16,
    512,
    (g, w, h) => {
      const degradado = g.createLinearGradient(0, 0, 0, h);
      for (const [p, c] of paradas) degradado.addColorStop(p, css(c));
      g.fillStyle = degradado;
      g.fillRect(0, 0, w, h);
    },
    false,
  );
}

/** Mancha redonda que se desvanece hacia el borde: halos de luz y sombras de contacto. */
export function texturaHalo(color: number): THREE.CanvasTexture {
  return lienzo(
    128,
    128,
    (g) => {
      const degradado = g.createRadialGradient(64, 64, 2, 64, 64, 62);
      const c = new THREE.Color(color);
      const rgb = `${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}`;
      degradado.addColorStop(0, `rgba(${rgb}, 1)`);
      degradado.addColorStop(1, `rgba(${rgb}, 0)`);
      g.fillStyle = degradado;
      g.fillRect(0, 0, 128, 128);
    },
    false,
  );
}
