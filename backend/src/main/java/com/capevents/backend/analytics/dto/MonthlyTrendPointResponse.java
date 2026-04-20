package com.capevents.backend.analytics.dto;

public record MonthlyTrendPointResponse(
        String month,
        long registrations
) {
}