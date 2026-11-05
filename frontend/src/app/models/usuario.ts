/** Usuario con sesión iniciada. En el torneo juega como el participante id_participante. */
export interface Usuario {
  id: number;
  nombre_usuario: string;
  id_participante: number;
  /** Icono elegido (ver models/iconos.ts); null = se muestra la inicial. */
  icono: string | null;
}

export interface Credenciales {
  nombre_usuario: string;
  contrasena: string;
}

/** Respuesta del login y del registro. */
export interface Sesion {
  token: string;
  usuario: Usuario;
}
