import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';

import { TokenService } from '../../../../core/services/token.service';
import { LoginRequest } from '../../models/login-request.model';
import { WorkshopType } from '../../models/workshop-type.model';
import { AuthService } from '../../services/auth.service';

declare global {
  interface Window {
    L?: LeafletNamespace;
  }
}

interface LeafletNamespace {
  map: (...args: unknown[]) => LeafletMap;
  tileLayer: (...args: unknown[]) => { addTo: (map: LeafletMap) => void };
  marker: (...args: unknown[]) => LeafletMarker;
  circle: (...args: unknown[]) => LeafletCircle;
}

interface LeafletMap {
  setView: (coords: [number, number], zoom: number) => LeafletMap;
  on: (event: string, handler: (event: LeafletMapEvent) => void) => void;
  remove: () => void;
}

interface LeafletMarker {
  addTo: (map: LeafletMap) => LeafletMarker;
  on: (event: string, handler: () => void) => void;
  setLatLng: (coords: [number, number]) => void;
  getLatLng: () => { lat: number; lng: number };
}

interface LeafletCircle {
  addTo: (map: LeafletMap) => LeafletCircle;
  setLatLng: (coords: [number, number]) => void;
  setRadius: (radius: number) => void;
}

interface LeafletMapEvent {
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

@Component({
  selector: 'app-register-workshop',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register-workshop.html',
  styleUrl: './register-workshop.scss',
})
export class RegisterWorkshop implements OnInit, AfterViewInit {
  private static leafletAssetsPromise: Promise<void> | null = null;

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('mapContainer') private mapContainer?: ElementRef<HTMLDivElement>;

  loadingCatalog = true;
  submitting = false;
  errorMessage = '';
  successMessage = '';
  workshopTypes: WorkshopType[] = [];
  locationStatus = 'Usaremos tu ubicacion actual como punto inicial.';
  searchResults: SearchResult[] = [];
  searchingAddress = false;
  locationReady = false;

  private map?: LeafletMap;
  private marker?: LeafletMarker;
  private coverageCircle?: LeafletCircle;
  private suppressAddressSearch = false;

  readonly form = this.fb.nonNullable.group({
    nombres: ['', Validators.required],
    apellidos: ['', Validators.required],
    celular: ['', [Validators.required, Validators.pattern(/^[0-9]{7,15}$/)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    id_tipo_taller: [0, [Validators.required, Validators.min(1)]],
    nombre_taller: ['', Validators.required],
    nit: ['', Validators.required],
    direccion: [DEFAULT_LOCATION.address, Validators.required],
    latitud: [DEFAULT_LOCATION.lat, Validators.required],
    longitud: [DEFAULT_LOCATION.lng, Validators.required],
    radio_cobertura_km: [15, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    this.loadWorkshopTypes();
    this.watchAddressSearch();
    this.watchCoverageRadius();
  }

  async ngAfterViewInit(): Promise<void> {
    await this.initializeMap();
  }

  loadWorkshopTypes(): void {
    this.loadingCatalog = true;
    this.authService
      .getWorkshopTypes()
      .pipe(finalize(() => (this.loadingCatalog = false)))
      .subscribe({
        next: (types) => {
          this.workshopTypes = types;
          if (types.length > 0) {
            this.form.patchValue({
              id_tipo_taller: types[0].id_tipo_taller,
            });
          }
        },
        error: () => {
          this.errorMessage =
            'No se pudo cargar el catalogo de tipos de taller.';
        },
      });
  }

  async useCurrentLocation(): Promise<void> {
    if (!navigator.geolocation) {
      this.locationStatus =
        'No pudimos obtener tu ubicacion. Puedes buscar la direccion manualmente.';
      return;
    }

    this.locationStatus = 'Obteniendo ubicacion actual...';

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        await this.setLocation(coords.latitude, coords.longitude, true);
        this.locationStatus =
          'Usaremos tu ubicacion actual como punto inicial. Puedes mover el pin si tu taller esta en otra direccion.';
      },
      () => {
        this.locationStatus =
          'No pudimos obtener tu ubicacion. Puedes buscar la direccion manualmente.';
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }

  async selectSearchResult(result: SearchResult): Promise<void> {
    this.searchResults = [];
    await this.setLocation(
      Number(result.lat),
      Number(result.lon),
      false,
      result.display_name
    );
    this.locationStatus =
      'Ubicacion actualizada desde la direccion seleccionada.';
  }

  onAddressFocus(): void {
    if (this.searchResults.length > 0) {
      return;
    }

    const query = this.form.controls.direccion.value.trim();
    if (query.length >= 3) {
      void this.searchAddress(query);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { latitud, longitud, radio_cobertura_km } = this.form.getRawValue();

    if (
      !Number.isFinite(latitud) ||
      !Number.isFinite(longitud) ||
      radio_cobertura_km <= 0
    ) {
      this.errorMessage =
        'Verifica la ubicacion y el radio de cobertura antes de continuar.';
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const credentials: LoginRequest = {
      email: this.form.getRawValue().email,
      password: this.form.getRawValue().password,
    };

    this.authService
      .registerWorkshop(this.form.getRawValue())
      .subscribe({
        next: () => {
          this.successMessage = 'Registro completado. Iniciando sesion...';
          this.autoLogin(credentials);
        },
        error: (error) => {
          this.submitting = false;
          this.errorMessage =
            error?.error?.detail ||
            'No se pudo registrar el taller. Verifica los datos e intenta nuevamente.';
        },
      });
  }

  private autoLogin(credentials: LoginRequest): void {
    this.authService.login(credentials).subscribe({
      next: (response) => {
        this.tokenService.setToken(response.access_token);
        this.router.navigate(['/taller']);
      },
      error: () => {
        this.submitting = false;
        this.successMessage =
          'El taller fue registrado, pero no se pudo iniciar sesion automaticamente.';
      },
    });
  }

  hasError(fieldName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[fieldName];
    return control.touched && control.invalid;
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
          this.searchResults = [];
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
      this.locationStatus =
        'No se pudo cargar el mapa. Puedes buscar la direccion manualmente.';
      return;
    }

    const L = window.L;
    if (!L) {
      this.locationStatus =
        'No se pudo cargar el mapa. Puedes completar la direccion manualmente.';
      return;
    }

    this.map = L.map(this.mapContainer.nativeElement).setView(
      [DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng],
      13
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);

    this.marker = L.marker([DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng], {
      draggable: true,
    }).addTo(this.map);

    this.coverageCircle = L.circle(
      [DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng],
      {
        radius: this.form.controls.radio_cobertura_km.value * 1000,
        color: '#1596f2',
        fillColor: '#1596f2',
        fillOpacity: 0.12,
      }
    ).addTo(this.map);

    this.marker.on('dragend', async () => {
      const currentPoint = this.marker?.getLatLng();
      if (currentPoint) {
        await this.setLocation(currentPoint.lat, currentPoint.lng, true);
        this.locationStatus =
          'Ubicacion actualizada manualmente desde el mapa.';
      }
    });

    this.map.on('click', async (event: LeafletMapEvent) => {
      await this.setLocation(event.latlng.lat, event.latlng.lng, true);
      this.locationStatus = 'Ubicacion actualizada desde el mapa.';
    });

    this.locationReady = true;
    await this.useCurrentLocation();
  }

  private async ensureLeafletAssets(): Promise<void> {
    if (window.L) {
      return;
    }

    if (!RegisterWorkshop.leafletAssetsPromise) {
      RegisterWorkshop.leafletAssetsPromise = new Promise<void>(
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

    await RegisterWorkshop.leafletAssetsPromise;
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
    this.searchingAddress = true;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=bo&limit=5&q=${encodeURIComponent(
          query
        )}`
      );
      const results = (await response.json()) as SearchResult[];
      this.searchResults = results;
    } catch {
      this.searchResults = [];
    } finally {
      this.searchingAddress = false;
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
