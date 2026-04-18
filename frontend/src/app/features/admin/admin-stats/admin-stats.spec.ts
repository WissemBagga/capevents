import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminStats } from './admin-stats';

describe('AdminStats', () => {
  let component: AdminStats;
  let fixture: ComponentFixture<AdminStats>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminStats]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminStats);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
