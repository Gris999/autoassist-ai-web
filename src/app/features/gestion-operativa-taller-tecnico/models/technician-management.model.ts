export interface TecnicoResumen {
  id_tecnico: number;
  id_usuario: number;
  nombres: string;
  apellidos: string;
  email: string;
  celular: string;
  telefono_contacto: string;
  disponible: boolean;
  estado: boolean;
}

export interface TecnicoDetalle extends TecnicoResumen {
  id_taller: number;
  latitud_actual?: number | null;
  longitud_actual?: number | null;
}

export interface CrearTecnicoRequest {
  nombres: string;
  apellidos: string;
  celular: string;
  email: string;
  password: string;
  telefono_contacto: string;
  disponible: boolean;
  estado: boolean;
}

export interface ActualizarTecnicoRequest {
  nombres?: string;
  apellidos?: string;
  celular?: string;
  email?: string;
  telefono_contacto?: string;
  disponible?: boolean;
}

export interface CambiarEstadoTecnicoResponse {
  id_tecnico: number;
  id_usuario: number;
  estado: boolean;
  disponible: boolean;
}

export interface DisponibilidadTecnicoResponse {
  id_tecnico: number;
  id_usuario: number;
  disponible: boolean;
  estado: boolean;
  latitud_actual?: number | null;
  longitud_actual?: number | null;
}

export interface ActualizarDisponibilidadTecnicoRequest {
  disponible: boolean;
}

export interface Especialidad {
  id_especialidad: number;
  nombre: string;
  descripcion?: string | null;
}

export interface EspecialidadesTecnicoResponse {
  id_tecnico: number;
  especialidades: Especialidad[];
}

export interface EspecialidadesRequest {
  ids_especialidad: number[];
}
