import { Injectable } from '@angular/core';

import { AuthMeResponse } from '../../features/autenticacion-seguridad/models/auth-me-response.model';

@Injectable({
  providedIn: 'root',
})
export class TokenService {
  private readonly TOKEN_KEY = 'autoassist_token';
  private readonly USER_KEY = 'autoassist_user';

  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  setCurrentUser(user: AuthMeResponse): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  getCurrentUser(): AuthMeResponse | null {
    const rawUser = localStorage.getItem(this.USER_KEY);
    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser) as AuthMeResponse;
    } catch {
      return null;
    }
  }

  clearToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  clearSession(): void {
    this.clearToken();
    localStorage.removeItem(this.USER_KEY);
    sessionStorage.clear();
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getUserRole(): string | null {
    const user = this.getCurrentUser();
    if (!user || !Array.isArray(user.roles) || user.roles.length === 0) {
      return null;
    }

    const [primaryRole] = user.roles;
    return primaryRole?.toLowerCase() ?? null;
  }

  getDashboardRoute(role: string | null): string | null {
    switch ((role ?? '').toLowerCase()) {
      case 'admin':
      case 'administrador':
        return '/admin';
      case 'taller':
        return '/taller';
      case 'cliente':
        return null;
      case 'tecnico':
      case 'técnico':
        return null;
      default:
        return null;
    }
  }
}
