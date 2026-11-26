import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { iconoDe } from '../../models/iconos';
import { DueloPendiente } from '../../models/duelo';
import { nombreRonda } from '../../models/torneo';
import { IconoUsuario } from '../icono-usuario/icono-usuario';

/**
 * Tarjeta flotante «¡Te toca jugar!» que sale en cualquier pantalla cuando el usuario
 * tiene un duelo pendiente en un torneo (Eva, 26/11/2026). Solo pinta: quien la usa
 * (app.ts) pide los duelos a la API y decide cuándo enseñarla.
 */
@Component({
  selector: 'app-aviso-duelo',
  imports: [RouterLink, IconoUsuario],
  templateUrl: './aviso-duelo.html',
  styleUrl: './aviso-duelo.css',
})
export class AvisoDuelo {
  readonly aviso = input.required<DueloPendiente>();
  /** Cuántos duelos más tiene esperando, además de este. */
  readonly otros = input(0);
  readonly cerrar = output<void>();

  protected readonly iconoDe = iconoDe;
  protected readonly ronda = computed(() =>
    nombreRonda(this.aviso().ronda, this.aviso().total_rondas),
  );
  protected readonly ruta = computed(() => [
    '/torneos',
    this.aviso().id_torneo,
    'combates',
    this.aviso().id_combate,
    'duelo',
  ]);
}
