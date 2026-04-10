import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyInterests } from './my-interests';

describe('MyInterests', () => {
  let component: MyInterests;
  let fixture: ComponentFixture<MyInterests>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyInterests]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyInterests);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
