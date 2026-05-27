import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { ForgotPassword } from './features/auth/forgot-password/forgot-password';
import { ResetPassword } from './features/auth/reset-password/reset-password';
import { EventsList } from './features/events/browse/events-list/events-list';
import { authGuard } from './core/guards/auth-guard';
import { EventDetails } from './features/events/details/events-details/event-details';
import { roleGuard } from './core/guards/role-guard';
import {AdminStats} from './features/admin/analytics/admin-stats/admin-stats';

import { AppShell } from './layout/app-shell/app-shell';
import { VerifyEmail } from './features/auth/verify-email/verify-email';
import { VerifyEmailPending } from './features/auth/verify-email-pending/verify-email-pending';



import { FeedbackEvent } from './features/events/feedback/feedback-event/feedback-event';

import { MyPoints } from './features/gamification/my-points/my-points';



import { Forbidden } from './features/errors/forbidden/forbidden';
import { NotFound } from './features/errors/not-found/not-found';


import { AdminDepartments } from './features/admin/departments/admin-departments/admin-departments';
import { AdminUsers } from './features/admin/users/admin-users/admin-users';


import { MyBadges } from './features/gamification/my-badges/my-badges';

import { MyRewards } from './features/gamification/my-rewards/my-rewards';
import { PastEvents } from './features/events/history/past-events/past-events';
import { MyEvents } from './features/events/my-events/my-events';
import { MyInvitations } from './features/events/invitations/my-invitations/my-invitations';
import { MySubmissions } from './features/events/submissions/my-submissions/my-submissions';
import { SubmitEvent } from './features/events/submissions/new/submit-event/submit-event';
import { EventCalendar } from './features/events/calendar/event-calendar/event-calendar';

import { EmployeeDashboard } from './features/employee/dashboard/employee-dashboard/employee-dashboard';

import { AdminDashboard } from './features/admin/events/event-management/admin-dashboard';
import { AdminEventDetails } from './features/admin/events/event-details/admin-event-details';
import { CreateEvent } from './features/admin/events/create-event/create-event';
import { EditEvent } from './features/admin/events/edit-event/edit-event';
import { PendingEvents } from './features/admin/events/pending-events/pending-events';
import { AdminRewardRequests } from './features/admin/rewards/admin-reward-requests/admin-reward-requests';

import { MyProfile } from './features/account/profile/my-profile/my-profile';
import { MyInterests } from './features/account/interests/my-interests/my-interests';
import { SettingsHub } from './features/account/settings/settings-hub/settings-hub';


import { LandingPage } from './features/public/landing/landing-page/landing-page';

import { GamificationHub } from './features/gamification/gamification-hub/gamification-hub';
import { AiAssistantsHub } from './features/ai-assistants/ai-assistants-hub/ai-assistants-hub';



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
      { path: 'events/:id/feedback', component: FeedbackEvent },
      { path: 'events/:id', component: EventDetails },

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
      { path: 'my-points', component: MyPoints },
      { path: 'my-interests', component: MyInterests },
      { path: 'my-profile', component: MyProfile },
      {
        path: 'employee/submit-event',
        component: SubmitEvent,
        canActivate: [roleGuard],
        data: { roles: ['ROLE_EMPLOYEE'] }
      },
      {
        path: 'my-submissions',
        component: MySubmissions,
        canActivate: [roleGuard],
        data: { roles: ['ROLE_EMPLOYEE'] }
      },
      { 
        path: 'admin/events/:id',
        component: AdminEventDetails,
        canActivate: [roleGuard],
        data: { roles: ['ROLE_HR', 'ROLE_MANAGER'] }
      },
      { path: 'admin/reward-requests', component: AdminRewardRequests, canActivate: [roleGuard], data: { roles: ['ROLE_HR'] } },

      { path: 'my-badges', component: MyBadges },
      { path: 'my-rewards', component: MyRewards },
      { path: 'calendar', component: EventCalendar },

      { path: 'settings', component: SettingsHub },
      { path: 'gamification', component: GamificationHub },

      {
        path: 'assistants',
        component: AiAssistantsHub,
        canActivate: [roleGuard],
        data: { roles: ['ROLE_HR', 'ROLE_MANAGER'] }
      },
      {
        path: 'admin/assistants',
        redirectTo: 'assistants',
        pathMatch: 'full'
      }
    ]
  },

  { path: '**', redirectTo: 'not-found' }
];

