import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyBadges } from './my-badges';

describe('MyBadges', () => {
  let component: MyBadges;
  let fixture: ComponentFixture<MyBadges>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyBadges]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyBadges);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
