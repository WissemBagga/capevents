package com.capevents.backend.user;

import java.util.Set;
import java.util.UUID;

public record UserSummaryDto(
    UUID id,
    String firstName,
    String lastName,
    String email,
    String jobTitle,
    String departmentName,
    boolean active,
    Set<String> roles) {}


