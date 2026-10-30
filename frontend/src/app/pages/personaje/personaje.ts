import { Component, inject, OnInit, signal, viewChild } from '@angular/core';

import { VistaPersonaje } from '../../components/vista-personaje/vista-personaje';
import {
  ACCESORIOS,
  Apariencia,
  aparienciaAleatoria,
  PALETAS,
  PEINADOS,
} from '../../juego/sprites/apariencia';
import { mensajeError } from '../../services/mensaje-error';
import { PersonajeService } from '../../services/personaje.service';

type CampoColor = keyof typeof PALETAS;

/** Editor del personaje del usuario: colores, peinado y accesorio con vista previa. */
@Component({
  selector: 'app-personaje',
  imports: [VistaPersonaje],
  templateUrl: './personaje.html',
  styleUrl: './personaje.css',
})
export class PersonajeEditor implements OnInit {
  private readonly servicio = inject(PersonajeService);
  private readonly vista = viewChild(VistaPersonaje);

  protected readonly nick = signal('');
  protected readonly apariencia = signal<Apariencia | null>(null);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly guardado = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly peinados = PEINADOS;
  protected readonly accesorios = ACCESORIOS;
  protected readonly colores: { campo: CampoColor; nombre: string }[] = [
    { campo: 'piel', nombre: 'Piel' },
    { campo: 'pelo', nombre: 'Pelo' },
    { campo: 'ropa', nombre: 'Camiseta y accesorio' },
    { campo: 'pantalon', nombre: 'Pantalón' },
  ];
  protected readonly paletas = PALETAS;

  ngOnInit(): void {
    this.servicio.obtener().subscribe({
      next: ({ id_participante, nick, ...apariencia }) => {
        this.nick.set(nick);
        this.apariencia.set(apariencia);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }

  cambiar<K extends keyof Apariencia>(campo: K, valor: Apariencia[K]): void {
    this.apariencia.update((a) => (a ? { ...a, [campo]: valor } : a));
    this.guardado.set(false);
  }

  aleatorio(): void {
    this.apariencia.set(aparienciaAleatoria());
    this.guardado.set(false);
  }

  probar(golpe: 'punetazo' | 'patada'): void {
    this.vista()?.reproducir(golpe);
  }

  guardar(): void {
    const apariencia = this.apariencia();
    if (!apariencia) return;
    this.guardando.set(true);
    this.error.set(null);
    this.servicio.guardar(apariencia).subscribe({
      next: () => {
        this.guardando.set(false);
        this.guardado.set(true);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.guardando.set(false);
      },
    });
  }
}
