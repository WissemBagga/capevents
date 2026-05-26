import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyInvitations } from './my-invitations';

describe('MyInvitations', () => {
  let component: MyInvitations;
  let fixture: ComponentFixture<MyInvitations>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyInvitations]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyInvitations);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
