package com.capevents.backend.dto;

import java.util.List;

public record PageResponse<T>(
        List<T> items,
        int currentPage,
        int pageSize,
        int totalPages,
        long totalItems,
        boolean hasNext,
        boolean hasPrevious
) {}
