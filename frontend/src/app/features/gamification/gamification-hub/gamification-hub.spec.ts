import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GamificationHub } from './gamification-hub';

describe('GamificationHub', () => {
  let component: GamificationHub;
  let fixture: ComponentFixture<GamificationHub>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GamificationHub]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GamificationHub);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
