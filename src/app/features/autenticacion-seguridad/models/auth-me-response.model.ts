export interface AuthMeResponse {
  id_usuario: number;
  nombres: string;
  apellidos: string;
  celular: string;
  email: string;
  estado: boolean;
  fecha_registro: string;
  roles: string[];
}
