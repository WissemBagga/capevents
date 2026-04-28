package com.capevents.backend.dto;

import java.time.LocalDate;
import java.util.List;

public record CalendarRangeResponse(
        LocalDate from,
        LocalDate to,
        List<CalendarDayGroupResponse> days
) {
}