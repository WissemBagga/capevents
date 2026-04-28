package com.capevents.backend.dto;

import com.capevents.backend.entity.enums.AttendanceStatus;

public record UpdateAttendanceRequest(
        AttendanceStatus attendanceStatus
) {
}