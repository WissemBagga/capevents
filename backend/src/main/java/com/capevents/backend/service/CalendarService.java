package com.capevents.backend.service;

import com.capevents.backend.dto.CalendarDayGroupResponse;
import com.capevents.backend.dto.CalendarEventItemResponse;
import com.capevents.backend.dto.CalendarRangeResponse;
import com.capevents.backend.exception.BadRequestException;
import com.capevents.backend.exception.NotFoundException;
import com.capevents.backend.entity.Event;
import com.capevents.backend.repository.EventRepository;
import com.capevents.backend.repository.EventRegistrationRepository;
import com.capevents.backend.entity.User;
import com.capevents.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CalendarService {

    private final EventRepository eventRepository;
    private final EventRegistrationRepository registrationRepository;
    private final UserRepository userRepository;

    public CalendarService(
            EventRepository eventRepository,
            EventRegistrationRepository registrationRepository,
            UserRepository userRepository
    ) {
        this.eventRepository = eventRepository;
        this.registrationRepository = registrationRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public CalendarRangeResponse getEmployeeCalendar(String actorEmail, LocalDate from, LocalDate to) {
        User actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail.toLowerCase())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

        validateRange(from, to);

        Instant fromInstant = from.atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant toInstant = to.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();

        boolean isHr = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_HR"));

        List<Event> events = isHr
                ? eventRepository.findPublishedBetween(fromInstant, toInstant)
                : eventRepository.findPublishedVisibleForDepartmentBetween(
                actor.getDepartment() != null ? actor.getDepartment().getId() : -1L,
                fromInstant,
                toInstant
        );

        Set<UUID> registeredIds = new HashSet<>(
                registrationRepository.findRegisteredEventIdsByUserIdBetween(actor.getId(), fromInstant, toInstant)
        );

        return buildRangeResponse(events, registeredIds, false, from, to);
    }

    @Transactional(readOnly = true)
    public CalendarRangeResponse getAdminCalendar(String actorEmail, LocalDate from, LocalDate to) {
        User actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail.toLowerCase())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

        validateRange(from, to);

        Instant fromInstant = from.atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant toInstant = to.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();

        boolean isHr = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_HR"));
        boolean isManager = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_MANAGER"));

        if (!isHr && !isManager) {
            throw new BadRequestException("Action non autorisée");
        }

        List<Event> events = isHr
                ? eventRepository.findAllAdminBetween(fromInstant, toInstant)
                : eventRepository.findManagerCalendarBetween(
                actor.getDepartment() != null ? actor.getDepartment().getId() : -1L,
                fromInstant,
                toInstant
        );

        return buildRangeResponse(events, Collections.emptySet(), true, from, to);
    }

    private CalendarRangeResponse buildRangeResponse(
            List<Event> events,
            Set<UUID> registeredIds,
            boolean adminView,
            LocalDate from,
            LocalDate to
    ) {
        Map<LocalDate, List<CalendarEventItemResponse>> grouped = events.stream()
                .map(event -> new CalendarEventItemResponse(
                        event.getId(),
                        event.getTitle(),
                        event.getCategory(),
                        event.getStatus().name(),
                        event.getAudience() != null ? event.getAudience().name() : null,
                        event.getTargetDepartment() != null ? event.getTargetDepartment().getName() : "Global",
                        event.getStartAt(),
                        event.getDurationMinutes(),
                        registeredIds.contains(event.getId()),
                        adminView
                ))
                .collect(Collectors.groupingBy(
                        item -> item.startAt().atZone(ZoneOffset.UTC).toLocalDate(),
                        TreeMap::new,
                        Collectors.toList()
                ));

        List<CalendarDayGroupResponse> days = grouped.entrySet().stream()
                .map(entry -> new CalendarDayGroupResponse(entry.getKey(), entry.getValue()))
                .toList();

        return new CalendarRangeResponse(from, to, days);
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new BadRequestException("La plage du calendrier est obligatoire.");
        }

        if (from.isAfter(to)) {
            throw new BadRequestException("La date de début doit être antérieure à la date de fin.");
        }

        if (ChronoUnit.DAYS.between(from, to) > 120) {
            throw new BadRequestException("La plage du calendrier ne peut pas dépasser 120 jours.");
        }
    }
}