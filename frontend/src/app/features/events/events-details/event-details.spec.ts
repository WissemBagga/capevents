import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventsDetails } from './events-details';

describe('EventsDetails', () => {
  let component: EventsDetails;
  let fixture: ComponentFixture<EventsDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventsDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventsDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
