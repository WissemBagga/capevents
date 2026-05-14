import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingsHub } from './settings-hub';

describe('SettingsHub', () => {
  let component: SettingsHub;
  let fixture: ComponentFixture<SettingsHub>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsHub]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SettingsHub);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
