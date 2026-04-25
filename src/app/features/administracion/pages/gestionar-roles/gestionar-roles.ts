import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, forkJoin, startWith } from 'rxjs';

import { TokenService } from '../../../../core/services/token.service';
import {
  RolResponse,
  UsuarioRolResponse,
} from '../../models/role-management.model';
import { RoleManagementService } from '../../services/role-management.service';

type StatusFilter = 'todos' | 'activos' | 'inactivos';

@Component({
  selector: 'app-gestionar-roles',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './gestionar-roles.html',
  styleUrl: './gestionar-roles.scss',
})
export class GestionarRoles implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly roleManagementService = inject(RoleManagementService);
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly rolesCatalog = signal<RolResponse[]>([]);
  readonly users = signal<UsuarioRolResponse[]>([]);
  readonly selectedUserId = signal<number | null>(null);

  readonly filtersForm = this.fb.nonNullable.group({
    search: [''],
    status: ['todos' as StatusFilter],
  });

  readonly roleForm = this.fb.nonNullable.group({
    roles: this.fb.nonNullable.control<string[]>([], {
      validators: [Validators.required],
    }),
  });

  private readonly filterValue = toSignal(
    this.filtersForm.valueChanges.pipe(startWith(this.filtersForm.getRawValue())),
    { initialValue: this.filtersForm.getRawValue() }
  );

  private readonly selectedRolesValue = toSignal(
    this.roleForm.controls.roles.valueChanges.pipe(
      startWith(this.roleForm.controls.roles.getRawValue())
    ),
    { initialValue: this.roleForm.controls.roles.getRawValue() }
  );

  readonly selectedUser = computed(() => {
    const userId = this.selectedUserId();
    return this.users().find((user) => user.id_usuario === userId) ?? null;
  });

  readonly filteredUsers = computed(() => {
    const filters = this.filterValue();
    const search = (filters.search ?? '').trim().toLowerCase();
    const status = filters.status;

    return this.users().filter((user) => {
      if (status === 'activos' && !user.estado) {
        return false;
      }

      if (status === 'inactivos' && user.estado) {
        return false;
      }

      if (!search) {
        return true;
      }

      const haystack = [
        user.nombres,
        user.apellidos,
        user.email,
        user.celular ?? '',
        user.roles.join(' '),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(search);
    });
  });

  readonly totalUsuarios = computed(() => this.users().length);
  readonly totalActivos = computed(
    () => this.users().filter((user) => user.estado).length
  );
  readonly totalAdmins = computed(
    () => this.users().filter((user) => user.roles.includes('ADMIN')).length
  );
  readonly totalMultirol = computed(
    () => this.users().filter((user) => user.roles.length > 1).length
  );
  readonly selectedRolesCount = computed(() => this.selectedRolesValue().length);
  readonly hasPendingChanges = computed(() => {
    const user = this.selectedUser();
    if (!user) {
      return false;
    }

    return !this.areRoleListsEqual(user.roles, this.selectedRolesValue());
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    const currentSelectedId = this.selectedUserId();

    this.loading.set(true);
    this.errorMessage.set('');

    forkJoin({
      roles: this.roleManagementService.getRoles(),
      users: this.roleManagementService.getUsuariosConRoles(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ roles, users }) => {
          this.rolesCatalog.set(roles);
          this.users.set(users);

          if (users.length === 0) {
            this.selectedUserId.set(null);
            this.roleForm.controls.roles.setValue([]);
            return;
          }

          const nextUser =
            users.find((user) => user.id_usuario === currentSelectedId) ?? users[0];

          this.selectUser(nextUser);
        },
        error: (error) => {
          this.handleHttpError(error, 'No se pudo cargar la gestion de roles.');
        },
      });
  }

  selectUser(user: UsuarioRolResponse): void {
    this.selectedUserId.set(user.id_usuario);
    this.roleForm.controls.roles.setValue(this.normalizeRoles(user.roles));
    this.roleForm.markAsPristine();
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  toggleRole(roleName: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const normalizedRole = roleName.trim().toUpperCase();
    const currentRoles = this.normalizeRoles(this.roleForm.controls.roles.getRawValue());

    const nextRoles = checked
      ? this.normalizeRoles([...currentRoles, normalizedRole])
      : currentRoles.filter((role) => role !== normalizedRole);

    this.roleForm.controls.roles.setValue(nextRoles);
    this.roleForm.controls.roles.markAsDirty();
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  cancelEdit(): void {
    const user = this.selectedUser();
    if (!user) {
      return;
    }

    this.roleForm.controls.roles.setValue(this.normalizeRoles(user.roles));
    this.roleForm.markAsPristine();
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  saveRoles(): void {
    const user = this.selectedUser();
    const roles = this.normalizeRoles(this.roleForm.controls.roles.getRawValue());

    if (!user) {
      this.errorMessage.set('Selecciona un usuario antes de guardar cambios.');
      return;
    }

    if (roles.length === 0) {
      this.errorMessage.set('Debes seleccionar al menos un rol valido.');
      return;
    }

    if (new Set(roles).size !== roles.length) {
      this.errorMessage.set('No puedes enviar roles duplicados.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.roleManagementService
      .actualizarRolesUsuario(user.id_usuario, roles)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response) => {
          const updatedRoles = this.normalizeRoles(response.roles);

          this.users.update((currentUsers) =>
            currentUsers.map((currentUser) =>
              currentUser.id_usuario === response.id_usuario
                ? { ...currentUser, roles: updatedRoles }
                : currentUser
            )
          );

          this.roleForm.controls.roles.setValue(updatedRoles);
          this.roleForm.markAsPristine();
          this.successMessage.set(
            `${response.mensaje} El cambio fue registrado en bitacora.`
          );
        },
        error: (error) => {
          this.handleHttpError(
            error,
            'No se pudieron actualizar los roles del usuario.'
          );
        },
      });
  }

  isRoleSelected(roleName: string): boolean {
    return this.selectedRolesValue().includes(roleName.trim().toUpperCase());
  }

  trackRole(_: number, role: RolResponse): number {
    return role.id_rol;
  }

  trackUser(_: number, user: UsuarioRolResponse): number {
    return user.id_usuario;
  }

  getFullName(user: UsuarioRolResponse): string {
    return `${user.nombres} ${user.apellidos}`.trim();
  }

  getInitials(user: UsuarioRolResponse): string {
    return `${user.nombres.charAt(0)}${user.apellidos.charAt(0)}`.toUpperCase();
  }

  getStatusLabel(estado: boolean): string {
    return estado ? 'Activo' : 'Inactivo';
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'ADMIN':
        return 'role-pill role-pill--admin';
      case 'CLIENTE':
        return 'role-pill role-pill--cliente';
      case 'TALLER':
        return 'role-pill role-pill--taller';
      case 'TECNICO':
        return 'role-pill role-pill--tecnico';
      default:
        return 'role-pill';
    }
  }

  private normalizeRoles(roles: string[]): string[] {
    return [
      ...new Set(
        roles.map((role) => role.trim().toUpperCase()).filter(Boolean)
      ),
    ].sort();
  }

  private areRoleListsEqual(left: string[], right: string[]): boolean {
    const normalizedLeft = this.normalizeRoles(left);
    const normalizedRight = this.normalizeRoles(right);

    return (
      normalizedLeft.length === normalizedRight.length &&
      normalizedLeft.every((role, index) => role === normalizedRight[index])
    );
  }

  private handleHttpError(error: unknown, fallbackMessage: string): void {
    const httpError = error as {
      status?: number;
      error?: { detail?: string };
    };

    if (httpError?.status === 401) {
      this.tokenService.clearSession();
      void this.router.navigate(['/login']);
      return;
    }

    if (httpError?.status === 403) {
      this.errorMessage.set(
        'No tienes permisos suficientes para gestionar roles de usuario.'
      );
      return;
    }

    if (
      httpError?.status === 400 ||
      httpError?.status === 404 ||
      httpError?.status === 422
    ) {
      this.errorMessage.set(httpError.error?.detail ?? fallbackMessage);
      return;
    }

    this.errorMessage.set(
      'No se pudo completar la solicitud. Verifica tu conexion e intenta nuevamente.'
    );
  }
}
