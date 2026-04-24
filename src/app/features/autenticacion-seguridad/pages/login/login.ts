import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { TokenService } from '../../../../core/services/token.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private tokenService = inject(TokenService);
  private router = inject(Router);

  loading = false;
  errorMessage = '';
  showPassword = false;
  selectedAccess = 'cliente';

  readonly accessTypes = [
    { id: 'cliente', label: 'Cliente' },
    { id: 'taller', label: 'Taller' },
    { id: 'tecnico', label: 'Tecnico' },
    { id: 'admin', label: 'Admin' },
  ];

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  selectAccess(accessId: string): void {
    this.selectedAccess = accessId;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const payload = {
      email: this.form.value.email ?? '',
      password: this.form.value.password ?? '',
    };

    this.authService.login(payload).subscribe({
      next: (response) => {
        this.tokenService.setToken(response.access_token);
        this.loading = false;
        this.router.navigate(['/taller']);
      },
      error: (error) => {
        console.error('Error de login:', error);
        this.errorMessage = 'Credenciales inválidas o error de conexión.';
        this.loading = false;
      }
    });
  }
}
