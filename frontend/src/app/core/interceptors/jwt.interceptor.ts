import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  const isAuthEndpoint =
    req.url.includes('/api/auth/login') ||
    req.url.includes('/api/auth/refresh') ||
    req.url.includes('/api/auth/logout');

  const authReq = token && !isAuthEndpoint
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isAuthEndpoint) {
        return throwError(() => error);
      }

      if (!isRefreshing) {
        isRefreshing = true;
        refreshTokenSubject.next(null);

        return authService.refreshAccessToken().pipe(
          switchMap((response) => {
            isRefreshing = false;
            refreshTokenSubject.next(response.accessToken);

            const retryReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${response.accessToken}`
              }
            });

            return next(retryReq);
          }),
          catchError((refreshError) => {
            isRefreshing = false;
            authService.clearSession();
            return throwError(() => refreshError);
          })
        );
      }

      return refreshTokenSubject.pipe(
        filter((newToken): newToken is string => newToken !== null),
        take(1),
        switchMap((newToken) => {
          const retryReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${newToken}`
            }
          });

          return next(retryReq);
        })
      );
    })
  );
};