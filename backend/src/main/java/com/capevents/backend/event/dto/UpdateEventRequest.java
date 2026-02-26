package com.capevents.backend.event.dto;

import com.capevents.backend.event.EventLocationType;
import jakarta.validation.constraints.*;

import java.time.Instant;

public record UpdateEventRequest(
        @NotBlank @Size(min = 5, max = 100)  String title,
        @Size(max = 60) String category,
        String description,

        @NotNull Instant startAt,
        @NotNull @Min(1) @Max(1440) Integer durationMinutes,

        @NotNull EventLocationType locationType,
        @Size(max = 180) String locationName,
        String meetingUrl,
        String address,

        @NotNull @Min(1) @Max(500) Integer capacity,
        @NotNull Instant registrationDeadline,

        String imageUrl
        ) {}
