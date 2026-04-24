export interface RegisterWorkshopRequest {
  nombres: string;
  apellidos: string;
  celular: string;
  email: string;
  password: string;
  id_tipo_taller: number;
  nombre_taller: string;
  nit: string;
  direccion: string;
  latitud: number;
  longitud: number;
  radio_cobertura_km: number;
}
