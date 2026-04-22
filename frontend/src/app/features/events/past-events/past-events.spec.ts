import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PastEvents } from './past-events';

describe('PastEvents', () => {
  let component: PastEvents;
  let fixture: ComponentFixture<PastEvents>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PastEvents]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PastEvents);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
