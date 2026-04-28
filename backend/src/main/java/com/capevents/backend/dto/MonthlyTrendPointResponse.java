package com.capevents.backend.dto;

public record MonthlyTrendPointResponse(
        String month,
        long registrations
) {
}