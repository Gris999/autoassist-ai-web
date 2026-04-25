import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { TokenService } from '../../../../core/services/token.service';
import {
  BitacoraFiltros,
  BitacoraResponse,
} from '../../models/role-management.model';
import { RoleManagementService } from '../../services/role-management.service';

@Component({
  selector: 'app-bitacora-sistema',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './bitacora-sistema.html',
  styleUrl: './bitacora-sistema.scss',
})
export class BitacoraSistema implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly roleManagementService = inject(RoleManagementService);
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly loadingDetail = signal(false);
  readonly errorMessage = signal('');
  readonly detailErrorMessage = signal('');
  readonly entries = signal<BitacoraResponse[]>([]);
  readonly selectedEntry = signal<BitacoraResponse | null>(null);

  readonly filterForm = this.fb.group({
    fecha_inicio: [''],
    fecha_fin: [''],
    id_usuario: [null as number | null],
    modulo: [''],
    accion: [''],
  });

  readonly totalEventos = computed(() => this.entries().length);
  readonly eventosAutenticacion = computed(
    () =>
      this.entries().filter(
        (entry) =>
          entry.modulo === 'AUTENTICACION_SEGURIDAD' ||
          entry.accion.includes('LOGIN') ||
          entry.accion.includes('LOGOUT')
      ).length
  );
  readonly cambiosRoles = computed(
    () => this.entries().filter((entry) => entry.accion.includes('ROL')).length
  );
  readonly eventosHoy = computed(() => {
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate()
    ).padStart(2, '0')}`;

    return this.entries().filter((entry) => entry.fecha_hora.startsWith(key)).length;
  });

  ngOnInit(): void {
    this.searchBitacora();
  }

  searchBitacora(): void {
    this.errorMessage.set('');

    const rawFilters = this.filterForm.getRawValue();
    if (
      rawFilters.fecha_inicio &&
      rawFilters.fecha_fin &&
      rawFilters.fecha_fin < rawFilters.fecha_inicio
    ) {
      this.errorMessage.set('La fecha fin no puede ser menor que la fecha inicio.');
      return;
    }

    const filters: BitacoraFiltros = {
      fecha_inicio: this.normalizeDateTime(rawFilters.fecha_inicio ?? ''),
      fecha_fin: this.normalizeDateTime(rawFilters.fecha_fin ?? ''),
      id_usuario:
        typeof rawFilters.id_usuario === 'number' ? rawFilters.id_usuario : null,
      modulo: rawFilters.modulo?.trim() || undefined,
      accion: rawFilters.accion?.trim() || undefined,
    };

    this.loading.set(true);

    this.roleManagementService
      .getBitacora(filters)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (entries) => {
          this.entries.set(entries);

          if (entries.length === 0) {
            this.selectedEntry.set(null);
            this.detailErrorMessage.set('');
            return;
          }

          const selectedId = this.selectedEntry()?.id_bitacora;
          const nextSelected =
            entries.find((entry) => entry.id_bitacora === selectedId) ?? entries[0];

          this.openDetail(nextSelected.id_bitacora);
        },
        error: (error) => {
          this.handleHttpError(error, 'No se pudo cargar la bitacora del sistema.');
        },
      });
  }

  clearFilters(): void {
    this.filterForm.reset({
      fecha_inicio: '',
      fecha_fin: '',
      id_usuario: null,
      modulo: '',
      accion: '',
    });

    this.searchBitacora();
  }

  openDetail(idBitacora: number): void {
    this.loadingDetail.set(true);
    this.detailErrorMessage.set('');

    this.roleManagementService
      .getDetalleBitacora(idBitacora)
      .pipe(finalize(() => this.loadingDetail.set(false)))
      .subscribe({
        next: (entry) => {
          this.selectedEntry.set(entry);
        },
        error: (error) => {
          const httpError = error as {
            status?: number;
            error?: { detail?: string };
          };

          if (httpError?.status === 404) {
            this.detailErrorMessage.set(
              httpError.error?.detail ?? 'El detalle solicitado no existe.'
            );
            return;
          }

          this.handleHttpError(error, 'No se pudo cargar el detalle de bitacora.');
        },
      });
  }

  trackEntry(_: number, entry: BitacoraResponse): number {
    return entry.id_bitacora;
  }

  formatDateTime(value: string): string {
    return new Intl.DateTimeFormat('es-BO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  getUserName(entry: BitacoraResponse): string {
    if (!entry.usuario) {
      return 'Sistema';
    }

    return `${entry.usuario.nombres} ${entry.usuario.apellidos}`.trim();
  }

  private normalizeDateTime(value: string): string | undefined {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    return trimmed.length === 16 ? `${trimmed}:00` : trimmed;
  }

  private handleHttpError(error: unknown, fallbackMessage: string): void {
    const httpError = error as {
      status?: number;
      error?: { detail?: string };
    };

    if (httpError?.status === 401) {
      this.tokenService.clearSession();
      void this.router.navigate(['/login']);
      return;
    }

    if (httpError?.status === 403) {
      this.errorMessage.set(
        'No tienes permisos suficientes para consultar la bitacora del sistema.'
      );
      return;
    }

    if (
      httpError?.status === 400 ||
      httpError?.status === 404 ||
      httpError?.status === 422
    ) {
      this.errorMessage.set(httpError.error?.detail ?? fallbackMessage);
      return;
    }

    this.errorMessage.set(
      'No se pudo completar la consulta. Verifica tu conexion e intenta nuevamente.'
    );
  }
}
