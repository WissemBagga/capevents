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
import { AdminDashboard } from './features/admin-events/admin-dashboard/admin-dashboard';
import { CreateEvent } from './features/admin-events/create-event/create-event';
import { EditEvent } from './features/admin-events/edit-event/edit-event';
import { AppShell } from './shared/layout/app-shell/app-shell';
import { VerifyEmail } from './features/auth/verify-email/verify-email';
import { VerifyEmailPending } from './features/auth/verify-email-pending/verify-email-pending';
import { AdminEventDetails } from './features/admin-events/admin-event-details/admin-event-details';
import {MyEvents} from './features/events/my-events/my-events'

import { MyInvitations } from './features/events/my-invitations/my-invitations'
import { SubmitEvent } from './features/events/submit-event/submit-event';
import { PendingEvents } from './features/admin-events/pending-events/pending-events';

import { MySubmissions } from './features/events/my-submissions/my-submissions';

import {FeedbackEvent} from './features/events/feedback-event/feedback-event';

import {MyPoints} from './features/points/my-points/my-points'


export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'forgot-password', component: ForgotPassword },
  { path: 'reset-password', component: ResetPassword },
  { path: 'verify-email-pending', component: VerifyEmailPending },
  { path: 'verify-email', component: VerifyEmail },

  
 {
    path: '',
    component: AppShell,
    canActivate: [authGuard],
    children: [
      { path: 'events', component: EventsList },
      { path: 'events/:id', component: EventDetails },
      
      { path: 'admin/events/:id',
        component: AdminEventDetails,
        canActivate: [roleGuard],
        data: { roles: ['ROLE_HR', 'ROLE_MANAGER'] }
      },
      {
        path: 'dashboard/employee',
        component: EmployeeDashboard,
        canActivate: [roleGuard],
        data: { roles: ['ROLE_EMPLOYEE'] }
      },
      {
        path: 'admin/hr',
        component: AdminDashboard,
        canActivate: [roleGuard],
        data: { roles: ['ROLE_HR'] }
      },
      {
        path: 'admin/manager',
        component: AdminDashboard,
        canActivate: [roleGuard],
        data: { roles: ['ROLE_MANAGER'] }
      },
      {
        path: 'admin/create-event',
        component: CreateEvent,
        canActivate: [roleGuard],
        data: { roles: ['ROLE_HR', 'ROLE_MANAGER'] }
      },
      {
        path: 'admin/edit-event/:id',
        component: EditEvent,
        canActivate: [roleGuard],
        data: { roles: ['ROLE_HR', 'ROLE_MANAGER'] }
      },
      {
        path: 'my-events',
        component: MyEvents,
        canActivate: [roleGuard],
        data: { roles: ['ROLE_EMPLOYEE'] }
      },
      {
        path: 'my-invitations',
        component: MyInvitations,
        canActivate: [roleGuard],
        data: { roles: ['ROLE_EMPLOYEE'] }
      },
      {
        path: 'employee/submit-event',
        component: SubmitEvent,
        canActivate: [roleGuard],
        data: { roles: ['ROLE_EMPLOYEE'] }
      },
      {
        path: 'admin/pending-events',
        component: PendingEvents,
        canActivate: [roleGuard],
        data: { roles: ['ROLE_HR', 'ROLE_MANAGER'] }
      },
      {
        path: 'my-submissions',
        component: MySubmissions,
        canActivate: [roleGuard],
        data: { roles: ['ROLE_EMPLOYEE'] }
      },
      {
        path: 'events/:id/feedback',
        component: FeedbackEvent,
        canActivate: [roleGuard],
        data: { roles: ['ROLE_EMPLOYEE'] }
      },
      {
        path: 'my-points',
        component: MyPoints,
        canActivate: [roleGuard],
        data: { roles: ['ROLE_EMPLOYEE', 'ROLE_MANAGER', 'ROLE_HR'] }
      }
    ]
  },

  { path: '**', redirectTo: 'login' }
];