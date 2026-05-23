import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiHrAssistantPanel } from './ai-hr-assistant-panel';

describe('AiHrAssistantPanel', () => {
  let component: AiHrAssistantPanel;
  let fixture: ComponentFixture<AiHrAssistantPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiHrAssistantPanel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AiHrAssistantPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
