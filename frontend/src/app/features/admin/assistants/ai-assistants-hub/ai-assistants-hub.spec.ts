import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiAssistantsHub } from './ai-assistants-hub';

describe('AiAssistantsHub', () => {
  let component: AiAssistantsHub;
  let fixture: ComponentFixture<AiAssistantsHub>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiAssistantsHub]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AiAssistantsHub);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
