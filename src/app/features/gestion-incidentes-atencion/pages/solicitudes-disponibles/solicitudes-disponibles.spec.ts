import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { SolicitudesDisponibles } from './solicitudes-disponibles';

describe('SolicitudesDisponibles', () => {
  let component: SolicitudesDisponibles;
  let fixture: ComponentFixture<SolicitudesDisponibles>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolicitudesDisponibles],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SolicitudesDisponibles);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
