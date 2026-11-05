import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Cara } from '../../components/cara/cara';
import { AuthService } from '../../services/auth.service';

/** Una de las cuatro secciones a las que se llega desde el inicio. */
interface Seccion {
  ruta: string;
  titulo: string;
  texto: string;
  color: string;
  sombra: string;
  /** Color del texto: blanco sobre los colores oscuros, tinta sobre los claros (se lee mejor). */
  letra: string;
}

/** Pantalla de inicio: cuatro botones grandes con cara, uno por sección. */
@Component({
  selector: 'app-inicio',
  imports: [RouterLink, Cara],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio {
  protected readonly auth = inject(AuthService);

  // Los colores son los de cada sección en el menú (styles.css)
  protected readonly secciones: Seccion[] = [
    {
      ruta: '/torneos',
      titulo: 'Torneos',
      texto: 'Cuadros y campeones',
      color: 'var(--coral)',
      sombra: 'var(--coral-oscuro)',
      letra: '#fff',
    },
    {
      ruta: '/estadisticas',
      titulo: 'Estadísticas',
      texto: 'Quién va ganando',
      color: 'var(--amarillo)',
      sombra: 'var(--amarillo-oscuro)',
      letra: 'var(--tinta)',
    },
    {
      ruta: '/practica',
      titulo: 'Práctica',
      texto: 'Ensaya las canciones',
      color: 'var(--menta)',
      sombra: 'var(--menta-oscuro)',
      letra: 'var(--tinta)',
    },
    {
      ruta: '/participantes',
      titulo: 'Participantes',
      texto: 'Altas, cambios y estados',
      color: 'var(--azul)',
      sombra: 'var(--azul-oscuro)',
      letra: '#fff',
    },
  ];
}
