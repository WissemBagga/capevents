import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyRewards } from './my-rewards';

describe('MyRewards', () => {
  let component: MyRewards;
  let fixture: ComponentFixture<MyRewards>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyRewards]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyRewards);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
