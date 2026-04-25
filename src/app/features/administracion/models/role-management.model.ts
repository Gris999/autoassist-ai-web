export interface RolResponse {
  id_rol: number;
  nombre: string;
  descripcion?: string | null;
}

export interface UsuarioRolResponse {
  id_usuario: number;
  nombres: string;
  apellidos: string;
  celular?: string | null;
  email: string;
  estado: boolean;
  fecha_registro: string;
  roles: string[];
}

export interface ActualizarRolesRequest {
  roles: string[];
}

export interface ActualizarRolesResponse {
  id_usuario: number;
  roles: string[];
  mensaje: string;
}

export interface BitacoraUsuario {
  id_usuario: number;
  nombres: string;
  apellidos: string;
  email: string;
}

export interface BitacoraResponse {
  id_bitacora: number;
  id_usuario?: number | null;
  fecha_hora: string;
  usuario?: BitacoraUsuario | null;
  accion: string;
  modulo: string;
  descripcion?: string | null;
  ip_origen?: string | null;
}

export interface BitacoraFiltros {
  fecha_inicio?: string;
  fecha_fin?: string;
  id_usuario?: number | null;
  modulo?: string;
  accion?: string;
}
