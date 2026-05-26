import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PremiumBackground } from './premium-background';

describe('PremiumBackground', () => {
  let component: PremiumBackground;
  let fixture: ComponentFixture<PremiumBackground>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PremiumBackground]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PremiumBackground);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
