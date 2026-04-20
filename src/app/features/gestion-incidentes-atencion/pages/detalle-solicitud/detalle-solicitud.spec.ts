import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalleSolicitud } from './detalle-solicitud';

describe('DetalleSolicitud', () => {
  let component: DetalleSolicitud;
  let fixture: ComponentFixture<DetalleSolicitud>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalleSolicitud],
    }).compileComponents();

    fixture = TestBed.createComponent(DetalleSolicitud);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
