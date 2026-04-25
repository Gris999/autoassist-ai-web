import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { TokenService } from '../../../../core/services/token.service';
import {
  UpdateWorkshopAvailabilityRequest,
  WeekDay,
  WorkshopAvailability,
  WorkshopSchedule,
} from '../../models/workshop-availability.model';
import { WorkshopOperationalService } from '../../services/workshop-operational.service';

interface AvailabilityLeafletNamespace {
  map: (...args: unknown[]) => AvailabilityLeafletMap;
  tileLayer: (...args: unknown[]) => { addTo: (map: AvailabilityLeafletMap) => void };
  marker: (...args: unknown[]) => AvailabilityLeafletMarker;
  circle: (...args: unknown[]) => AvailabilityLeafletCircle;
}

interface AvailabilityLeafletMap {
  setView: (coords: [number, number], zoom: number) => AvailabilityLeafletMap;
  on: (event: string, handler: (event: AvailabilityLeafletMapEvent) => void) => void;
  invalidateSize?: () => void;
  remove: () => void;
}

interface AvailabilityLeafletMarker {
  addTo: (map: AvailabilityLeafletMap) => AvailabilityLeafletMarker;
  on: (event: string, handler: () => void) => void;
  setLatLng: (coords: [number, number]) => void;
  getLatLng: () => { lat: number; lng: number };
}

interface AvailabilityLeafletCircle {
  addTo: (map: AvailabilityLeafletMap) => AvailabilityLeafletCircle;
  setLatLng: (coords: [number, number]) => void;
  setRadius: (radius: number) => void;
}

interface AvailabilityLeafletMapEvent {
  latlng: {
    lat: number;
    lng: number;
  };
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

const DEFAULT_LOCATION = {
  address: 'La Paz, Bolivia',
  lat: -16.4897,
  lng: -68.1193,
};

type ScheduleFormGroup = FormGroup<{
  dia_semana: FormControl<WeekDay>;
  hora_inicio: FormControl<string>;
  hora_fin: FormControl<string>;
  estado: FormControl<boolean>;
}>;

@Component({
  selector: 'app-disponibilidad-taller',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './disponibilidad-taller.html',
  styleUrl: './disponibilidad-taller.scss',
})
export class DisponibilidadTaller implements OnInit, AfterViewInit {
  private static leafletAssetsPromise: Promise<void> | null = null;

  private readonly workshopOperationalService = inject(WorkshopOperationalService);
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('mapContainer') private mapContainer?: ElementRef<HTMLDivElement>;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly workshopAvailability = signal<WorkshopAvailability | null>(null);
  readonly locationStatus = signal(
    'Ajusta el punto base del taller en el mapa o usa tu ubicacion actual.'
  );
  readonly searchResults = signal<SearchResult[]>([]);
  readonly searchingAddress = signal(false);
  readonly locationReady = signal(false);
  readonly locationEditorOpen = signal(false);
  readonly manualMapOpen = signal(false);
  readonly scheduleEditorOpen = signal(false);
  readonly scheduleSummaryOpen = signal(false);

  readonly weekDays: WeekDay[] = [
    'LUNES',
    'MARTES',
    'MIERCOLES',
    'JUEVES',
    'VIERNES',
    'SABADO',
    'DOMINGO',
  ];

  readonly bulkScheduleForm = this.fb.nonNullable.group({
    hora_inicio: ['08:00:00', Validators.required],
    hora_fin: ['18:00:00', Validators.required],
    estado: [true],
  });

  readonly selectedBulkDays = signal<WeekDay[]>([...this.weekDays]);

  private map?: AvailabilityLeafletMap;
  private marker?: AvailabilityLeafletMarker;
  private coverageCircle?: AvailabilityLeafletCircle;
  private suppressAddressSearch = false;

  readonly form = this.fb.nonNullable.group({
    disponible: [false],
    direccion: [DEFAULT_LOCATION.address, Validators.required],
    latitud: [DEFAULT_LOCATION.lat, Validators.required],
    longitud: [DEFAULT_LOCATION.lng, Validators.required],
    radio_cobertura_km: [15, [Validators.required, Validators.min(1)]],
    horarios: this.fb.array([]),
  });

  get horarios(): FormArray {
    return this.form.controls.horarios as FormArray;
  }

  get scheduleControls(): ScheduleFormGroup[] {
    return this.horarios.controls as ScheduleFormGroup[];
  }

  get availabilityMessage(): string {
    return this.form.controls.disponible.value
      ? 'Disponible para recibir solicitudes'
      : 'No disponible temporalmente';
  }

  get coverageSummary(): string {
    return `${this.form.controls.radio_cobertura_km.value} km de cobertura`;
  }

  get activeDaysCount(): number {
    return this.activeScheduleSummary.length;
  }

  get activeScheduleSummary(): Array<{ day: WeekDay; ranges: string[] }> {
    const grouped = new Map<WeekDay, string[]>();

    for (const schedule of this.horarios.getRawValue() as WorkshopSchedule[]) {
      if (!schedule.estado) {
        continue;
      }

      const ranges = grouped.get(schedule.dia_semana as WeekDay) ?? [];
      ranges.push(
        `${schedule.hora_inicio.slice(0, 5)} - ${schedule.hora_fin.slice(0, 5)}`
      );
      grouped.set(schedule.dia_semana as WeekDay, ranges);
    }

    return this.weekDays
      .filter((day) => grouped.has(day))
      .map((day) => ({
        day,
        ranges: grouped.get(day) ?? [],
      }));
  }

  ngOnInit(): void {
    this.watchAddressSearch();
    this.watchCoverageRadius();
    this.loadAvailability();
  }

  async ngAfterViewInit(): Promise<void> {
    return;
  }

  addSchedule(schedule?: Partial<WorkshopSchedule>): void {
    this.horarios.push(
      this.fb.nonNullable.group({
        dia_semana: [schedule?.dia_semana ?? 'LUNES', Validators.required],
        hora_inicio: [schedule?.hora_inicio ?? '08:00:00', Validators.required],
        hora_fin: [schedule?.hora_fin ?? '12:00:00', Validators.required],
        estado: [schedule?.estado ?? true],
      }) as ScheduleFormGroup
    );
  }

  removeSchedule(index: number): void {
    this.horarios.removeAt(index);
  }

  toggleBulkDay(day: WeekDay): void {
    const selectedDays = this.selectedBulkDays();
    const nextDays = selectedDays.includes(day)
      ? selectedDays.filter((currentDay) => currentDay !== day)
      : [...selectedDays, day];

    this.selectedBulkDays.set(nextDays);
  }

  selectAllDays(): void {
    this.selectedBulkDays.set([...this.weekDays]);
  }

  clearSelectedDays(): void {
    this.selectedBulkDays.set([]);
  }

  applyScheduleToSelectedDays(): void {
    this.errorMessage.set('');

    const selectedDays = this.selectedBulkDays();
    if (selectedDays.length === 0) {
      this.errorMessage.set('Selecciona al menos un dia para aplicar el horario.');
      return;
    }

    const { hora_inicio, hora_fin, estado } = this.bulkScheduleForm.getRawValue();
    if (this.toMinutes(hora_inicio) >= this.toMinutes(hora_fin)) {
      this.errorMessage.set(
        'El horario rapido debe tener una hora de inicio menor a la hora de fin.'
      );
      return;
    }

    for (const day of selectedDays) {
      this.replaceDaySchedules(day, {
        dia_semana: day,
        hora_inicio,
        hora_fin,
        estado,
      });
    }
  }

  async useCurrentLocation(): Promise<void> {
    if (!navigator.geolocation) {
      this.locationStatus.set(
        'No pudimos obtener tu ubicacion. Puedes mover el pin o buscar otra direccion.'
      );
      return;
    }

    this.locationStatus.set('Obteniendo ubicacion actual...');

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        await this.setLocation(coords.latitude, coords.longitude, true);
        this.locationStatus.set(
          'Ubicacion actual tomada como referencia. Puedes mover el pin si el taller opera desde otro punto.'
        );
      },
      () => {
        this.locationStatus.set(
          'No pudimos obtener tu ubicacion. Puedes buscar la direccion manualmente.'
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }

  async selectSearchResult(result: SearchResult): Promise<void> {
    this.searchResults.set([]);
    await this.setLocation(
      Number(result.lat),
      Number(result.lon),
      false,
      result.display_name
    );
    this.locationStatus.set('Ubicacion operativa actualizada desde la direccion seleccionada.');
  }

  onAddressFocus(): void {
    if (this.searchResults().length > 0) {
      return;
    }

    const query = this.form.controls.direccion.value.trim();
    if (query.length >= 3) {
      void this.searchAddress(query);
    }
  }

  openLocationEditor(): void {
    this.locationEditorOpen.set(true);
  }

  closeLocationEditor(): void {
    this.locationEditorOpen.set(false);
    this.manualMapOpen.set(false);
    this.searchResults.set([]);
  }

  async openManualMap(): Promise<void> {
    this.manualMapOpen.set(true);
    await this.waitForPaint();

    if (!this.map) {
      await this.initializeMap();
      return;
    }

    this.map.invalidateSize?.();
    this.map.setView(
      [this.form.controls.latitud.value, this.form.controls.longitud.value],
      15
    );
  }

  openScheduleEditor(): void {
    this.scheduleEditorOpen.set(true);
  }

  closeScheduleEditor(): void {
    this.scheduleEditorOpen.set(false);
  }

  toggleScheduleSummary(): void {
    this.scheduleSummaryOpen.update((value) => !value);
  }

  saveAvailability(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set(
        'Revisa la cobertura y completa correctamente los datos requeridos.'
      );
      return;
    }

    const validationError = this.validateSchedules();
    if (validationError) {
      this.errorMessage.set(validationError);
      return;
    }

    const rawValue = this.form.getRawValue();
    const payload: UpdateWorkshopAvailabilityRequest = {
      disponible: rawValue.disponible,
      latitud: rawValue.latitud,
      longitud: rawValue.longitud,
      radio_cobertura_km: rawValue.radio_cobertura_km,
      horarios: rawValue.horarios as WorkshopSchedule[],
    };

    this.saving.set(true);

    this.workshopOperationalService.updateAvailability(payload).subscribe({
      next: (response) => {
        this.applyAvailabilityToForm(response);
        this.workshopAvailability.set(response);
        this.successMessage.set('Disponibilidad guardada correctamente.');
        this.saving.set(false);
      },
      error: (error) => {
        this.saving.set(false);

        if (error?.status === 401) {
          this.tokenService.clearSession();
          this.router.navigate(['/login']);
          return;
        }

        if (error?.status === 403) {
          this.errorMessage.set(
            'No tienes permisos para actualizar la disponibilidad del taller.'
          );
          return;
        }

        if (error?.status === 400) {
          this.errorMessage.set(
            error?.error?.detail ||
              'Los datos enviados no son validos. Revisa horarios y cobertura.'
          );
          return;
        }

        this.errorMessage.set(
          'No se pudo guardar la disponibilidad. Intenta nuevamente.'
        );
      },
    });
  }

  trackByIndex(index: number): number {
    return index;
  }

  private loadAvailability(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.workshopOperationalService.getAvailability().subscribe({
      next: (response) => {
        this.workshopAvailability.set(response);
        this.applyAvailabilityToForm(response);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);

        if (error?.status === 401) {
          this.tokenService.clearSession();
          this.router.navigate(['/login']);
          return;
        }

        if (error?.status === 403) {
          this.errorMessage.set(
            'No tienes permisos para consultar la disponibilidad del taller.'
          );
          return;
        }

        this.errorMessage.set(
          'No pudimos cargar la disponibilidad actual del taller.'
        );
      },
    });
  }

  private applyAvailabilityToForm(availability: WorkshopAvailability): void {
    this.form.patchValue({
      disponible: availability.disponible,
      direccion: availability.direccion,
      latitud: availability.latitud,
      longitud: availability.longitud,
      radio_cobertura_km: availability.radio_cobertura_km,
    });

    this.horarios.clear();
    for (const schedule of availability.horarios ?? []) {
      this.addSchedule(schedule);
    }

    void this.setLocation(
      availability.latitud,
      availability.longitud,
      false,
      availability.direccion
    );
  }

  private validateSchedules(): string | null {
    const { latitud, longitud, radio_cobertura_km, horarios } =
      this.form.getRawValue();

    if (
      (latitud === null && longitud !== null) ||
      (latitud !== null && longitud === null)
    ) {
      return 'Latitud y longitud deben enviarse juntas.';
    }

    if (radio_cobertura_km <= 0) {
      return 'El radio de cobertura debe ser mayor que 0.';
    }

    const groupedByDay = new Map<WeekDay, Array<{ start: number; end: number }>>();

    for (const schedule of horarios as WorkshopSchedule[]) {
      const start = this.toMinutes(schedule.hora_inicio);
      const end = this.toMinutes(schedule.hora_fin);

      if (start >= end) {
        return `El horario ${schedule.dia_semana} tiene una hora de inicio mayor o igual a la hora de fin.`;
      }

      const daySchedules = groupedByDay.get(schedule.dia_semana as WeekDay) ?? [];
      daySchedules.push({ start, end });
      groupedByDay.set(schedule.dia_semana as WeekDay, daySchedules);
    }

    for (const [day, ranges] of groupedByDay.entries()) {
      const sortedRanges = [...ranges].sort((a, b) => a.start - b.start);
      for (let index = 1; index < sortedRanges.length; index++) {
        if (sortedRanges[index].start < sortedRanges[index - 1].end) {
          return `Hay horarios solapados en ${day}.`;
        }
      }
    }

    return null;
  }

  private toMinutes(time: string): number {
    const [hours = '0', minutes = '0'] = time.split(':');
    return Number(hours) * 60 + Number(minutes);
  }

  private replaceDaySchedules(day: WeekDay, schedule: WorkshopSchedule): void {
    const indexesToRemove: number[] = [];

    this.scheduleControls.forEach((control, index) => {
      if (control.controls.dia_semana.value === day) {
        indexesToRemove.push(index);
      }
    });

    for (const index of indexesToRemove.reverse()) {
      this.horarios.removeAt(index);
    }

    this.addSchedule(schedule);
  }

  private watchAddressSearch(): void {
    this.form.controls.direccion.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((query) => {
        if (this.suppressAddressSearch) {
          return;
        }

        const normalizedQuery = query.trim();
        if (normalizedQuery.length < 3) {
          this.searchResults.set([]);
          return;
        }

        void this.searchAddress(normalizedQuery);
      });
  }

  private watchCoverageRadius(): void {
    this.form.controls.radio_cobertura_km.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((radius) => {
        if (this.coverageCircle && radius > 0) {
          this.coverageCircle.setRadius(radius * 1000);
        }
      });
  }

  private async initializeMap(): Promise<void> {
    if (!this.mapContainer) {
      return;
    }

    try {
      await this.ensureLeafletAssets();
    } catch {
      this.locationStatus.set(
        'No se pudo cargar el mapa. Puedes seguir ajustando la cobertura manualmente.'
      );
      return;
    }

    const L = (window as Window & { L?: AvailabilityLeafletNamespace }).L;
    if (!L) {
      this.locationStatus.set(
        'No se pudo cargar el mapa. Puedes seguir ajustando la cobertura manualmente.'
      );
      return;
    }

    const initialLat = this.form.controls.latitud.value;
    const initialLng = this.form.controls.longitud.value;

    const map = L.map(this.mapContainer.nativeElement).setView(
      [initialLat, initialLng],
      13
    );
    this.map = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    this.marker = L.marker([initialLat, initialLng], {
      draggable: true,
    }).addTo(map);

    this.coverageCircle = L.circle([initialLat, initialLng], {
      radius: this.form.controls.radio_cobertura_km.value * 1000,
      color: '#1596f2',
      fillColor: '#1596f2',
      fillOpacity: 0.12,
    }).addTo(map);

    this.marker.on('dragend', async () => {
      const currentPoint = this.marker?.getLatLng();
      if (currentPoint) {
        await this.setLocation(currentPoint.lat, currentPoint.lng, true);
        this.locationStatus.set('Ubicacion operativa actualizada desde el mapa.');
      }
    });

    map.on('click', async (event: AvailabilityLeafletMapEvent) => {
      await this.setLocation(event.latlng.lat, event.latlng.lng, true);
      this.locationStatus.set('Ubicacion operativa actualizada desde el mapa.');
    });

    this.locationReady.set(true);
  }

  private waitForPaint(): Promise<void> {
    return new Promise((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }

  private async ensureLeafletAssets(): Promise<void> {
    if ((window as Window & { L?: AvailabilityLeafletNamespace }).L) {
      return;
    }

    if (!DisponibilidadTaller.leafletAssetsPromise) {
      DisponibilidadTaller.leafletAssetsPromise = new Promise<void>(
        (resolve, reject) => {
          this.appendLeafletStylesheet();

          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Leaflet load failed'));
          document.body.appendChild(script);
        }
      );
    }

    await DisponibilidadTaller.leafletAssetsPromise;
  }

  private appendLeafletStylesheet(): void {
    if (document.getElementById('leaflet-stylesheet')) {
      return;
    }

    const link = document.createElement('link');
    link.id = 'leaflet-stylesheet';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }

  private async searchAddress(query: string): Promise<void> {
    this.searchingAddress.set(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=bo&limit=5&q=${encodeURIComponent(
          query
        )}`
      );
      const results = (await response.json()) as SearchResult[];
      this.searchResults.set(results);
    } catch {
      this.searchResults.set([]);
    } finally {
      this.searchingAddress.set(false);
    }
  }

  private async setLocation(
    latitude: number,
    longitude: number,
    useReverseGeocoding: boolean,
    fallbackAddress?: string
  ): Promise<void> {
    this.form.patchValue({
      latitud: Number(latitude.toFixed(6)),
      longitud: Number(longitude.toFixed(6)),
    });

    this.marker?.setLatLng([latitude, longitude]);
    this.coverageCircle?.setLatLng([latitude, longitude]);
    this.map?.setView([latitude, longitude], 15);

    let resolvedAddress = fallbackAddress ?? this.form.controls.direccion.value;

    if (useReverseGeocoding) {
      const reverseAddress = await this.reverseGeocode(latitude, longitude);
      if (reverseAddress) {
        resolvedAddress = reverseAddress;
      }
    }

    this.suppressAddressSearch = true;
    this.form.patchValue({
      direccion: resolvedAddress,
    });
    this.suppressAddressSearch = false;
  }

  private async reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<string | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
      );
      const result = (await response.json()) as { display_name?: string };
      return result.display_name ?? null;
    } catch {
      return null;
    }
  }
}
