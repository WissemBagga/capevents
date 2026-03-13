import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditEvent } from './edit-event';

describe('EditEvent', () => {
  let component: EditEvent;
  let fixture: ComponentFixture<EditEvent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditEvent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditEvent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
