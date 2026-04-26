import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminRewardRequests } from './admin-reward-requests';

describe('AdminRewardRequests', () => {
  let component: AdminRewardRequests;
  let fixture: ComponentFixture<AdminRewardRequests>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminRewardRequests]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminRewardRequests);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
