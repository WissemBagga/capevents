import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiPlanningPanel } from './ai-planning-panel';

describe('AiPlanningPanel', () => {
  let component: AiPlanningPanel;
  let fixture: ComponentFixture<AiPlanningPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiPlanningPanel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AiPlanningPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
