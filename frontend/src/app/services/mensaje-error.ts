import { HttpErrorResponse } from '@angular/common/http';

/** Convierte un error HTTP en un mensaje legible para mostrar en pantalla. */
export function mensajeError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Ha ocurrido un error inesperado';
  }
  if (error.status === 0) {
    return 'No se puede conectar con la API. ¿Está arrancado el backend?';
  }
  const detalle = error.error?.detail;
  if (typeof detalle === 'string') {
    return detalle;
  }
  // Errores de validación de FastAPI: lista de { msg, ... }
  if (Array.isArray(detalle) && detalle.length > 0) {
    return detalle.map((d) => String(d.msg).replace('Value error, ', '')).join('. ');
  }
  return `Error ${error.status}`;
}
