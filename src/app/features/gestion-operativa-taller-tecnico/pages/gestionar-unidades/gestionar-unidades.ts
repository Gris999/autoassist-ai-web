import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, startWith } from 'rxjs';

import { TokenService } from '../../../../core/services/token.service';
import {
  ActualizarDisponibilidadUnidadMovilRequest,
  ActualizarUnidadMovilRequest,
  CrearUnidadMovilRequest,
  UnidadMovil,
} from '../../models/mobile-unit-management.model';
import { WorkshopOperationalService } from '../../services/workshop-operational.service';

type EstadoFilter = 'todos' | 'activos' | 'deshabilitados';
type DisponibilidadFilter = 'todos' | 'disponibles' | 'no_disponibles';
type UnitEditorMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-gestionar-unidades',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './gestionar-unidades.html',
  styleUrl: './gestionar-unidades.scss',
})
export class GestionarUnidades implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly workshopOperationalService = inject(WorkshopOperationalService);
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly selectionLoading = signal(false);
  readonly savingUnit = signal(false);
  readonly rowSavingId = signal<number | null>(null);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly editorMode = signal<UnitEditorMode>('create');
  readonly units = signal<UnidadMovil[]>([]);
  readonly selectedUnitId = signal<number | null>(null);
  readonly selectedUnitDetail = signal<UnidadMovil | null>(null);

  readonly filtersForm = this.fb.nonNullable.group({
    search: [''],
    tipo_unidad: ['todas'],
    disponibilidad: ['todos' as DisponibilidadFilter],
    estado: ['todos' as EstadoFilter],
  });

  readonly unitForm = this.fb.nonNullable.group({
    placa: ['', [Validators.required, Validators.minLength(5)]],
    tipo_unidad: ['', [Validators.required]],
    disponible: [true],
    estado: [true],
    latitud_actual: ['', [Validators.pattern(/^-?\d+(\.\d+)?$/)]],
    longitud_actual: ['', [Validators.pattern(/^-?\d+(\.\d+)?$/)]],
  });

  private readonly filterValue = toSignal(
    this.filtersForm.valueChanges.pipe(startWith(this.filtersForm.getRawValue())),
    { initialValue: this.filtersForm.getRawValue() }
  );

  readonly unitTypes = computed(() =>
    [...new Set(this.units().map((unit) => unit.tipo_unidad).filter(Boolean))].sort()
  );

  readonly filteredUnits = computed(() => {
    const filters = this.filterValue();
    const search = (filters.search ?? '').trim().toLowerCase();

    return this.units().filter((unit) => {
      if (filters.estado === 'activos' && !unit.estado) {
        return false;
      }

      if (filters.estado === 'deshabilitados' && unit.estado) {
        return false;
      }

      if (filters.disponibilidad === 'disponibles' && !unit.disponible) {
        return false;
      }

      if (filters.disponibilidad === 'no_disponibles' && unit.disponible) {
        return false;
      }

      if (
        filters.tipo_unidad !== 'todas' &&
        unit.tipo_unidad !== filters.tipo_unidad
      ) {
        return false;
      }

      if (!search) {
        return true;
      }

      return [unit.placa, unit.tipo_unidad]
        .join(' ')
        .toLowerCase()
        .includes(search);
    });
  });

  readonly totalUnits = computed(() => this.units().length);
  readonly totalAvailable = computed(
    () => this.units().filter((unit) => unit.estado && unit.disponible).length
  );
  readonly totalUnavailable = computed(
    () => this.units().filter((unit) => unit.estado && !unit.disponible).length
  );
  readonly totalDisabled = computed(
    () => this.units().filter((unit) => !unit.estado).length
  );

  readonly isCreateMode = computed(() => this.editorMode() === 'create');
  readonly isEditMode = computed(() => this.editorMode() === 'edit');
  readonly isViewMode = computed(() => this.editorMode() === 'view');

  readonly hasUnitChanges = computed(() => {
    const detail = this.selectedUnitDetail();
    if (!detail || !this.isEditMode()) {
      return false;
    }

    return Object.keys(this.buildUpdatePayload(detail)).length > 0;
  });

  ngOnInit(): void {
    this.watchStateAvailabilityRule();
    this.loadUnits();
  }

  loadUnits(): void {
    const isInitialLoad = this.loading();
    const selectedId = this.selectedUnitId();
    const currentMode = this.editorMode();

    if (isInitialLoad) {
      this.loading.set(true);
    } else {
      this.refreshing.set(true);
    }

    this.errorMessage.set('');

    this.workshopOperationalService
      .getUnidadesMoviles()
      .pipe(
        finalize(() => {
          if (isInitialLoad) {
            this.loading.set(false);
          } else {
            this.refreshing.set(false);
          }
        })
      )
      .subscribe({
        next: (units) => {
          this.units.set(this.sortUnits(units));

          const nextSelectedId =
            units.find((unit) => unit.id_unidad_movil === selectedId)
              ?.id_unidad_movil ??
            units[0]?.id_unidad_movil ??
            null;

          if (!nextSelectedId) {
            this.startCreateMode();
            return;
          }

          if (currentMode === 'create' && selectedId === null) {
            this.selectUnit(nextSelectedId, 'view');
            return;
          }

          this.selectUnit(
            nextSelectedId,
            currentMode === 'edit' ? 'edit' : 'view'
          );
        },
        error: (error) => {
          this.handleHttpError(
            error,
            'No se pudo cargar la gestion de unidades moviles.'
          );
        },
      });
  }

  startCreateMode(): void {
    this.editorMode.set('create');
    this.selectedUnitId.set(null);
    this.selectedUnitDetail.set(null);
    this.resetUnitForm();
    this.successMessage.set('');
  }

  selectUnit(idUnidadMovil: number, mode: UnitEditorMode = 'view'): void {
    this.selectedUnitId.set(idUnidadMovil);
    this.selectionLoading.set(true);
    this.errorMessage.set('');

    this.workshopOperationalService
      .getUnidadMovilDetalle(idUnidadMovil)
      .pipe(finalize(() => this.selectionLoading.set(false)))
      .subscribe({
        next: (detail) => {
          this.selectedUnitDetail.set(detail);

          if (mode === 'edit') {
            this.editorMode.set('edit');
            this.patchUnitForm(detail);
          } else {
            this.editorMode.set('view');
          }
        },
        error: (error) => {
          this.handleHttpError(
            error,
            'No se pudo cargar el detalle de la unidad seleccionada.'
          );
        },
      });
  }

  editUnit(idUnidadMovil: number): void {
    this.selectUnit(idUnidadMovil, 'edit');
  }

  cancelEditor(): void {
    if (this.isEditMode() && this.selectedUnitId()) {
      this.selectUnit(this.selectedUnitId()!, 'view');
      return;
    }

    this.resetUnitForm();
  }

  saveUnit(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.unitForm.invalid) {
      this.unitForm.markAllAsTouched();
      this.errorMessage.set(
        'Revisa los datos de la unidad movil antes de guardar.'
      );
      return;
    }

    const rawValue = this.unitForm.getRawValue();
    if (!rawValue.estado && rawValue.disponible) {
      this.errorMessage.set(
        'Una unidad deshabilitada no puede quedar disponible.'
      );
      return;
    }

    if (this.isCreateMode()) {
      const payload: CrearUnidadMovilRequest = {
        placa: rawValue.placa.trim().toUpperCase(),
        tipo_unidad: rawValue.tipo_unidad.trim().toUpperCase(),
        disponible: rawValue.estado ? rawValue.disponible : false,
        estado: rawValue.estado,
        latitud_actual: this.normalizeCoordinate(rawValue.latitud_actual),
        longitud_actual: this.normalizeCoordinate(rawValue.longitud_actual),
      };

      this.savingUnit.set(true);

      this.workshopOperationalService
        .registrarUnidadMovil(payload)
        .pipe(finalize(() => this.savingUnit.set(false)))
        .subscribe({
          next: (createdUnit) => {
            this.upsertUnit(createdUnit);
            this.selectedUnitId.set(createdUnit.id_unidad_movil);
            this.selectedUnitDetail.set(createdUnit);
            this.editorMode.set('view');
            this.successMessage.set('Unidad movil registrada correctamente.');
          },
          error: (error) => {
            this.handleHttpError(
              error,
              'No se pudo registrar la unidad movil.'
            );
          },
        });

      return;
    }

    const detail = this.selectedUnitDetail();
    if (!detail) {
      this.errorMessage.set(
        'Selecciona una unidad valida antes de editar.'
      );
      return;
    }

    const payload = this.buildUpdatePayload(detail);
    if (Object.keys(payload).length === 0) {
      this.errorMessage.set('No hay cambios para guardar.');
      return;
    }

    this.savingUnit.set(true);

    this.workshopOperationalService
      .actualizarUnidadMovil(detail.id_unidad_movil, payload)
      .pipe(finalize(() => this.savingUnit.set(false)))
      .subscribe({
        next: (updatedUnit) => {
          this.upsertUnit(updatedUnit);
          this.selectedUnitDetail.set(updatedUnit);
          this.patchUnitForm(updatedUnit);
          this.successMessage.set('Unidad movil actualizada correctamente.');
        },
        error: (error) => {
          this.handleHttpError(
            error,
            'No se pudo actualizar la unidad movil seleccionada.'
          );
        },
      });
  }

  changeUnitAvailability(unit: UnidadMovil, nextAvailability: boolean): void {
    if (!unit.estado && nextAvailability) {
      this.errorMessage.set(
        'No puedes marcar disponible a una unidad deshabilitada.'
      );
      this.successMessage.set('');
      return;
    }

    if (unit.disponible === nextAvailability) {
      this.errorMessage.set('');
      this.successMessage.set(
        nextAvailability
          ? 'La unidad ya estaba disponible.'
          : 'La unidad ya estaba marcada como no disponible.'
      );
      return;
    }

    this.applyUnitAvailabilityPatch(unit, { disponible: nextAvailability });
  }

  changeUnitState(unit: UnidadMovil, nextState: boolean): void {
    if (unit.estado === nextState) {
      this.errorMessage.set('');
      this.successMessage.set(
        nextState
          ? 'La unidad ya estaba habilitada.'
          : 'La unidad ya estaba deshabilitada.'
      );
      return;
    }

    const payload: ActualizarDisponibilidadUnidadMovilRequest = nextState
      ? { estado: true }
      : { estado: false, disponible: false };

    this.applyUnitAvailabilityPatch(unit, payload);
  }

  getAvailabilityBadgeClass(disponible: boolean, estado = true): string {
    if (!estado) {
      return 'status-pill status-pill--disabled';
    }

    return disponible
      ? 'status-pill status-pill--available'
      : 'status-pill status-pill--unavailable';
  }

  getAvailabilityLabel(disponible: boolean, estado = true): string {
    if (!estado) {
      return 'Deshabilitada';
    }

    return disponible ? 'Disponible' : 'No disponible';
  }

  getStateBadgeClass(estado: boolean): string {
    return estado
      ? 'status-pill status-pill--active'
      : 'status-pill status-pill--disabled';
  }

  getTypeBadgeClass(tipoUnidad: string): string {
    const normalizedType = tipoUnidad.trim().toUpperCase();

    if (normalizedType === 'GRUA') {
      return 'type-pill type-pill--grua';
    }

    if (normalizedType === 'CAMIONETA') {
      return 'type-pill type-pill--camioneta';
    }

    if (normalizedType === 'MOTOCICLETA') {
      return 'type-pill type-pill--motocicleta';
    }

    return 'type-pill type-pill--other';
  }

  trackUnit(_: number, unit: UnidadMovil): number {
    return unit.id_unidad_movil;
  }

  trackType(_: number, unitType: string): string {
    return unitType;
  }

  private applyUnitAvailabilityPatch(
    unit: UnidadMovil,
    payload: ActualizarDisponibilidadUnidadMovilRequest
  ): void {
    this.rowSavingId.set(unit.id_unidad_movil);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.workshopOperationalService
      .actualizarDisponibilidadUnidadMovil(unit.id_unidad_movil, payload)
      .pipe(finalize(() => this.rowSavingId.set(null)))
      .subscribe({
        next: (updatedUnit) => {
          this.upsertUnit(updatedUnit);

          if (this.selectedUnitId() === updatedUnit.id_unidad_movil) {
            this.selectedUnitDetail.set(updatedUnit);
            if (this.isEditMode()) {
              this.patchUnitForm(updatedUnit);
            }
          }

          if (payload.estado === false) {
            this.successMessage.set('Unidad movil deshabilitada correctamente.');
            return;
          }

          if (payload.estado === true && payload.disponible === undefined) {
            this.successMessage.set('Unidad movil habilitada correctamente.');
            return;
          }

          this.successMessage.set(
            payload.disponible
              ? 'Unidad movil marcada como disponible correctamente.'
              : 'Unidad movil marcada como no disponible correctamente.'
          );
        },
        error: (error) => {
          this.handleHttpError(
            error,
            'No se pudo actualizar la disponibilidad de la unidad movil.'
          );
        },
      });
  }

  private upsertUnit(unit: UnidadMovil): void {
    this.units.update((current) => {
      const exists = current.some(
        (item) => item.id_unidad_movil === unit.id_unidad_movil
      );
      const next = exists
        ? current.map((item) =>
            item.id_unidad_movil === unit.id_unidad_movil ? unit : item
          )
        : [unit, ...current];

      return this.sortUnits(next);
    });
  }

  private patchUnitForm(detail: UnidadMovil): void {
    this.unitForm.patchValue({
      placa: detail.placa,
      tipo_unidad: detail.tipo_unidad,
      disponible: detail.disponible,
      estado: detail.estado,
      latitud_actual: this.formatCoordinate(detail.latitud_actual),
      longitud_actual: this.formatCoordinate(detail.longitud_actual),
    });
    this.unitForm.markAsPristine();
  }

  private resetUnitForm(): void {
    this.unitForm.reset({
      placa: '',
      tipo_unidad: '',
      disponible: true,
      estado: true,
      latitud_actual: '',
      longitud_actual: '',
    });
    this.unitForm.markAsPristine();
  }

  private buildUpdatePayload(detail: UnidadMovil): ActualizarUnidadMovilRequest {
    const rawValue = this.unitForm.getRawValue();
    const payload: ActualizarUnidadMovilRequest = {};
    const nextPlate = rawValue.placa.trim().toUpperCase();
    const nextUnitType = rawValue.tipo_unidad.trim().toUpperCase();
    const nextLatitude = this.normalizeCoordinate(rawValue.latitud_actual);
    const nextLongitude = this.normalizeCoordinate(rawValue.longitud_actual);

    if (nextPlate !== detail.placa) {
      payload.placa = nextPlate;
    }

    if (nextUnitType !== detail.tipo_unidad) {
      payload.tipo_unidad = nextUnitType;
    }

    if (rawValue.disponible !== detail.disponible) {
      payload.disponible = rawValue.disponible;
    }

    if (rawValue.estado !== detail.estado) {
      payload.estado = rawValue.estado;
    }

    if (nextLatitude !== this.normalizeExistingCoordinate(detail.latitud_actual)) {
      payload.latitud_actual = nextLatitude;
    }

    if (nextLongitude !== this.normalizeExistingCoordinate(detail.longitud_actual)) {
      payload.longitud_actual = nextLongitude;
    }

    return payload;
  }

  private normalizeCoordinate(value: string): string | null {
    const normalizedValue = value.trim();
    return normalizedValue ? normalizedValue : null;
  }

  private normalizeExistingCoordinate(
    value: string | number | null | undefined
  ): string | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    return String(value);
  }

  private formatCoordinate(value: string | number | null | undefined): string {
    return value === null || value === undefined ? '' : String(value);
  }

  private sortUnits(units: UnidadMovil[]): UnidadMovil[] {
    return [...units].sort(
      (left, right) => right.id_unidad_movil - left.id_unidad_movil
    );
  }

  private watchStateAvailabilityRule(): void {
    this.unitForm.controls.estado.valueChanges.subscribe((estado) => {
      if (!estado && this.unitForm.controls.disponible.value) {
        this.unitForm.controls.disponible.setValue(false);
      }
    });
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
        'No tienes permisos para gestionar unidades moviles del taller.'
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
      'No se pudo completar la solicitud. Verifica tu conexion e intenta nuevamente.'
    );
  }
}
