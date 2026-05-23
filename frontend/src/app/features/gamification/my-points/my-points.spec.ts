import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyPoints } from './my-points';

describe('MyPoints', () => {
  let component: MyPoints;
  let fixture: ComponentFixture<MyPoints>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyPoints]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyPoints);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
