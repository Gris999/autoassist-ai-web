export interface UnidadMovil {
  id_unidad_movil: number;
  id_taller: number;
  placa: string;
  tipo_unidad: string;
  disponible: boolean;
  estado: boolean;
  latitud_actual?: string | number | null;
  longitud_actual?: string | number | null;
}

export interface CrearUnidadMovilRequest {
  placa: string;
  tipo_unidad: string;
  disponible: boolean;
  estado: boolean;
  latitud_actual?: string | number | null;
  longitud_actual?: string | number | null;
}

export interface ActualizarUnidadMovilRequest {
  placa?: string;
  tipo_unidad?: string;
  disponible?: boolean;
  estado?: boolean;
  latitud_actual?: string | number | null;
  longitud_actual?: string | number | null;
}

export interface ActualizarDisponibilidadUnidadMovilRequest {
  disponible?: boolean;
  estado?: boolean;
}
