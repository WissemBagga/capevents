package com.capevents.backend.event;

import com.capevents.backend.audit.AuditService;
import com.capevents.backend.common.dto.PageResponse;
import com.capevents.backend.common.exception.BadRequestException;
import com.capevents.backend.common.exception.NotFoundException;
import com.capevents.backend.department.DepartmentRepository;
import com.capevents.backend.event.dto.CreateEventRequest;
import com.capevents.backend.event.dto.EventResponse;
import com.capevents.backend.event.dto.UpdateEventRequest;
import com.capevents.backend.user.User;
import com.capevents.backend.user.UserRepository;
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

    public EventService(EventRepository eventRepository, UserRepository userRepository, AuditService auditService, DepartmentRepository departmentRepository) {
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.departmentRepository = departmentRepository;
    }

    @Transactional
    public EventResponse createDraftEvent(CreateEventRequest req, String creatorEmail) {
        validateBusiness(req);

        User creator = userRepository.findByEmailWithRolesAndDepartment(creatorEmail)
                .orElseThrow(() -> new NotFoundException("Creator user not found"));

        boolean isHr = creator.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_HR"));
        boolean isManager = creator.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_MANAGER"));

        EventAudience audience = req.audience();

        // Règles audience
        if (audience == EventAudience.GLOBAL && !isHr) {
            throw new BadRequestException("Only HR can create GLOBAL events");
        }

        com.capevents.backend.department.Department targetDept = null;

        if (audience == EventAudience.DEPARTMENT) {
            if (isManager) {
                // manager : forcé sur son département
                if (creator.getDepartment() == null) throw new BadRequestException("Manager has no department");

                Long managerDeptId = creator.getDepartment().getId();

                if (req.targetDepartmentId() != null && !req.targetDepartmentId().equals(managerDeptId)) {
                    throw new BadRequestException("Manager cannot create events for another department");
                }


                targetDept = creator.getDepartment();
            } else {
                // HR : doit préciser targetDepartmentId
                if (req.targetDepartmentId() == null) {
                    throw new BadRequestException("targetDepartmentId is required for DEPARTMENT events");
                }
                targetDept = departmentRepository.findById(req.targetDepartmentId())
                        .orElseThrow(() -> new NotFoundException("Target department not found"));
            }
        } else {
            // GLOBAL
            if (req.targetDepartmentId() != null) {
                throw new BadRequestException("targetDepartmentId must be null for GLOBAL events");
            }
        }

        Event e = new Event();
        e.setTitle(req.title());
        e.setCategory(req.category());
        e.setDescription(req.description());
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
                .orElseThrow(()-> new NotFoundException("Event not found"));

        User actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail)
                .orElseThrow(() -> new NotFoundException("User not found"));
        authorizeManageEvent(actor, e);


        if (e.getStatus() == EventStatus.ARCHIVED || e.getStatus() == EventStatus.CANCELLED){
            throw new BadRequestException("Cannot publish an archived or cancelled event");
        }

        if (e.getStartAt().isBefore(Instant.now())){
            throw new BadRequestException("Cannot publish an event that has already started");
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

        return  toResponse(e);
    }



    //
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
                .orElseThrow(()-> new NotFoundException("Event not found"));

        if (e.getStatus() != EventStatus.PUBLISHED){
            throw new NotFoundException("Event not found"); // pour chachee les non-published
        }
        return toResponse(e);
    }


    @Transactional(readOnly = true)
    public EventResponse getPublishedForUserDept(UUID id, String actorEmail) {
        var actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail)
                .orElseThrow(() -> new NotFoundException("User not found"));

        boolean isHr = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_HR"));
        if (isHr) {
            return getPublishedById(id);
        }

        if (actor.getDepartment() == null) throw new BadRequestException("User has no department");


        var e = eventRepository.findPublishedByIdVisibleForDept(id, actor.getDepartment().getId())
                .orElseThrow(() -> new NotFoundException("Event not found"));


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

    @Transactional(readOnly = true)
    public List<EventResponse> listAllForHr() {
        return eventRepository
                .findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }


    @Transactional
    public EventResponse update(UUID id, UpdateEventRequest req, String actorEmail, String ip){
        validateBusinessForUpdate(req);

        Event e = eventRepository.findByIdWithCreatorDept(id)
                .orElseThrow(()-> new NotFoundException("Event not found"));

        User actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail)
                .orElseThrow(() -> new NotFoundException("User not found"));

        authorizeManageEvent(actor, e);

        if (e.getStatus() == EventStatus.ARCHIVED || e.getStatus() == EventStatus.CANCELLED){
            throw new BadRequestException("Cannot update an archived or cancelled event");
        }

        e.setTitle(req.title());
        e.setCategory(req.category());
        e.setDescription(req.description());
        e.setStartAt(req.startAt());
        e.setDurationMinutes(req.durationMinutes());
        e.setLocationType(req.locationType());
        e.setLocationName(req.locationName());
        e.setMeetingUrl(req.meetingUrl());
        e.setAddress(req.address());
        e.setCapacity(req.capacity());
        e.setRegistrationDeadline(req.registrationDeadline());
        e.setImageUrl(req.imageUrl());



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
                .orElseThrow(()-> new NotFoundException("Event not found"));

        User actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail)
                .orElseThrow(() -> new NotFoundException("User not found"));

        authorizeManageEvent(actor, e);

        if (e.getStatus() == EventStatus.ARCHIVED){
            throw new BadRequestException("Event already archived");
        }

        if (e.getStatus() == EventStatus.CANCELLED){
            throw new BadRequestException("Event already cancelled");
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
        return toResponse(e);
    }

    private String escape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    @Transactional
    public EventResponse archive(UUID id, String actorEmail, String ip){
        Event e = eventRepository.findByIdWithCreatorDept(id)
                .orElseThrow(()-> new NotFoundException("Event not found"));

        User actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail)
                .orElseThrow(() -> new NotFoundException("User not found"));

        authorizeManageEvent(actor, e);


        if (e.getStatus() == EventStatus.ARCHIVED){
            throw new BadRequestException("Event already archived");
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
                .orElseThrow(() -> new NotFoundException("User not found"));

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

        if (actor.getDepartment() == null) throw new BadRequestException("User has no department");

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
    public List<EventResponse> listForDepartment(String actorEmail) {
        var actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail)
                .orElseThrow(() -> new NotFoundException("User not found"));

        // HR : option 1 → voir tout
        boolean isHr = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_HR"));
        if (isHr) {
            return listAllForHr();
        }

        // Manager : doit avoir un dept
        boolean isManager = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_MANAGER"));
        if (!isManager) {
            throw new BadRequestException("Not allowed");
        }

        if (actor.getDepartment() == null) {
            throw new BadRequestException("Manager has no department");
        }

        Long deptId = actor.getDepartment().getId();

        return eventRepository.findAllByCreatorDepartment(deptId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<EventResponse> searchPublishedForUserDept(
            String actorEmail,
            String category,
            Instant from,
            Instant to,
            Pageable pageable
    ) {
        var actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail)
                .orElseThrow(() -> new NotFoundException("User not found"));

        Instant now = Instant.now();

        Instant effectiveFrom = (from != null) ? from : now;
        Instant effectiveTo = (to != null) ? to : Instant.parse("9999-12-31T23:59:59Z");

        if (effectiveFrom.isAfter(effectiveTo)) {
            throw new BadRequestException("from must be before or equal to to");
        }

        boolean isHr = actor.getRoles().stream()
                .anyMatch(r -> r.getCode().equals("ROLE_HR"));

        Page<Event> page;

        if (isHr) {
            page = eventRepository.searchPublishedPage(
                    now,
                    category,
                    effectiveFrom,
                    effectiveTo,
                    pageable
            );
        } else {
            if (actor.getDepartment() == null) {
                throw new BadRequestException("User has no department");
            }

            Long deptId = actor.getDepartment().getId();

            page = eventRepository.searchPublishedVisibleForDeptPage(
                    now,
                    deptId,
                    category,
                    effectiveFrom,
                    effectiveTo,
                    pageable
            );
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

    private void validateBusiness(CreateEventRequest req){
        if (req.registrationDeadline().isAfter(req.startAt()) || req.registrationDeadline().equals(req.startAt())){
            throw new BadRequestException("Registration deadline must be before event start time");
        }
        if (req.startAt().isBefore(Instant.now())){
            throw new BadRequestException("Event start time must be in the future");
        }
        if (req.locationType() == EventLocationType.ONLINE && (req.meetingUrl() == null || req.meetingUrl().isBlank())){
            throw new BadRequestException("Meeting URL is required for ONLINE events");
        }
        if (req.locationType() == EventLocationType.ONSITE && (req.locationName() == null || req.locationName().isBlank())){
            throw new BadRequestException("Location name is required for ONSITE events");
        }
    }


    private void validateBusinessForUpdate(UpdateEventRequest req){
        if (!req.registrationDeadline().isBefore(req.startAt())){
            throw new BadRequestException("Registration deadline must be before event start time");
        }

        if (req.locationType() == EventLocationType.ONLINE && (req.meetingUrl() == null || req.meetingUrl().isBlank())){
            throw new BadRequestException("Meeting URL is required for ONLINE events");
        }

        if (req.locationType() == EventLocationType.ONSITE && (req.locationName() == null || req.locationName().isBlank())){
            throw new BadRequestException("Location name is required for ONSITE events");
        }
    }
    private EventResponse toResponse(Event e){
        String email = null;
        if (e.getCreatedBy() != null) {
            email = e.getCreatedBy().getEmail();
        }

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
                email,
                e.getCreatedAt(),
                e.getUpdatedAt(),
                e.getImageUrl()
        );
    }

    private void authorizeManageEvent(User actor, Event event) {
        boolean isHr = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_HR"));
        if (isHr) return;

        boolean isManager = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_MANAGER"));
        if (!isManager) {
            throw new NotFoundException("Event not found");
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
            throw new NotFoundException("Event not found");
        }
    }

}
