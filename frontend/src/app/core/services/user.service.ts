import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Department } from '../models/department.model';

import { UserSummary } from '../models/user-summary.model';
import { PageResponse } from '../models/page-response.model';
import { environment } from '../../../environments/environment';




@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);

  private readonly departmentsUrl = `${environment.apiBaseUrl}/api/departments`;

  getDepartments(): Observable<Department[]> {
    return this.http.get<Department[]>(this.departmentsUrl);
  }

  getAllUsers(page = 0, size = 1000, sortBy = 'firstName', sortDir = 'asc') {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);

    return this.http.get<PageResponse<UserSummary>>(`${environment.apiBaseUrl}/api/users/admin`, { params });
  } 

  createDepartment(name: string) {
    return this.http.post<Department>(this.departmentsUrl, { name });
  }

  updateUserRole(userId: string, roleCode: string) {
    return this.http.patch<UserSummary>(`${environment.apiBaseUrl}/api/users/admin/${userId}/role`, { roleCode });
  }
}