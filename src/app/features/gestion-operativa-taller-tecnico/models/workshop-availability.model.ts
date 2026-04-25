export type WeekDay =
  | 'LUNES'
  | 'MARTES'
  | 'MIERCOLES'
  | 'JUEVES'
  | 'VIERNES'
  | 'SABADO'
  | 'DOMINGO';

export interface WorkshopSchedule {
  id_horario_disponibilidad?: number;
  dia_semana: WeekDay;
  hora_inicio: string;
  hora_fin: string;
  estado: boolean;
}

export interface WorkshopAvailability {
  id_taller: number;
  nombre_taller: string;
  disponible: boolean;
  direccion: string;
  latitud: number;
  longitud: number;
  radio_cobertura_km: number;
  fecha_registro: string;
  horarios: WorkshopSchedule[];
}

export interface UpdateWorkshopAvailabilityRequest {
  disponible: boolean;
  latitud?: number;
  longitud?: number;
  radio_cobertura_km?: number;
  horarios?: WorkshopSchedule[];
}
