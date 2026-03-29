package com.capevents.backend.registration.dto;

import com.capevents.backend.registration.AttendanceStatus;

public record UpdateAttendanceRequest(
        AttendanceStatus attendanceStatus
) {
}