import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubmitEvent } from './submit-event';

describe('SubmitEvent', () => {
  let component: SubmitEvent;
  let fixture: ComponentFixture<SubmitEvent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubmitEvent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubmitEvent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
