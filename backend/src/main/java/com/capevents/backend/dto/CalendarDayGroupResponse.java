package com.capevents.backend.dto;

import java.time.LocalDate;
import java.util.List;

public record CalendarDayGroupResponse(
        LocalDate date,
        List<CalendarEventItemResponse> events
) {
}