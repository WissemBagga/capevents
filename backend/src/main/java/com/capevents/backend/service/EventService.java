package com.capevents.backend.service;

import com.capevents.backend.entity.enums.EventAudience;
import com.capevents.backend.entity.enums.EventLocationType;
import com.capevents.backend.entity.enums.EventStatus;
import com.capevents.backend.dto.PageResponse;
import com.capevents.backend.exception.BadRequestException;
import com.capevents.backend.exception.NotFoundException;
import com.capevents.backend.entity.Department;
import com.capevents.backend.repository.DepartmentRepository;
import com.capevents.backend.entity.Event;
import com.capevents.backend.dto.CreateEventRequest;
import com.capevents.backend.dto.EmployeeEventSubmissionResponse;
import com.capevents.backend.dto.EventResponse;
import com.capevents.backend.dto.UpdateEventRequest;
import com.capevents.backend.service.mail.EmailService;
import com.capevents.backend.entity.EventRegistration;
import com.capevents.backend.repository.EventRegistrationRepository;
import com.capevents.backend.entity.enums.RegistrationStatus;
import com.capevents.backend.entity.User;
import com.capevents.backend.repository.EventRepository;
import com.capevents.backend.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;


@Service
public class EventService {
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final DepartmentRepository departmentRepository;
    private  final EventRegistrationRepository registrationRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final PointService pointService;
    private final BadgeService badgeService;

    public EventService(EventRepository eventRepository, UserRepository userRepository, AuditService auditService, DepartmentRepository departmentRepository, EventRegistrationRepository registrationRepository, NotificationService notificationService, EmailService emailService, PointService pointService, BadgeService badgeService) {
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.departmentRepository = departmentRepository;
        this.registrationRepository = registrationRepository;
        this.notificationService = notificationService;
        this.emailService = emailService;
        this.pointService = pointService;
        this.badgeService = badgeService;
    }

    @Transactional
    public EventResponse createDraftEvent(CreateEventRequest req, String creatorEmail) {
        validateBusiness(req);

        User creator = userRepository.findByEmailWithRolesAndDepartment(creatorEmail)
                .orElseThrow(() -> new NotFoundException("Créateur introuvable"));

        boolean isHr = creator.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_HR"));
        boolean isManager = creator.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_MANAGER"));

        EventAudience audience = req.audience();

        if (audience == EventAudience.GLOBAL && !isHr) {
            throw new BadRequestException("Seuls les RH peuvent créer des événements globaux");
        }

        Department targetDept = null;

        if (audience == EventAudience.DEPARTMENT) {
            if (isManager) {
                if (creator.getDepartment() == null) throw new BadRequestException("Le manager n’a pas de département");

                Long managerDeptId = creator.getDepartment().getId();

                if (req.targetDepartmentId() != null && !req.targetDepartmentId().equals(managerDeptId)) {
                    throw new BadRequestException("Le manager ne peut pas créer des événements pour un autre département");
                }


                targetDept = creator.getDepartment();
            } else {
                if (req.targetDepartmentId() == null) {
                    throw new BadRequestException("Le champ targetDepartmentId est requis pour les événements de type DÉPARTEMENT");
                }
                targetDept = departmentRepository.findById(req.targetDepartmentId())
                        .orElseThrow(() -> new NotFoundException("Département cible introuvable"));
            }
        } else {
            if (req.targetDepartmentId() != null) {
                throw new BadRequestException("Le champ targetDepartmentId doit être nul pour les événements globaux");
            }
        }

        Event e = new Event();
        e.setTitle(req.title());
        e.setCategory(req.category());
        e.setDescription(
                req.description() != null && !req.description().trim().isEmpty()
                        ? req.description().trim()
                        : null
        );
        e.setStartAt(req.startAt());
        e.setDurationMinutes(req.durationMinutes());
        e.setLocationType(req.locationType());
        e.setLocationName(req.locationName());
        e.setMeetingUrl(req.meetingUrl());
        e.setAddress(req.address());
        e.setCapacity(req.capacity());
        e.setRegistrationDeadline(req.registrationDeadline());
        e.setStatus(EventStatus.DRAFT);
        e.setCreatedBy(creator);
        e.setImageUrl(req.imageUrl());

        e.setAudience(audience);
        e.setTargetDepartment(targetDept);

        Event saved = eventRepository.save(e);

        auditService.logByEmail(
                creatorEmail,
                "EVENT_CREATED",
                "EVENT",
                saved.getId().toString(),
                null,
                "{\"title\":\"" + escape(saved.getTitle()) + "\",\"audience\":\"" + saved.getAudience() + "\"}"
        );

        return toResponse(saved);
    }


    @Transactional
    public EventResponse publish(UUID eventId, String actorEmail, String ip){
        Event e = eventRepository.findByIdWithCreatorDept(eventId)
                .orElseThrow(()-> new NotFoundException("Événement introuvable"));

        User actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));
        authorizeManageEvent(actor, e);


        if (e.getStatus() == EventStatus.ARCHIVED){
            throw new BadRequestException("Impossible de publier un événement archivé");
        }

        if (e.getStartAt().isBefore(Instant.now())){
            throw new BadRequestException("Impossible de publier un événement déjà commencé");
        }

        EventStatus previousStatus = e.getStatus();
        List<User> registeredUsers = previousStatus == EventStatus.CANCELLED
                ? getRegisteredUsers(e)
                : List.of();

        if (previousStatus != EventStatus.CANCELLED) {
            List<User> visibleUsers = resolveVisibleEmployeeUsers(e);
            notificationService.notifyEventPublished(visibleUsers, e);
        }

        e.setStatus(EventStatus.PUBLISHED);

        auditService.logByEmail(
                null,
                "EVENT_PUBLISHED",
                "EVENT",
                e.getId().toString(),
                null,
                "{\"title\":\"" + e.getTitle() + "\"}"
        );

        if (previousStatus == EventStatus.CANCELLED) {
            notificationService.notifyEventRescheduled(registeredUsers, e);
            for (User registeredUser : registeredUsers) {
                emailService.sendEventRescheduledEmail(registeredUser.getEmail(), e);
            }
        }

        return  toResponse(e);
    }



    @Transactional(readOnly = true)
    public List<EventResponse> listPublishedUpcoming(){
        List<Event> events = eventRepository.findByStatusAndStartAtAfterOrderByCreatedAtAsc(
                EventStatus.PUBLISHED,
                Instant.now()
        );
        List<EventResponse> responses = new ArrayList<>();

        for (Event e : events) {
            responses.add(toResponse(e));
        }
        return responses;
    }




    @Transactional(readOnly = true)
    public EventResponse getPublishedById(UUID id){
        Event e = eventRepository.findById(id)
                .orElseThrow(()-> new NotFoundException("Événement introuvable"));

        if (e.getStatus() != EventStatus.PUBLISHED){
            throw new NotFoundException("Événement introuvable");
        }
        return toResponse(e);
    }


    @Transactional(readOnly = true)
    public EventResponse getPublishedForUserDept(UUID id, String actorEmail) {
        var actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

        boolean isHr = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_HR"));
        if (isHr) {
            return getPublishedById(id);
        }

        if (actor.getDepartment() == null) throw new BadRequestException("L’utilisateur n’a pas de département");


        var e = eventRepository.findPublishedByIdVisibleForDept(id, actor.getDepartment().getId())
                .orElseThrow(() -> new NotFoundException("Événement introuvable"));


        return toResponse(e);
    }



    @Transactional(readOnly = true)
    public PageResponse<EventResponse> listAllForHr(Pageable pageable) {
        Page<EventResponse> page = eventRepository.findAll(pageable).map(this::toResponse);

        return new PageResponse<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalPages(),
                page.getTotalElements(),
                page.hasNext(),
                page.hasPrevious()
        );
    }


    @Transactional
    public EventResponse update(UUID id, UpdateEventRequest req, String actorEmail, String ip){
        validateBusinessForUpdate(req);

        Event e = eventRepository.findByIdWithCreatorDept(id)
                .orElseThrow(()-> new NotFoundException("Événement introuvable"));

        User actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

        authorizeManageEvent(actor, e);

        if (e.getStatus() == EventStatus.ARCHIVED){
            throw new BadRequestException("Impossible de modifier un événement archivé");
        }

        Instant previousStartAt = e.getStartAt();
        Instant previousDeadline = e.getRegistrationDeadline();
        boolean wasPublished = e.getStatus() == EventStatus.PUBLISHED;

        long registeredCount = registrationRepository.countByEventAndStatus(e, RegistrationStatus.REGISTERED);

        if (req.capacity() < registeredCount) {
            throw new BadRequestException(
                    "Impossible de réduire la capacité à " + req.capacity()
                            + " : " + registeredCount + " participant(s) sont déjà inscrit(s)."
            );
        }

        e.setTitle(req.title());
        e.setCategory(req.category());
        e.setDescription(
                req.description() != null && !req.description().trim().isEmpty()
                        ? req.description().trim()
                        : null
        );
        e.setStartAt(req.startAt());
        e.setDurationMinutes(req.durationMinutes());
        e.setLocationType(req.locationType());
        e.setLocationName(req.locationName());
        e.setMeetingUrl(req.meetingUrl());
        e.setAddress(req.address());
        e.setCapacity(req.capacity());
        e.setRegistrationDeadline(req.registrationDeadline());
        e.setImageUrl(req.imageUrl());

        boolean dateChanged = previousStartAt != null && !previousStartAt.equals(e.getStartAt());
        boolean deadlineChanged = previousDeadline != null && !previousDeadline.equals(e.getRegistrationDeadline());

        if (dateChanged) {
            e.setReminder24hSentAt(null);
            e.setFeedbackNotificationSentAt(null);
        }

        if (deadlineChanged) {
            e.setDeadlineReminder48hSentAt(null);
        }

        if (wasPublished && dateChanged) {
            List<User> registeredUsers = getRegisteredUsers(e);
            notificationService.notifyEventRescheduled(registeredUsers, e);

            for (User registeredUser : registeredUsers) {
                emailService.sendEventRescheduledEmail(registeredUser.getEmail(), e);
            }
        }


        auditService.logByEmail(
                actorEmail,
                "EVENT_UPDATED",
                "EVENT",
                e.getId().toString(),
                ip,
                "{\"status\":\"" + e.getStatus() + "\",\"title\":\"" + e.getTitle() + "\"}"
        );

        return toResponse(e);
    }

    @Transactional
    public EventResponse cancel(UUID id, String reason, String actorEmail, String ip){
        Event e = eventRepository.findByIdWithCreatorDept(id)
                .orElseThrow(()-> new NotFoundException("Événement introuvable"));

        User actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

        authorizeManageEvent(actor, e);

        if (e.getStatus() == EventStatus.ARCHIVED){
            throw new BadRequestException("Événement déjà archivé");
        }

        if (e.getStatus() == EventStatus.CANCELLED){
            throw new BadRequestException("Événement déjà annulé");
        }
        List<User> registeredUsers = getRegisteredUsers(e);

        for (User registeredUser : registeredUsers) {
            emailService.sendEventCancelledEmail(registeredUser.getEmail(), e);
        }

        e.setStatus(EventStatus.CANCELLED);
        e.setCancelReason(reason);


        auditService.logByEmail(
                actorEmail,
                "EVENT_CANCELLED",
                "EVENT",
                e.getId().toString(),
                ip,
                "{\"reason\":\"" + escape(reason) + "\"}"
        );
        notificationService.notifyEventCancelled(registeredUsers, e);


        return toResponse(e);
    }

    private String escape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private List<User> getRegisteredUsers(Event event) {
        return registrationRepository.findByEventAndStatusOrderByRegisteredAtAsc(
                        event,
                        RegistrationStatus.REGISTERED
                )
                .stream()
                .map(EventRegistration::getUser)
                .distinct()
                .toList();
    }

    @Transactional
    public EventResponse archive(UUID id, String actorEmail, String ip){
        Event e = eventRepository.findByIdWithCreatorDept(id)
                .orElseThrow(()-> new NotFoundException("Événement introuvable"));

        User actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

        authorizeManageEvent(actor, e);


        if (e.getStatus() == EventStatus.ARCHIVED){
            throw new BadRequestException("Événement déjà archivé");
        }


        e.setStatus(EventStatus.ARCHIVED);

        auditService.logByEmail(
                actorEmail,
                "EVENT_ARCHIVED",
                "EVENT",
                e.getId().toString(),
                ip,
                "{\"title\":\"" + e.getTitle() + "\"}"
        );

        return toResponse(e);
    }


    @Transactional(readOnly = true)
    public PageResponse<EventResponse> listPublishedForUserDept(String actorEmail, Pageable pageable) {
        var actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

        boolean isHr = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_HR"));
        Instant now = Instant.now();

        if (isHr) {
            Page<EventResponse> page = eventRepository
                    .findByStatusAndStartAtAfter(EventStatus.PUBLISHED, now, pageable)
                    .map(this::toResponse);

            return new PageResponse<>(
                    page.getContent(),
                    page.getNumber(),
                    page.getSize(),
                    page.getTotalPages(),
                    page.getTotalElements(),
                    page.hasNext(),
                    page.hasPrevious()
            );
        }

        if (actor.getDepartment() == null) throw new BadRequestException("L’utilisateur n’a pas de département");

        Long deptId = actor.getDepartment().getId();

        Page<EventResponse> page = eventRepository
                .findPublishedVisibleForDeptPage(now, deptId, pageable)
                .map(this::toResponse);

        return new PageResponse<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalPages(),
                page.getTotalElements(),
                page.hasNext(),
                page.hasPrevious()
        );
    }


    @Transactional(readOnly = true)
    public PageResponse<EventResponse> listEvents(Pageable pageable, String actorEmail) {
        var actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

        // HR : option 1 → voir tout
        boolean isHr = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_HR"));
        if (isHr) {
            return listAllForHr(pageable);
        }

        // Manager : doit avoir un dept
        boolean isManager = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_MANAGER"));
        if (!isManager) {
            throw new BadRequestException("Action non autorisée");
        }

        if (actor.getDepartment() == null) {
            throw new BadRequestException("Le manager n’a pas de département");
        }

        Long deptId = actor.getDepartment().getId();

        Page<EventResponse> page = eventRepository.findAllByCreatorDepartment(deptId, pageable).map(this::toResponse);

        return new PageResponse<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalPages(),
                page.getTotalElements(),
                page.hasNext(),
                page.hasPrevious()
        );

    }

    @Transactional(readOnly = true)
    public EventResponse getAdminById(UUID id, String actorEmail) {
        Event e = eventRepository.findByIdWithCreatorDept(id)
                .orElseThrow(() -> new NotFoundException("Événement introuvable"));

        User actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

        authorizeManageEvent(actor, e);

        return toResponse(e);
    }

    @Transactional(readOnly = true)
    public PageResponse<EventResponse> searchPublishedForUserDept(
            String actorEmail,
            String category,
            String q,
            String status,
            Instant from,
            Instant to,
            Pageable pageable
    ) {
        var actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

        boolean isHr = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_HR"));

        Instant effectiveFrom = (from != null) ? from : Instant.now();
        Instant effectiveTo = (to != null) ? to : Instant.parse("9999-12-31T23:59:59Z");

        String normalizedCategory = (category != null && !category.trim().isEmpty())
                ? category.trim()
                : null;

        String normalizedQuery = (q != null && !q.trim().isEmpty())
                ? q.trim()
                : null;

        if (effectiveFrom.isAfter(effectiveTo)) {
            throw new BadRequestException("La date de début doit être antérieure ou égale à la date limite d’inscription.");
        }

        Pageable fullPageable = org.springframework.data.domain.PageRequest.of(
                0,
                10000,
                pageable.getSort()
        );

        Page<Event> rawPage;

        if (isHr) {
            rawPage = searchPublishedForHr(normalizedCategory, normalizedQuery, effectiveFrom, effectiveTo, fullPageable);
        } else {
            if (actor.getDepartment() == null) {
                throw new BadRequestException("L’utilisateur n’a pas de département");
            }

            rawPage = searchPublishedForDept(
                    actor.getDepartment().getId(),
                    normalizedCategory,
                    normalizedQuery,
                    effectiveFrom,
                    effectiveTo,
                    fullPageable
            );
        }

        List<EventResponse> filtered = rawPage.getContent().stream()
                .filter(event -> matchesStatusFilter(event, status))
                .map(this::toResponse)
                .toList();

        return toPageResponse(filtered, pageable);
    }

    private Page<Event> searchPublishedForHr(
            String category,
            String q,
            Instant from,
            Instant to,
            Pageable pageable
    ) {
        if (category != null && q != null) {
            return eventRepository.searchPublishedPageWithCategoryAndTitle(category, q, from, to, pageable);
        }
        if (category != null) {
            return eventRepository.searchPublishedPageWithCategory(category, from, to, pageable);
        }
        if (q != null) {
            return eventRepository.searchPublishedPageWithTitle(q, from, to, pageable);
        }
        return eventRepository.searchPublishedPage(from, to, pageable);
    }

    private Page<Event> searchPublishedForDept(
            Long deptId,
            String category,
            String q,
            Instant from,
            Instant to,
            Pageable pageable
    ) {
        if (category != null && q != null) {
            return eventRepository.searchPublishedVisibleForDeptPageWithCategoryAndTitle(deptId, category, q, from, to, pageable);
        }
        if (category != null) {
            return eventRepository.searchPublishedVisibleForDeptPageWithCategory(deptId, category, from, to, pageable);
        }
        if (q != null) {
            return eventRepository.searchPublishedVisibleForDeptPageWithTitle(deptId, q, from, to, pageable);
        }
        return eventRepository.searchPublishedVisibleForDeptPage(deptId, from, to, pageable);
    }


    @Transactional
    public EventResponse unpublish(UUID eventId, String actorEmail, String ip) {
        Event e = eventRepository.findByIdWithCreatorDept(eventId)
                .orElseThrow(() -> new NotFoundException("Événement introuvable"));

        User actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

        authorizeManageEvent(actor, e);

        if (e.getStatus() != EventStatus.PUBLISHED) {
            throw new BadRequestException("Seuls les événements publiés peuvent revenir en brouillon");
        }

        if (e.getStartAt().isBefore(Instant.now())) {
            throw new BadRequestException("Impossible d’annuler la publication d’un événement déjà commencé");
        }

        e.setStatus(EventStatus.DRAFT);

        auditService.logByEmail(
                actorEmail,
                "EVENT_UNPUBLISHED",
                "EVENT",
                e.getId().toString(),
                ip,
                "{\"title\":\"" + escape(e.getTitle()) + "\"}"
        );

        return toResponse(e);
    }

    @Transactional
    public EmployeeEventSubmissionResponse submitByEmployee(CreateEventRequest req, String creatorEmail, String ip) {
        validateBusiness(req);
        User creator = userRepository.findByEmailWithRolesAndDepartment(creatorEmail)
                .orElseThrow(() -> new NotFoundException("Créateur introuvable"));

        boolean isHr = creator.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_HR"));
        boolean isManager = creator.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_MANAGER"));

        if (isHr || isManager) {
            throw new BadRequestException("Les administrateurs doivent utiliser le flux normal de création");
        }

        var targetDept = resolveEmployeeTargetDepartment(req, creator);

        Event event = new Event();
        event.setTitle(req.title());
        event.setCategory(req.category());
        event.setDescription(
                req.description() != null && !req.description().trim().isEmpty()
                        ? req.description().trim()
                        : null
        );
        event.setStartAt(req.startAt());
        event.setDurationMinutes(req.durationMinutes());
        event.setLocationType(req.locationType());
        event.setLocationName(req.locationName());
        event.setMeetingUrl(req.meetingUrl());
        event.setAddress(req.address());
        event.setCapacity(req.capacity());
        event.setRegistrationDeadline(req.registrationDeadline());
        event.setImageUrl(req.imageUrl());
        event.setCreatedBy(creator);
        event.setAudience(req.audience());
        event.setTargetDepartment(targetDept);

        boolean directPublish = canEmployeePublishDirectly(req);
        event.setStatus(directPublish ? EventStatus.PUBLISHED : EventStatus.PENDING);

        Event saved = eventRepository.save(event);

        auditService.logByEmail(
                creatorEmail,
                directPublish ? "EMPLOYEE_EVENT_DIRECT_PUBLISHED" : "EMPLOYEE_EVENT_SUBMITTED",
                "EVENT",
                saved.getId().toString(),
                ip,
                "{\"title\":\"" + escape(saved.getTitle()) + "\",\"status\":\"" + saved.getStatus() + "\"}"
        );

        if (!directPublish) {
            List<User> approvers = resolveApprovers(saved);
            notificationService.notifyEventProposalSubmitted(approvers, saved, creator);
            for (User approver : approvers) {
                emailService.sendEventProposalSubmittedEmail(approver.getEmail(), saved, creator);
            }
            notificationService.notifyProposalPendingForCreator(creator, saved);
            emailService.sendEventProposalPendingEmail(creator.getEmail(), saved);
        }

        return new EmployeeEventSubmissionResponse(
                saved.getId(),
                saved.getStatus(),
                directPublish,
                directPublish
                        ? "Événement partagé directement."
                        : "Demande envoyée aux administrateurs."
        );
    }

    @Transactional(readOnly = true)
    public PageResponse<EventResponse> listPendingApprovals(Pageable pageable, String actorEmail) {
        User actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

        boolean isHr = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_HR"));
        Page<Event> page;

        if (isHr) {
            page = eventRepository.findByStatusOrderByCreatedAtDesc(EventStatus.PENDING, pageable);
        } else {
            boolean isManager = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_MANAGER"));
            if (!isManager || actor.getDepartment() == null) {
                throw new BadRequestException("Action non autorisée");
            }

            page = eventRepository.findPendingForManagerDepartment(actor.getDepartment().getId(), pageable);
        }

        Page<EventResponse> dtoPage = page.map(this::toResponse);

        return new PageResponse<>(
                dtoPage.getContent(),
                dtoPage.getNumber(),
                dtoPage.getSize(),
                dtoPage.getTotalPages(),
                dtoPage.getTotalElements(),
                dtoPage.hasNext(),
                dtoPage.hasPrevious()
        );
    }

    @Transactional
    public EventResponse approvePendingAndPublish(UUID eventId, String actorEmail, String ip) {
        Event event = eventRepository.findByIdWithCreatorDept(eventId)
                .orElseThrow(() -> new NotFoundException("Événement introuvable"));

        User actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

        if (event.getStatus() != EventStatus.PENDING) {
            throw new BadRequestException("Seuls les événements en attente peuvent être approuvés");
        }

        authorizeReviewPendingEvent(actor, event);

        event.setStatus(EventStatus.PUBLISHED);
        event.setReviewedBy(actor);
        event.setReviewedAt(Instant.now());
        event.setReviewComment(null);

        auditService.logByEmail(
                actorEmail,
                "EVENT_APPROVED_AND_PUBLISHED",
                "EVENT",
                event.getId().toString(),
                ip,
                "{\"title\":\"" + escape(event.getTitle()) + "\"}"
        );

        notificationService.notifyEventProposalApproved(event.getCreatedBy(), event);
        emailService.sendEventProposalApprovedEmail(event.getCreatedBy().getEmail(), event);
        pointService.awardProposalApprovedBonus(event.getCreatedBy(), event);
        badgeService.evaluateAfterProposalApproved(event.getCreatedBy());

        List<User> visibleUsers = resolveVisibleEmployeeUsers(event);
        notificationService.notifyEventPublished(visibleUsers, event);

        return toResponse(event);
    }


    @Transactional
    public EventResponse rejectPending(UUID eventId, String reason, String actorEmail, String ip) {
        Event event = eventRepository.findByIdWithCreatorDept(eventId)
                .orElseThrow(() -> new NotFoundException("Événement introuvable"));

        User actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

        if (event.getStatus() != EventStatus.PENDING) {
            throw new BadRequestException("Seuls les événements en attente peuvent être refusés");
        }

        authorizeReviewPendingEvent(actor, event);

        event.setStatus(EventStatus.REJECTED);
        event.setReviewedBy(actor);
        event.setReviewedAt(Instant.now());
        event.setReviewComment(reason);

        auditService.logByEmail(
                actorEmail,
                "EVENT_REJECTED",
                "EVENT",
                event.getId().toString(),
                ip,
                "{\"reason\":\"" + escape(reason) + "\"}"
        );

        notificationService.notifyEventProposalRejected(event.getCreatedBy(), event, reason);
        emailService.sendEventProposalRejectedEmail(event.getCreatedBy().getEmail(), event, reason);

        return toResponse(event);
    }


    @Transactional(readOnly = true)
    public PageResponse<EventResponse> listMySubmissions(Pageable pageable, String actorEmail) {
        User actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

        Page<EventResponse> page = eventRepository
                .findByCreatedByOrderByCreatedAtDesc(actor, pageable)
                .map(this::toResponse);

        return new PageResponse<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalPages(),
                page.getTotalElements(),
                page.hasNext(),
                page.hasPrevious()
        );
    }

    @Transactional(readOnly = true)
    public EventResponse getPastVisibleById(UUID id) {
        Event e = eventRepository.findPastVisibleById(
                        id,
                        List.of(EventStatus.PUBLISHED, EventStatus.ARCHIVED),
                        Instant.now()
                )
                .orElseThrow(() -> new NotFoundException("Événement passé introuvable"));

        return toResponse(e);
    }

    private boolean canEmployeePublishDirectly(CreateEventRequest req) {
        return req.durationMinutes() != null
                && req.capacity() != null
                && req.durationMinutes() <= 35
                && req.capacity() <= 5;
    }

    private Department resolveEmployeeTargetDepartment( CreateEventRequest req, User creator ) {
        if (req.audience() == EventAudience.GLOBAL) {
            if (req.targetDepartmentId() != null) {
                throw new BadRequestException("Le champ targetDepartmentId doit être nul pour les événements globaux");
            }
            return null;
        }

        if (creator.getDepartment() == null) {
            throw new BadRequestException("L’employé n’a pas de département");
        }

        Long employeeDeptId = creator.getDepartment().getId();

        if (req.targetDepartmentId() != null && !req.targetDepartmentId().equals(employeeDeptId)) {
            throw new BadRequestException("Un employé ne peut proposer un événement départemental que pour son département");
        }

        return creator.getDepartment();
    }

    private List<User> resolveVisibleEmployeeUsers(Event event) {
        List<User> users;

        if (event.getAudience() == EventAudience.GLOBAL) {
            users = userRepository.findActiveVerifiedEmployeeUsers();
        } else {
            Long departmentId = event.getTargetDepartment() != null ? event.getTargetDepartment().getId() : null;
            if (departmentId == null) {
                return List.of();
            }
            users = userRepository.findActiveVerifiedEmployeeUsersByDepartmentId(departmentId);
        }

        UUID creatorId = event.getCreatedBy() != null ? event.getCreatedBy().getId() : null;

        return users.stream()
                .filter(user -> creatorId == null || !creatorId.equals(user.getId()))
                .toList();
    }


    private void authorizeReviewPendingEvent(User actor, Event event) {
        boolean isHr = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_HR"));
        if (isHr) {
            return;
        }

        boolean isManager = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_MANAGER"));
        if (!isManager) {
            throw new NotFoundException("Événement introuvable");
        }

        if (event.getAudience() != EventAudience.DEPARTMENT) {
            throw new NotFoundException("Événement introuvable");
        }

        Long actorDeptId = actor.getDepartment() != null ? actor.getDepartment().getId() : null;
        Long targetDeptId = event.getTargetDepartment() != null ? event.getTargetDepartment().getId() : null;

        if (actorDeptId == null || targetDeptId == null || !actorDeptId.equals(targetDeptId)) {
            throw new NotFoundException("Événement introuvable");
        }
    }

    private List<User> resolveApprovers(Event event) {
        List<User> hrUsers = userRepository.findActiveHrUsers();

        if (event.getAudience() == EventAudience.GLOBAL) {
            return hrUsers;
        }

        Long targetDeptId = event.getTargetDepartment() != null
                ? event.getTargetDepartment().getId()
                : null;

        if (targetDeptId == null) {
            return hrUsers;
        }

        List<User> managers = userRepository.findActiveManagersByDepartmentId(targetDeptId);

        return java.util.stream.Stream.concat(hrUsers.stream(), managers.stream())
                .distinct()
                .toList();
    }

    private void validateBusiness(CreateEventRequest req){
        if (req.registrationDeadline().isAfter(req.startAt()) || req.registrationDeadline().equals(req.startAt())){
            throw new BadRequestException("La date limite d’inscription doit être antérieure à la date de début de l’événement");
        }
        if (req.startAt().isBefore(Instant.now())){
            throw new BadRequestException("La date de début de l’événement doit être dans le futur");
        }
        if (req.locationType() == EventLocationType.ONLINE && (req.meetingUrl() == null || req.meetingUrl().isBlank())){
            throw new BadRequestException("Meeting URL est requise pour les événements EN LIGNE");
        }
        if (req.locationType() == EventLocationType.ONSITE && (req.locationName() == null || req.locationName().isBlank())){
            throw new BadRequestException("Le nom du lieu est requis pour les événements SUR SITE");
        }
    }


    private void validateBusinessForUpdate(UpdateEventRequest req){
        if (!req.registrationDeadline().isBefore(req.startAt())){
            throw new BadRequestException("La date limite d’inscription doit être antérieure à la date de début de l’événement");
        }

        if (req.locationType() == EventLocationType.ONLINE && (req.meetingUrl() == null || req.meetingUrl().isBlank())){
            throw new BadRequestException("Meeting URL est requise pour les événements EN LIGNE");
        }

        if (req.locationType() == EventLocationType.ONSITE && (req.locationName() == null || req.locationName().isBlank())){
            throw new BadRequestException("Le nom du lieu est requis pour les événements SUR SITE");
        }
    }


    private boolean matchesStatusFilter(Event event, String status) {
        if (status == null || status.isBlank() || status.equalsIgnoreCase("ALL")) {
            return true;
        }

        Instant now = Instant.now();
        boolean deadlinePassed = event.getRegistrationDeadline() != null
                && !event.getRegistrationDeadline().isAfter(now);

        long registeredCount = registrationRepository.countByEventAndStatus(
                event,
                RegistrationStatus.REGISTERED
        );

        boolean full = registeredCount >= event.getCapacity();

        return switch (status) {
            case "AVAILABLE" -> !deadlinePassed && !full;
            case "FULL" -> full;
            case "DEADLINE_PASSED" -> deadlinePassed && !full;
            default -> true;
        };
    }

    private <T> PageResponse<T> toPageResponse(List<T> items, Pageable pageable) {
        int totalItems = items.size();
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), totalItems);

        List<T> pageItems = start >= totalItems ? List.of() : items.subList(start, end);

        int totalPages = totalItems == 0 ? 1 : (int) Math.ceil((double) totalItems / pageable.getPageSize());

        return new PageResponse<>(
                pageItems,
                pageable.getPageNumber(),
                pageable.getPageSize(),
                totalPages,
                totalItems,
                end < totalItems,
                pageable.getPageNumber() > 0
        );
    }
    private EventResponse toResponse(Event e) {
        String createdByEmail = null;
        String createdByFullName = null;

        if (e.getCreatedBy() != null) {
            createdByEmail = e.getCreatedBy().getEmail();

            String firstName = e.getCreatedBy().getFirstName() != null ? e.getCreatedBy().getFirstName() : "";
            String lastName = e.getCreatedBy().getLastName() != null ? e.getCreatedBy().getLastName() : "";
            createdByFullName = (firstName + " " + lastName).trim();
        }

        Long targetDepartmentId = null;
        String targetDepartmentName = null;

        if (e.getTargetDepartment() != null) {
            targetDepartmentId = e.getTargetDepartment().getId();
            targetDepartmentName = e.getTargetDepartment().getName();
        }

        long registeredCount = registrationRepository.countByEventAndStatus(e, RegistrationStatus.REGISTERED);

        Long remainingCapacity = null;
        if (e.getCapacity() != null) {
            remainingCapacity = Math.max(0, e.getCapacity().longValue() - registeredCount);
        }

        List<String> participantAvatarUrls = registrationRepository
                .findByEventAndStatusOrderByRegisteredAtAsc(e, RegistrationStatus.REGISTERED)
                .stream()
                .map(reg -> reg.getUser().getAvatarUrl())
                .filter(url -> url != null && !url.isBlank())
                .limit(3)
                .toList();

        return new EventResponse(
                e.getId(),
                e.getTitle(),
                e.getCategory(),
                e.getDescription(),
                e.getStartAt(),
                e.getDurationMinutes(),
                e.getLocationType(),
                e.getLocationName(),
                e.getMeetingUrl(),
                e.getAddress(),
                e.getCapacity(),
                e.getRegistrationDeadline(),
                e.getStatus(),

                createdByEmail,
                createdByFullName,

                e.getAudience(),
                targetDepartmentId,
                targetDepartmentName,

                e.getCancelReason(),
                e.getCreatedAt(),
                e.getUpdatedAt(),
                e.getImageUrl(),

                registeredCount,
                remainingCapacity,
                participantAvatarUrls
        );
    }

    private void authorizeManageEvent(User actor, Event event) {
        boolean isHr = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_HR"));
        if (isHr) return;

        boolean isManager = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_MANAGER"));
        if (!isManager) {
            throw new NotFoundException("Événement introuvable");
        }

        // Dept de l'acteur
        Long actorDeptId = actor.getDepartment() != null ? actor.getDepartment().getId() : null;

        // Dept de l'event = dept du créateur
        Long eventDeptId = null;
        if (event.getCreatedBy() != null && event.getCreatedBy().getDepartment() != null) {
            eventDeptId = event.getCreatedBy().getDepartment().getId();
        }

        if (actorDeptId == null || eventDeptId == null || !actorDeptId.equals(eventDeptId)) {
            // On renvoie "not found" plutôt que "forbidden" pour ne pas révéler l'existence
            throw new NotFoundException("Événement introuvable");
        }
    }

}
