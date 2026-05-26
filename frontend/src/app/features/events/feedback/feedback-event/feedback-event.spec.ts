import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeedbackEvent } from './feedback-event';

describe('FeedbackEvent', () => {
  let component: FeedbackEvent;
  let fixture: ComponentFixture<FeedbackEvent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeedbackEvent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeedbackEvent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
