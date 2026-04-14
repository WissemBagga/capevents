import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PendingEvents } from './pending-events';

describe('PendingEvents', () => {
  let component: PendingEvents;
  let fixture: ComponentFixture<PendingEvents>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PendingEvents]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PendingEvents);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
