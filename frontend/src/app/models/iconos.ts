/**
 * Iconos que puede elegir cada usuario (aprobados por Eva el 05/11/2026).
 * Cada uno es el interior de un SVG de 100x100: el componente IconoUsuario
 * pone alrededor el círculo de fondo y el borde de color. El backend guarda
 * solo el id (lista ICONOS de auth_servicio.py).
 */
export interface Icono {
  id: string;
  nombre: string;
  fondo: string;
  borde: string;
  /** Dibujo del personaje: SVG propio y fijo, nunca texto del usuario. */
  dibujo: string;
}

export const ICONOS: Icono[] = [
  {
    id: 'gato',
    nombre: 'Gato',
    fondo: '#ffe1d6',
    borde: '#ff6b6b',
    dibujo:
      '<path d="M27 50 L25 22 L45 36 Z" fill="#ffb36b" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><path d="M73 50 L75 22 L55 36 Z" fill="#ffb36b" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><path d="M30 40 L29 29 L38 35 Z" fill="#ff8fa3"/><path d="M70 40 L71 29 L62 35 Z" fill="#ff8fa3"/><ellipse cx="50" cy="60" rx="29" ry="24" fill="#ffb36b" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><path d="M44 38 l2 8 M50 36 v9 M56 38 l-2 8" stroke="#e0883c" stroke-width="3" stroke-linecap="round"/><ellipse cx="38" cy="56" rx="5" ry="6.5" fill="#3a2e4a"/><ellipse cx="62" cy="56" rx="5" ry="6.5" fill="#3a2e4a"/><circle cx="39.6" cy="53.6" r="1.9" fill="#fff"/><circle cx="63.6" cy="53.6" r="1.9" fill="#fff"/><ellipse cx="29" cy="66" rx="5" ry="3.4" fill="#ff8fa3" opacity="0.7"/><ellipse cx="71" cy="66" rx="5" ry="3.4" fill="#ff8fa3" opacity="0.7"/><path d="M47 64 h6 l-3 3.5 z" fill="#ff8fa3" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" stroke-width="2"/><path d="M44 70 q3 3 6 0 q3 3 6 0" fill="none" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" stroke-width="3"/><path d="M18 60 h10 M18 67 l10 -2 M82 60 h-10 M82 67 l-10 -2" stroke="#3a2e4a" stroke-width="2.4" stroke-linecap="round"/>',
  },
  {
    id: 'rana',
    nombre: 'Rana',
    fondo: '#dff7e3',
    borde: '#4cc796',
    dibujo:
      '<ellipse cx="50" cy="64" rx="33" ry="22" fill="#7cc56a" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="33" cy="42" r="12" fill="#7cc56a" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="67" cy="42" r="12" fill="#7cc56a" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="33" cy="42" r="7.5" fill="#fff"/><circle cx="67" cy="42" r="7.5" fill="#fff"/><circle cx="34" cy="43" r="4.2" fill="#3a2e4a"/><circle cx="68" cy="43" r="4.2" fill="#3a2e4a"/><circle cx="35.5" cy="41.5" r="1.4" fill="#fff"/><circle cx="69.5" cy="41.5" r="1.4" fill="#fff"/><path d="M32 66 q18 14 36 0" fill="none" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><ellipse cx="27" cy="68" rx="5" ry="3.4" fill="#ff8fa3" opacity="0.7"/><ellipse cx="73" cy="68" rx="5" ry="3.4" fill="#ff8fa3" opacity="0.7"/>',
  },
  {
    id: 'patito',
    nombre: 'Patito',
    fondo: '#fff3c4',
    borde: '#ffc93c',
    dibujo:
      '<path d="M46 28 q2 -10 8 -6 q-1 4 -4 7" fill="#ffd84a" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="50" cy="56" r="28" fill="#ffd84a" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><ellipse cx="39" cy="50" rx="5" ry="6.5" fill="#3a2e4a"/><ellipse cx="61" cy="50" rx="5" ry="6.5" fill="#3a2e4a"/><circle cx="40.6" cy="47.6" r="1.9" fill="#fff"/><circle cx="62.6" cy="47.6" r="1.9" fill="#fff"/><ellipse cx="30" cy="62" rx="5" ry="3.4" fill="#ff8fa3" opacity="0.7"/><ellipse cx="70" cy="62" rx="5" ry="3.4" fill="#ff8fa3" opacity="0.7"/><path d="M38 64 q12 -6 24 0 q-12 10 -24 0 z" fill="#ff9a2e" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>',
  },
  {
    id: 'gaviota',
    nombre: 'Gaviota',
    fondo: '#dceefa',
    borde: '#5aa0c8',
    dibujo:
      '<circle cx="46" cy="56" r="27" fill="#ffffff" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><path d="M70 52 L92 58 L70 64 Z" fill="#ffb000" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="84" cy="59.5" r="2" fill="#e8505b"/><ellipse cx="54" cy="50" rx="5" ry="6.5" fill="#3a2e4a"/><circle cx="55.6" cy="47.6" r="1.9" fill="#fff"/><ellipse cx="54" cy="66" rx="5" ry="3.4" fill="#ff8fa3" opacity="0.7"/><path d="M47 41 q7 -4 13 0" fill="none" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" stroke-width="2.6"/>',
  },
  {
    id: 'zorro',
    nombre: 'Zorro',
    fondo: '#ffe6cc',
    borde: '#e0a21a',
    dibujo:
      '<path d="M24 46 L22 18 L44 34 Z" fill="#f28a2e" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><path d="M76 46 L78 18 L56 34 Z" fill="#f28a2e" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><path d="M28 38 L27 26 L37 33 Z" fill="#3a2e4a"/><path d="M72 38 L73 26 L63 33 Z" fill="#3a2e4a"/><path d="M20 46 Q50 28 80 46 Q76 70 50 84 Q24 70 20 46 Z" fill="#f28a2e" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><path d="M24 56 Q40 54 50 66 Q60 54 76 56 Q68 74 50 84 Q32 74 24 56 Z" fill="#ffffff" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" stroke-width="2.6"/><ellipse cx="38" cy="52" rx="4.5" ry="6" fill="#3a2e4a"/><ellipse cx="62" cy="52" rx="4.5" ry="6" fill="#3a2e4a"/><circle cx="39.6" cy="49.6" r="1.9" fill="#fff"/><circle cx="63.6" cy="49.6" r="1.9" fill="#fff"/><ellipse cx="50" cy="76" rx="4.6" ry="3.4" fill="#3a2e4a"/>',
  },
  {
    id: 'oso',
    nombre: 'Oso',
    fondo: '#f1e3d6',
    borde: '#a8653a',
    dibujo:
      '<circle cx="27" cy="34" r="10" fill="#b5763f" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="73" cy="34" r="10" fill="#b5763f" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="27" cy="34" r="4.5" fill="#e8c49a"/><circle cx="73" cy="34" r="4.5" fill="#e8c49a"/><circle cx="50" cy="56" r="28" fill="#b5763f" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><ellipse cx="50" cy="66" rx="13" ry="10" fill="#e8c49a" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" stroke-width="2.6"/><ellipse cx="38" cy="50" rx="4.5" ry="5.5" fill="#3a2e4a"/><ellipse cx="62" cy="50" rx="4.5" ry="5.5" fill="#3a2e4a"/><circle cx="39.6" cy="47.6" r="1.9" fill="#fff"/><circle cx="63.6" cy="47.6" r="1.9" fill="#fff"/><ellipse cx="50" cy="61" rx="4.5" ry="3.2" fill="#3a2e4a"/><path d="M45 69 q5 4 10 0" fill="none" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" stroke-width="2.6"/>',
  },
  {
    id: 'pulpo',
    nombre: 'Pulpo',
    fondo: '#ece3fb',
    borde: '#9b6fd6',
    dibujo:
      '<path d="M32 68 q-4 10 -12 12 M44 72 q-2 10 -8 14 M56 72 q2 10 8 14 M68 68 q4 10 12 12" fill="none" stroke="#3a2e4a" stroke-width="12" stroke-linecap="round"/><path d="M32 68 q-4 10 -12 12 M44 72 q-2 10 -8 14 M56 72 q2 10 8 14 M68 68 q4 10 12 12" fill="none" stroke="#b892ef" stroke-width="5" stroke-linecap="round"/><path d="M22 54 Q22 22 50 22 Q78 22 78 54 Q78 76 50 76 Q22 76 22 54 Z" fill="#b892ef" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="36" cy="32" r="3" fill="#d9c5fa"/><circle cx="62" cy="28" r="2.2" fill="#d9c5fa"/><ellipse cx="39" cy="50" rx="5" ry="6.5" fill="#3a2e4a"/><ellipse cx="61" cy="50" rx="5" ry="6.5" fill="#3a2e4a"/><circle cx="40.6" cy="47.6" r="1.9" fill="#fff"/><circle cx="62.6" cy="47.6" r="1.9" fill="#fff"/><path d="M43 62q7 6.3 14 0" fill="none" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><ellipse cx="30" cy="61" rx="5" ry="3.4" fill="#ff8fa3" opacity="0.7"/><ellipse cx="70" cy="61" rx="5" ry="3.4" fill="#ff8fa3" opacity="0.7"/>',
  },
  {
    id: 'robot',
    nombre: 'Robot',
    fondo: '#dceefa',
    borde: '#3d7ea3',
    dibujo:
      '<path d="M50 26 V16" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="50" cy="13" r="5" fill="#ff6b6b" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><rect x="13" y="46" width="8" height="16" rx="3" fill="#9aa3c7" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><rect x="79" y="46" width="8" height="16" rx="3" fill="#9aa3c7" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><rect x="21" y="26" width="58" height="52" rx="14" fill="#c9d3e6" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><rect x="29" y="36" width="42" height="26" rx="8" fill="#3a2e4a"/><rect x="36" y="42" width="8" height="10" rx="3" fill="#7cf2c0"/><rect x="56" y="42" width="8" height="10" rx="3" fill="#7cf2c0"/><path d="M42 70 h16" stroke="#3a2e4a" stroke-width="3.5" stroke-linecap="round"/>',
  },
  {
    id: 'estrella',
    nombre: 'Estrella',
    fondo: '#262c66',
    borde: '#ffc93c',
    dibujo:
      '<circle cx="22" cy="26" r="1.8" fill="#fff"/><circle cx="80" cy="30" r="1.4" fill="#fff"/><circle cx="76" cy="78" r="1.6" fill="#fff"/><path d="M50 16 L59 39 L84 40 L64 55 L71 80 L50 66 L29 80 L36 55 L16 40 L41 39 Z" fill="#ffe07a" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><ellipse cx="43" cy="50" rx="3.8" ry="5" fill="#3a2e4a"/><ellipse cx="57" cy="50" rx="3.8" ry="5" fill="#3a2e4a"/><circle cx="44.6" cy="47.6" r="1.9" fill="#fff"/><circle cx="58.6" cy="47.6" r="1.9" fill="#fff"/><path d="M45 59q5 4.5 10 0" fill="none" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><ellipse cx="36" cy="58" rx="5" ry="3.4" fill="#ff8fa3" opacity="0.7"/><ellipse cx="64" cy="58" rx="5" ry="3.4" fill="#ff8fa3" opacity="0.7"/>',
  },
  {
    id: 'nota',
    nombre: 'Nota musical',
    fondo: '#ffe0e8',
    borde: '#ff8fa3',
    dibujo:
      '<path d="M58 70 V22 q12 4 20 14 q-4 -2 -12 -4 V70" fill="#ff6b6b" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><ellipse cx="44" cy="70" rx="20" ry="15" fill="#ff6b6b" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" transform="rotate(-15 44 70)"/><ellipse cx="37" cy="67" rx="3.6" ry="4.6" fill="#3a2e4a"/><ellipse cx="51" cy="67" rx="3.6" ry="4.6" fill="#3a2e4a"/><circle cx="38.6" cy="64.6" r="1.9" fill="#fff"/><circle cx="52.6" cy="64.6" r="1.9" fill="#fff"/><path d="M40 75q4 3.6 8 0" fill="none" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>',
  },
  {
    id: 'fantasma',
    nombre: 'Fantasma',
    fondo: '#e3e9f7',
    borde: '#9b6fd6',
    dibujo:
      '<path d="M26 82 V48 Q26 20 50 20 Q74 20 74 48 V82 l-8 -6 l-8 6 l-8 -6 l-8 6 l-8 -6 z" fill="#ffffff" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><ellipse cx="40" cy="46" rx="5" ry="6.5" fill="#3a2e4a"/><ellipse cx="60" cy="46" rx="5" ry="6.5" fill="#3a2e4a"/><circle cx="41.6" cy="43.6" r="1.9" fill="#fff"/><circle cx="61.6" cy="43.6" r="1.9" fill="#fff"/><ellipse cx="32" cy="58" rx="5" ry="3.4" fill="#ff8fa3" opacity="0.7"/><ellipse cx="68" cy="58" rx="5" ry="3.4" fill="#ff8fa3" opacity="0.7"/><ellipse cx="50" cy="62" rx="5" ry="6" fill="#3a2e4a"/>',
  },
  {
    id: 'seta',
    nombre: 'Seta',
    fondo: '#fde3d6',
    borde: '#e8505b',
    dibujo:
      '<path d="M36 50 Q34 80 40 82 H60 Q66 80 64 50 Z" fill="#f6e9d2" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><path d="M14 52 Q16 18 50 18 Q84 18 86 52 Q50 58 14 52 Z" fill="#e8505b" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="32" cy="36" r="5" fill="#fff"/><circle cx="54" cy="28" r="6" fill="#fff"/><circle cx="72" cy="40" r="4" fill="#fff"/><ellipse cx="43" cy="66" rx="3.6" ry="4.8" fill="#3a2e4a"/><ellipse cx="57" cy="66" rx="3.6" ry="4.8" fill="#3a2e4a"/><circle cx="44.6" cy="63.6" r="1.9" fill="#fff"/><circle cx="58.6" cy="63.6" r="1.9" fill="#fff"/><path d="M46 74q4 3.6 8 0" fill="none" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>',
  },
  {
    id: 'calabaza',
    nombre: 'Calabaza',
    fondo: '#e6f5d8',
    borde: '#7cc56a',
    dibujo:
      '<path d="M50 30 q-2 -10 4 -14" fill="none" stroke="#6b8f3a" stroke-width="5" stroke-linecap="round"/><path d="M54 22 q12 -6 18 2 q-10 4 -18 -2 z" fill="#7cc56a" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" stroke-width="2.6"/><ellipse cx="34" cy="58" rx="16" ry="24" fill="#ff9a2e" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><ellipse cx="66" cy="58" rx="16" ry="24" fill="#ff9a2e" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><ellipse cx="50" cy="58" rx="16" ry="26" fill="#ffad4a" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><ellipse cx="42" cy="54" rx="4" ry="5.2" fill="#3a2e4a"/><ellipse cx="58" cy="54" rx="4" ry="5.2" fill="#3a2e4a"/><circle cx="43.6" cy="51.6" r="1.9" fill="#fff"/><circle cx="59.6" cy="51.6" r="1.9" fill="#fff"/><path d="M45 64q5 4.5 10 0" fill="none" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><ellipse cx="31" cy="63" rx="5" ry="3.4" fill="#ff8fa3" opacity="0.7"/><ellipse cx="69" cy="63" rx="5" ry="3.4" fill="#ff8fa3" opacity="0.7"/>',
  },
  {
    id: 'ramen',
    nombre: 'Ramen',
    fondo: '#fff0d6',
    borde: '#3b4a8c',
    dibujo:
      '<path d="M60 14 L40 46 M70 18 L46 48" stroke="#c98a55" stroke-width="4" stroke-linecap="round"/><path d="M30 46 q4 -10 8 0 q4 -10 8 0 q4 -10 8 0 q4 -10 8 0 q4 -10 8 0" fill="none" stroke="#f6c26b" stroke-width="4" stroke-linecap="round"/><path d="M14 46 H86 Q84 84 50 84 Q16 84 14 46 Z" fill="#ffffff" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><path d="M18 56 H82" stroke="#e8505b" stroke-width="3"/><ellipse cx="40" cy="66" rx="3.8" ry="4.8" fill="#3a2e4a"/><ellipse cx="60" cy="66" rx="3.8" ry="4.8" fill="#3a2e4a"/><circle cx="41.6" cy="63.6" r="1.9" fill="#fff"/><circle cx="61.6" cy="63.6" r="1.9" fill="#fff"/><path d="M45.5 72q4.5 4.05 9 0" fill="none" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><ellipse cx="29" cy="72" rx="5" ry="3.4" fill="#ff8fa3" opacity="0.7"/><ellipse cx="71" cy="72" rx="5" ry="3.4" fill="#ff8fa3" opacity="0.7"/>',
  },
  {
    id: 'trofeo',
    nombre: 'Trofeo',
    fondo: '#fff3c4',
    borde: '#e0a21a',
    dibujo:
      '<path d="M28 30 q-14 0 -12 14 q2 10 16 10 M72 30 q14 0 12 14 q-2 10 -16 10" fill="none" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><rect x="34" y="74" width="32" height="10" rx="3" fill="#b5763f" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><path d="M44 66 h12 v8 h-12 z" fill="#ffc93c" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><path d="M26 22 H74 V40 Q74 66 50 66 Q26 66 26 40 Z" fill="#ffc93c" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><path d="M34 28 v10" stroke="#fff3c4" stroke-width="3.5" stroke-linecap="round"/><ellipse cx="41" cy="40" rx="3.8" ry="5" fill="#3a2e4a"/><ellipse cx="59" cy="40" rx="3.8" ry="5" fill="#3a2e4a"/><circle cx="42.6" cy="37.6" r="1.9" fill="#fff"/><circle cx="60.6" cy="37.6" r="1.9" fill="#fff"/><path d="M45 49q5 4.5 10 0" fill="none" stroke="#3a2e4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><ellipse cx="33" cy="48" rx="5" ry="3.4" fill="#ff8fa3" opacity="0.7"/><ellipse cx="67" cy="48" rx="5" ry="3.4" fill="#ff8fa3" opacity="0.7"/>',
  },
];

/**
 * Icono con el que se pinta a un participante: el que eligió su usuario o, si no tiene
 * (no ha elegido o es un bot sin cuenta), uno de los animales, que sale de su id, así siempre
 * es el mismo (decisión de Eva, 12/11/2026).
 */
export function iconoDe(p: { id: number; icono?: string | null }): string {
  return p.icono ?? ANIMALES[p.id % ANIMALES.length];
}

/**
 * Icono de una marca de las estadísticas: el del usuario o, si no eligió ninguno, el mismo animal
 * que su participante (o el de su id de usuario si no tiene participante).
 */
export function iconoDeMarca(m: {
  id_usuario: number;
  id_participante: number | null;
  icono: string | null;
}): string {
  return iconoDe({ id: m.id_participante ?? m.id_usuario, icono: m.icono });
}

/** Los animales de la lista, para repartir entre los que no tienen icono. */
const ANIMALES = ['gato', 'rana', 'patito', 'gaviota', 'zorro', 'oso', 'pulpo'];
