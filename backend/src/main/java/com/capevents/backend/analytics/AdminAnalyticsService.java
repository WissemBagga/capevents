package com.capevents.backend.analytics;

import com.capevents.backend.analytics.dto.*;
import com.capevents.backend.common.exception.BadRequestException;
import com.capevents.backend.common.exception.NotFoundException;
import com.capevents.backend.event.Event;
import com.capevents.backend.event.EventRepository;
import com.capevents.backend.event.EventStatus;
import com.capevents.backend.feedback.EventFeedbackRepository;
import com.capevents.backend.registration.AttendanceStatus;
import com.capevents.backend.registration.EventRegistration;
import com.capevents.backend.registration.EventRegistrationRepository;
import com.capevents.backend.registration.RegistrationStatus;
import com.capevents.backend.user.User;
import com.capevents.backend.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class AdminAnalyticsService {

    private static final String USER_NOT_FOUND_MESSAGE = "Utilisateur introuvable";

    private final EventRepository eventRepository;
    private final EventRegistrationRepository registrationRepository;
    private final UserRepository userRepository;
    private final EventFeedbackRepository feedbackRepository;

    public AdminAnalyticsService(
            EventRepository eventRepository,
            EventRegistrationRepository registrationRepository,
            UserRepository userRepository, EventFeedbackRepository feedbackRepository
    ) {
        this.eventRepository = eventRepository;
        this.registrationRepository = registrationRepository;
        this.userRepository = userRepository;
        this.feedbackRepository = feedbackRepository;
    }

    @Transactional(readOnly = true)
    public AdminAnalyticsOverviewResponse getOverview(
            String actorEmail,
            String from,
            String to,
            Long departmentId,
            String category
    ) {
        User actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail)
                .orElseThrow(() -> new NotFoundException(USER_NOT_FOUND_MESSAGE));

        List<Event> scopedEvents = applyFilters(
                resolveScopedEvents(actor),
                from,
                to,
                departmentId,
                category
        );

        long totalEvents = scopedEvents.size();
        long publishedEvents = scopedEvents.stream()
                .filter(e -> e.getStatus() == EventStatus.PUBLISHED)
                .count();

        List<Event> eligibleEvents = scopedEvents.stream()
                .filter(this::isAnalyticsEligibleEvent)
                .toList();

        long totalRegistrations = 0L;
        long totalCapacity = 0L;
        long totalPresent = 0L;
        long totalAbsent = 0L;

        long totalFeedbacks = 0L;
        double ratingSum = 0.0;
        long ratedEventsCount = 0L;

        List<EventFeedbackAnalyticsResponse> topRatedEvents = eligibleEvents.stream()
                .map(event -> {
                    long feedbackCount = feedbackRepository.countByEventId(event.getId());
                    Double avg = feedbackRepository.findAverageRatingByEventId(event.getId());

                    double averageRating = avg != null ? round2(avg) : 0.0;

                    return new EventFeedbackAnalyticsResponse(
                            event.getId(),
                            event.getTitle(),
                            event.getStatus().name(),
                            averageRating,
                            feedbackCount
                    );
                })
                .filter(item -> item.feedbackCount() > 0)
                .sorted(
                        Comparator.comparing(EventFeedbackAnalyticsResponse::averageRating).reversed()
                                .thenComparing(EventFeedbackAnalyticsResponse::feedbackCount).reversed()
                )
                .limit(5)
                .toList();

        List<EventEngagementResponse> topEngagingEvents = eligibleEvents.stream()
                .map(event -> {
                    long registeredCount = registrationRepository.countByEventAndStatus(event, RegistrationStatus.REGISTERED);
                    long presentCount = registrationRepository.countByEventAndAttendanceStatus(event, AttendanceStatus.PRESENT);
                    long absentCount = registrationRepository.countByEventAndAttendanceStatus(event, AttendanceStatus.ABSENT);

                    double attendanceRate = registeredCount > 0
                            ? round2((presentCount * 100.0) / registeredCount)
                            : 0.0;

                    return new EventEngagementResponse(
                            event.getId(),
                            event.getTitle(),
                            event.getStatus().name(),
                            registeredCount,
                            event.getCapacity() != null ? event.getCapacity().longValue() : 0L,
                            presentCount,
                            absentCount,
                            attendanceRate
                    );
                })
                .sorted(Comparator
                        .comparing(EventEngagementResponse::registeredCount).reversed()
                        .thenComparing(EventEngagementResponse::presentCount).reversed()
                )
                .limit(5)
                .toList();

        for (Event event : eligibleEvents) {
            totalRegistrations += registrationRepository.countByEventAndStatus(event, RegistrationStatus.REGISTERED);
            totalPresent += registrationRepository.countByEventAndAttendanceStatus(event, AttendanceStatus.PRESENT);
            totalAbsent += registrationRepository.countByEventAndAttendanceStatus(event, AttendanceStatus.ABSENT);
            totalCapacity += event.getCapacity() != null ? event.getCapacity() : 0;

            long feedbackCount = feedbackRepository.countByEventId(event.getId());
            Double avg = feedbackRepository.findAverageRatingByEventId(event.getId());

            totalFeedbacks += feedbackCount;

            if (avg != null && feedbackCount > 0) {
                ratingSum += avg;
                ratedEventsCount++;
            }
        }

        double registrationRate = totalCapacity > 0
                ? round2((totalRegistrations * 100.0) / totalCapacity)
                : 0.0;

        double attendanceRate = totalRegistrations > 0
                ? round2((totalPresent * 100.0) / totalRegistrations)
                : 0.0;

        double averageRating = totalFeedbacks > 0
                ? round2(
                eligibleEvents.stream()
                        .mapToDouble(event -> {
                            Double avg = feedbackRepository.findAverageRatingByEventId(event.getId());
                            long count = feedbackRepository.countByEventId(event.getId());
                            return (avg != null ? avg : 0.0) * count;
                        })
                        .sum() / totalFeedbacks
        )
                : 0.0;

        double feedbackResponseRate = totalPresent > 0
                ? round2((totalFeedbacks * 100.0) / totalPresent)
                : 0.0;



        List<TopMemberAnalyticsResponse> allTopMembers = buildTopMembers(actor, eligibleEvents);

        long pendingProposals = scopedEvents.stream()
                .filter(e -> e.getStatus() == EventStatus.PENDING)
                .count();

        List<TopMemberAnalyticsResponse> memberRows = buildMemberRows(actor, eligibleEvents);
        List<TopMemberAnalyticsResponse> topMembers = memberRows.stream().limit(5).toList();

        long activeMembers = memberRows.size();

        List<MonthlyTrendPointResponse> monthlyTrend = buildMonthlyTrend(actor, eligibleEvents);
        List<DepartmentAnalyticsRowResponse> departmentRows = isHr(actor)
                ? buildDepartmentRows(eligibleEvents)
                : List.of();

        return new AdminAnalyticsOverviewResponse(
                totalEvents,
                publishedEvents,
                totalRegistrations,
                totalCapacity,
                registrationRate,
                totalPresent,
                totalAbsent,
                attendanceRate,
                totalFeedbacks,
                averageRating,
                feedbackResponseRate,
                topRatedEvents,
                topEngagingEvents,
                activeMembers,
                pendingProposals,
                topMembers,
                memberRows,
                monthlyTrend,
                departmentRows

        );
    }

    private List<Event> resolveScopedEvents(User actor) {
        boolean isHr = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_HR"));
        if (isHr) {
            return eventRepository.findAllForAnalytics();
        }

        boolean isManager = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_MANAGER"));
        if (!isManager) {
            throw new BadRequestException("Action non autorisée");
        }

        if (actor.getDepartment() == null) {
            throw new BadRequestException("Le manager n’a pas de département");
        }

        return eventRepository.findAllForAnalyticsByManagerScope(actor.getDepartment().getId());
    }

    private boolean isAnalyticsEligibleEvent(Event event) {
        return event.getStatus() == EventStatus.PUBLISHED
                || event.getStatus() == EventStatus.CANCELLED
                || event.getStatus() == EventStatus.ARCHIVED;
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private static class MemberAccumulator {
        String fullName;
        String email;
        String departmentName;
        long registeredCount;
        long presentCount;

        MemberAccumulator(String fullName, String email, String departmentName) {
            this.fullName = fullName;
            this.email = email;
            this.departmentName = departmentName;
        }

        double attendanceRate() {
            return registeredCount > 0
                    ? Math.round((presentCount * 10000.0) / registeredCount) / 100.0
                    : 0.0;
        }
    }

    private boolean isHr(User actor) {
        return actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_HR"));
    }

    private boolean isManager(User actor) {
        return actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_MANAGER"));
    }

    private List<TopMemberAnalyticsResponse> buildMemberRows(User actor, List<Event> eligibleEvents) {
        Map<UUID, MemberAccumulator> memberMap = new HashMap<>();

        boolean hr = isHr(actor);
        Long managerDeptId = actor.getDepartment() != null ? actor.getDepartment().getId() : null;

        for (Event event : eligibleEvents) {
            List<EventRegistration> regs =
                    registrationRepository.findByEventAndStatusOrderByRegisteredAtAsc(event, RegistrationStatus.REGISTERED);

            for (EventRegistration reg : regs) {
                User user = reg.getUser();
                if (user == null) continue;

                if (!hr) {
                    Long userDeptId = user.getDepartment() != null ? user.getDepartment().getId() : null;
                    if (managerDeptId == null || !managerDeptId.equals(userDeptId)) {
                        continue;
                    }
                }

                MemberAccumulator acc = memberMap.computeIfAbsent(
                        user.getId(),
                        id -> new MemberAccumulator(
                                buildFullName(user.getFirstName(), user.getLastName()),
                                user.getEmail(),
                                user.getDepartment() != null ? user.getDepartment().getName() : null
                        )
                );

                acc.registeredCount++;
                if (reg.getAttendanceStatus() == AttendanceStatus.PRESENT) {
                    acc.presentCount++;
                }
            }
        }

        return memberMap.values().stream()
                .map(acc -> new TopMemberAnalyticsResponse(
                        acc.fullName,
                        acc.email,
                        acc.departmentName,
                        acc.registeredCount,
                        acc.presentCount,
                        acc.attendanceRate()
                ))
                .sorted(
                        Comparator.comparing(TopMemberAnalyticsResponse::presentCount).reversed()
                                .thenComparing(TopMemberAnalyticsResponse::registeredCount).reversed()
                                .thenComparing(TopMemberAnalyticsResponse::attendanceRate).reversed()
                                .thenComparing(TopMemberAnalyticsResponse::fullName)
                )
                .toList();
    }

    private List<TopMemberAnalyticsResponse> buildTopMembers(User actor, List<Event> eligibleEvents) {
        Map<UUID, MemberAccumulator> memberMap = new HashMap<>();

        Long managerDeptId = actor.getDepartment() != null ? actor.getDepartment().getId() : null;
        boolean actorIsHr = isHr(actor);

        for (Event event : eligibleEvents) {
            List<EventRegistration> regs =
                    registrationRepository.findByEventAndStatusOrderByRegisteredAtAsc(event, RegistrationStatus.REGISTERED);

            for (EventRegistration reg : regs) {
                User user = reg.getUser();
                if (user == null) continue;

                if (!actorIsHr) {
                    Long userDeptId = user.getDepartment() != null ? user.getDepartment().getId() : null;
                    if (managerDeptId == null || !managerDeptId.equals(userDeptId)) {
                        continue;
                    }
                }

                MemberAccumulator acc = memberMap.computeIfAbsent(
                        user.getId(),
                        id -> new MemberAccumulator(
                                buildFullName(user.getFirstName(), user.getLastName()),
                                user.getEmail(),
                                user.getDepartment() != null ? user.getDepartment().getName() : null
                        )
                );

                acc.registeredCount++;

                if (reg.getAttendanceStatus() == AttendanceStatus.PRESENT) {
                    acc.presentCount++;
                }
            }
        }

        return memberMap.values().stream()
                .map(acc -> new TopMemberAnalyticsResponse(
                        acc.fullName,
                        acc.email,
                        acc.departmentName,
                        acc.registeredCount,
                        acc.presentCount,
                        acc.attendanceRate()
                ))
                .sorted(
                        Comparator.comparing(TopMemberAnalyticsResponse::presentCount).reversed()
                                .thenComparing(TopMemberAnalyticsResponse::registeredCount).reversed()
                                .thenComparing(TopMemberAnalyticsResponse::attendanceRate).reversed()
                                .thenComparing(TopMemberAnalyticsResponse::fullName)
                )
                .toList();
    }

    private List<MonthlyTrendPointResponse> buildMonthlyTrend(User actor, List<Event> eligibleEvents) {
        Map<YearMonth, Long> monthCounts = new HashMap<>();

        boolean hr = isHr(actor);
        Long managerDeptId = actor.getDepartment() != null ? actor.getDepartment().getId() : null;

        for (Event event : eligibleEvents) {
            List<EventRegistration> regs =
                    registrationRepository.findByEventAndStatusOrderByRegisteredAtAsc(event, RegistrationStatus.REGISTERED);

            for (EventRegistration reg : regs) {
                User user = reg.getUser();
                if (user == null || reg.getRegisteredAt() == null) continue;

                if (!hr) {
                    Long userDeptId = user.getDepartment() != null ? user.getDepartment().getId() : null;
                    if (managerDeptId == null || !managerDeptId.equals(userDeptId)) {
                        continue;
                    }
                }

                YearMonth ym = YearMonth.from(reg.getRegisteredAt().atZone(ZoneId.systemDefault()));
                monthCounts.merge(ym, 1L, Long::sum);
            }
        }

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM yyyy", Locale.FRENCH);

        return monthCounts.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> new MonthlyTrendPointResponse(
                        entry.getKey().format(formatter),
                        entry.getValue()
                ))
                .toList();
    }

    private List<Event> applyFilters(
            List<Event> events,
            String from,
            String to,
            Long departmentId,
            String category
    ) {
        return events.stream()
                .filter(event -> {
                    if (from != null && !from.isBlank() && event.getStartAt() != null) {
                        java.time.LocalDate fromDate = java.time.LocalDate.parse(from);
                        if (event.getStartAt().atZone(java.time.ZoneId.systemDefault()).toLocalDate().isBefore(fromDate)) {
                            return false;
                        }
                    }
                    return true;
                })
                .filter(event -> {
                    if (to != null && !to.isBlank() && event.getStartAt() != null) {
                        java.time.LocalDate toDate = java.time.LocalDate.parse(to);
                        if (event.getStartAt().atZone(java.time.ZoneId.systemDefault()).toLocalDate().isAfter(toDate)) {
                            return false;
                        }
                    }
                    return true;
                })
                .filter(event -> {
                    if (departmentId != null) {
                        return event.getTargetDepartment() != null
                                && departmentId.equals(event.getTargetDepartment().getId());
                    }
                    return true;
                })
                .filter(event -> {
                    if (category != null && !category.isBlank()) {
                        return event.getCategory() != null
                                && event.getCategory().trim().equalsIgnoreCase(category.trim());
                    }
                    return true;
                })
                .toList();
    }

    private List<DepartmentAnalyticsRowResponse> buildDepartmentRows(List<Event> eligibleEvents) {
        List<User> employees = userRepository.findActiveVerifiedEmployeeUsers();

        Map<Long, String> departmentNames = new HashMap<>();
        Map<Long, Long> totalEmployeesByDept = new HashMap<>();
        Map<Long, Set<UUID>> activeEmployeesByDept = new HashMap<>();
        Map<Long, Double> ratingWeightedSumByDept = new HashMap<>();
        Map<Long, Long> feedbackCountByDept = new HashMap<>();

        for (User user : employees) {
            if (user.getDepartment() == null) continue;

            Long deptId = user.getDepartment().getId();
            departmentNames.put(deptId, user.getDepartment().getName());
            totalEmployeesByDept.merge(deptId, 1L, Long::sum);
        }

        for (Event event : eligibleEvents) {
            List<EventRegistration> regs =
                    registrationRepository.findByEventAndStatusOrderByRegisteredAtAsc(event, RegistrationStatus.REGISTERED);

            for (EventRegistration reg : regs) {
                User user = reg.getUser();
                if (user == null || user.getDepartment() == null) continue;

                Long deptId = user.getDepartment().getId();
                activeEmployeesByDept.computeIfAbsent(deptId, id -> new HashSet<>()).add(user.getId());
            }

            if (event.getTargetDepartment() != null) {
                Long deptId = event.getTargetDepartment().getId();
                Double avg = feedbackRepository.findAverageRatingByEventId(event.getId());
                long count = feedbackRepository.countByEventId(event.getId());

                if (avg != null && count > 0) {
                    ratingWeightedSumByDept.merge(deptId, avg * count, Double::sum);
                    feedbackCountByDept.merge(deptId, count, Long::sum);
                }
            }
        }

        return totalEmployeesByDept.entrySet().stream()
                .map(entry -> {
                    Long deptId = entry.getKey();
                    long totalEmployees = entry.getValue();
                    long activeEmployees = activeEmployeesByDept.getOrDefault(deptId, Set.of()).size();

                    double participationRate = totalEmployees > 0
                            ? round2((activeEmployees * 100.0) / totalEmployees)
                            : 0.0;

                    Long feedbackCount = feedbackCountByDept.getOrDefault(deptId, 0L);
                    Double averageRating = feedbackCount > 0
                            ? round2(ratingWeightedSumByDept.getOrDefault(deptId, 0.0) / feedbackCount)
                            : null;

                    return new DepartmentAnalyticsRowResponse(
                            deptId,
                            departmentNames.getOrDefault(deptId, "Département"),
                            totalEmployees,
                            activeEmployees,
                            participationRate,
                            averageRating
                    );
                })
                .sorted(
                        Comparator.comparing(DepartmentAnalyticsRowResponse::participationRate).reversed()
                                .thenComparing(DepartmentAnalyticsRowResponse::activeEmployees).reversed()
                                .thenComparing(DepartmentAnalyticsRowResponse::departmentName)
                )
                .toList();
    }

    private String buildFullName(String firstName, String lastName) {
        String safeFirstName = firstName != null ? firstName.trim() : "";
        String safeLastName = lastName != null ? lastName.trim() : "";
        return (safeFirstName + " " + safeLastName).trim();
    }
}