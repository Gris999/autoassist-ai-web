export interface RegisterWorkshopResponse {
  usuario: {
    id_usuario: number;
    nombres: string;
    apellidos: string;
    celular: string;
    email: string;
    estado: boolean;
    fecha_registro: string;
  };
  rol: string;
  nombre_taller: string;
}
