/**
 * Sonidos grabados del duelo de ritmo (MP3 generados con ElevenLabs, elevenlabs.io).
 *
 * Viven en `public/sonidos/<nombre>.mp3`. Son opcionales: si un archivo no
 * está o no se puede leer, el juego usa el sonido generado por código de
 * siempre. Así se puede cambiar un sonido sustituyendo solo su archivo.
 */
export class Sonidos {
  /** null = ya se intentó cargar y no está, para no pedirlo otra vez. */
  private readonly sonidos = new Map<string, AudioBuffer | null>();

  constructor(private readonly ctx: BaseAudioContext) {}

  /** Carga a la vez todos los que falten. Nunca falla: lo que no carga se queda sin archivo. */
  async cargar(nombres: string[]): Promise<void> {
    const pendientes = [...new Set(nombres)].filter((n) => !this.sonidos.has(n));
    await Promise.all(
      pendientes.map(async (nombre) => {
        try {
          const respuesta = await fetch(`sonidos/${nombre}.mp3`);
          if (!respuesta.ok) throw new Error('No está');
          const datos = await respuesta.arrayBuffer();
          this.sonidos.set(nombre, await this.ctx.decodeAudioData(datos));
        } catch {
          this.sonidos.set(nombre, null);
        }
      }),
    );
  }

  obtener(nombre: string): AudioBuffer | null {
    return this.sonidos.get(nombre) ?? null;
  }
}

/** Sonidos comunes a todos los escenarios. */
export const SONIDOS_COMUNES = ['fallo', 'ovacion', 'final-flojo'];
