import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { ForgotPassword } from './features/auth/forgot-password/forgot-password';
import { ResetPassword } from './features/auth/reset-password/reset-password';
import { EventsList } from './features/events/events-list/events-list';
import { authGuard } from './core/guards/auth-guard';
import { EventDetails } from './features/events/events-details/event-details';
import { roleGuard } from './core/guards/role-guard';
import { EmployeeDashboard } from './features/events/employee-dashboard/employee-dashboard';
import { AdminDashboard } from './features/admin/admin-dashboard/admin-dashboard';
import {AdminStats} from './features/admin/analytics/admin-stats/admin-stats';
import { CreateEvent } from './features/admin/create-event/create-event';
import { EditEvent } from './features/admin/edit-event/edit-event';
import { AppShell } from './shared/layout/app-shell/app-shell';
import { VerifyEmail } from './features/auth/verify-email/verify-email';
import { VerifyEmailPending } from './features/auth/verify-email-pending/verify-email-pending';
import { AdminEventDetails } from './features/admin/admin-event-details/admin-event-details';
import {MyEvents} from './features/events/my-events/my-events'

import { MyInvitations } from './features/invitations/my-invitations/my-invitations'
import { SubmitEvent } from './features/submissions/new/submit-event/submit-event';
import { PendingEvents } from './features/admin/pending-events/pending-events';

import { MySubmissions } from './features/submissions/my-submissions/my-submissions';

import { FeedbackEvent } from './features/events/feedback-event/feedback-event';

import { MyPoints } from './features/points/my-points/my-points';

import { MyInterests } from './features/interests/my-interests/my-interests';

import { MyProfile } from './features/profile/my-profile/my-profile';

import { Forbidden } from './features/errors/forbidden/forbidden';
import { NotFound } from './features/errors/not-found/not-found';


import { AdminDepartments } from './features/admin/departments/admin-departments/admin-departments';
import { AdminUsers } from './features/admin/users/admin-users/admin-users';

import { PastEvents } from './features/events/past-events/past-events';

import { MyBadges } from './features/gamification/my-badges/my-badges';

import { MyRewards } from './features/rewards/my-rewards/my-rewards';

import { AdminRewardRequests } from './features/admin/admin-reward-requests/admin-reward-requests';

import { EventCalendar } from './features/calendar/event-calendar/event-calendar';

import { LandingPage } from './features/landing/landing-page/landing-page';



export const routes: Routes = [
  { path: '', component: LandingPage},

  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'forgot-password', component: ForgotPassword },
  { path: 'reset-password', component: ResetPassword },
  { path: 'verify-email-pending', component: VerifyEmailPending },
  { path: 'verify-email', component: VerifyEmail },

  { path: 'forbidden', component: Forbidden },
  { path: 'not-found', component: NotFound },

  {
    path: '',
    component: AppShell,
    canActivate: [authGuard],
    children: [
      { path: 'events', component: EventsList },
      { path: 'events/past', component: PastEvents },
      { path: 'events/:id', component: EventDetails },
      { path: 'events/:id/feedback', component: FeedbackEvent },

      { path: 'dashboard/employee', component: EmployeeDashboard, canActivate: [roleGuard], data: { roles: ['ROLE_EMPLOYEE'] } },

      { path: 'admin/hr', component: AdminDashboard, canActivate: [roleGuard], data: { roles: ['ROLE_HR'] } },
      { path: 'admin/manager', component: AdminDashboard, canActivate: [roleGuard], data: { roles: ['ROLE_MANAGER'] } },
      { path: 'admin/hr/stats', component: AdminStats, canActivate: [roleGuard], data: { roles: ['ROLE_HR'] } },
      { path: 'admin/manager/stats', component: AdminStats, canActivate: [roleGuard], data: { roles: ['ROLE_MANAGER'] } },

      { path: 'admin/create-event', component: CreateEvent, canActivate: [roleGuard], data: { roles: ['ROLE_HR', 'ROLE_MANAGER'] } },
      { path: 'admin/edit-event/:id', component: EditEvent, canActivate: [roleGuard], data: { roles: ['ROLE_HR', 'ROLE_MANAGER'] } },
      { path: 'admin/pending-events', component: PendingEvents, canActivate: [roleGuard], data: { roles: ['ROLE_HR', 'ROLE_MANAGER'] } },
      { path: 'admin/admin-departments', component: AdminDepartments, canActivate: [roleGuard], data: { roles: ['ROLE_HR'] } },
      { path: 'admin/admin-users', component: AdminUsers, canActivate: [roleGuard], data: { roles: ['ROLE_HR'] } },

      { path: 'my-events', component: MyEvents },
      { path: 'my-invitations', component: MyInvitations },
      { path: 'my-submissions', component: MySubmissions },
      { path: 'employee/submit-event', component: SubmitEvent },
      { path: 'my-points', component: MyPoints },
      { path: 'my-interests', component: MyInterests },
      { path: 'my-profile', component: MyProfile },
      { 
        path: 'admin/events/:id',
        component: AdminEventDetails,
        canActivate: [roleGuard],
        data: { roles: ['ROLE_HR', 'ROLE_MANAGER'] }
      },
      { path: 'admin/reward-requests', component: AdminRewardRequests, canActivate: [roleGuard], data: { roles: ['ROLE_HR'] } },

      { path: 'my-badges', component: MyBadges },
      { path: 'my-rewards', component: MyRewards },
      { path: 'calendar', component: EventCalendar }
    ]
  },

  { path: '**', redirectTo: 'not-found' }
];
