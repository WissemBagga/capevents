package com.capevents.backend.event;

import com.capevents.backend.audit.AuditService;
import com.capevents.backend.common.dto.PageResponse;
import com.capevents.backend.common.exception.BadRequestException;
import com.capevents.backend.common.exception.NotFoundException;
import com.capevents.backend.department.DepartmentRepository;
import com.capevents.backend.event.dto.CreateEventRequest;
import com.capevents.backend.event.dto.EventResponse;
import com.capevents.backend.event.dto.UpdateEventRequest;
import com.capevents.backend.registration.EventRegistrationRepository;
import com.capevents.backend.registration.EventRegistrationService;
import com.capevents.backend.registration.RegistrationStatus;
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
    private  final EventRegistrationRepository registrationRepository;

    public EventService(EventRepository eventRepository, UserRepository userRepository, AuditService auditService, DepartmentRepository departmentRepository, EventRegistrationRepository registrationRepository) {
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.departmentRepository = departmentRepository;
        this.registrationRepository = registrationRepository;
    }

    @Transactional
    public EventResponse createDraftEvent(CreateEventRequest req, String creatorEmail) {
        validateBusiness(req);

        User creator = userRepository.findByEmailWithRolesAndDepartment(creatorEmail)
                .orElseThrow(() -> new NotFoundException("Créateur introuvable"));

        boolean isHr = creator.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_HR"));
        boolean isManager = creator.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_MANAGER"));

        EventAudience audience = req.audience();

        // Règles audience
        if (audience == EventAudience.GLOBAL && !isHr) {
            throw new BadRequestException("Seuls les RH peuvent créer des événements globaux");
        }

        com.capevents.backend.department.Department targetDept = null;

        if (audience == EventAudience.DEPARTMENT) {
            if (isManager) {
                // manager : forcé sur son département
                if (creator.getDepartment() == null) throw new BadRequestException("Le manager n’a pas de département");

                Long managerDeptId = creator.getDepartment().getId();

                if (req.targetDepartmentId() != null && !req.targetDepartmentId().equals(managerDeptId)) {
                    throw new BadRequestException("Le manager ne peut pas créer des événements pour un autre département");
                }


                targetDept = creator.getDepartment();
            } else {
                // HR : doit préciser targetDepartmentId
                if (req.targetDepartmentId() == null) {
                    throw new BadRequestException("Le champ targetDepartmentId est requis pour les événements de type DÉPARTEMENT");
                }
                targetDept = departmentRepository.findById(req.targetDepartmentId())
                        .orElseThrow(() -> new NotFoundException("Département cible introuvable"));
            }
        } else {
            // GLOBAL
            if (req.targetDepartmentId() != null) {
                throw new BadRequestException("Le champ targetDepartmentId doit être nul pour les événements globaux");
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
                .orElseThrow(()-> new NotFoundException("Événement introuvable"));

        User actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));
        authorizeManageEvent(actor, e);


        if (e.getStatus() == EventStatus.ARCHIVED || e.getStatus() == EventStatus.CANCELLED){
            throw new BadRequestException("Impossible de publier un événement archivé ou annulé");
        }

        if (e.getStartAt().isBefore(Instant.now())){
            throw new BadRequestException("Impossible de publier un événement déjà commencé");
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
                .orElseThrow(()-> new NotFoundException("Événement introuvable"));

        if (e.getStatus() != EventStatus.PUBLISHED){
            throw new NotFoundException("Événement introuvable"); // pour chachee les non-published
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
                .orElseThrow(()-> new NotFoundException("Événement introuvable"));

        User actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

        authorizeManageEvent(actor, e);

        if (e.getStatus() == EventStatus.ARCHIVED || e.getStatus() == EventStatus.CANCELLED){
            throw new BadRequestException("Impossible de modifier un événement archivé ou annulé");
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
    public List<EventResponse> listForDepartment(String actorEmail) {
        var actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

        // HR : option 1 → voir tout
        boolean isHr = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_HR"));
        if (isHr) {
            return listAllForHr();
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

        return eventRepository.findAllByCreatorDepartment(deptId)
                .stream()
                .map(this::toResponse)
                .toList();
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
            Instant from,
            Instant to,
            Pageable pageable
    ) {
        var actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

        Instant now = Instant.now();

        Instant effectiveFrom = (from != null) ? from : now;
        Instant effectiveTo = (to != null) ? to : Instant.parse("9999-12-31T23:59:59Z");

        if (effectiveFrom.isAfter(effectiveTo)) {
            throw new BadRequestException("La date de début doit être antérieure ou égale à la date de fin");
        }

        String normalizedCategory = (category != null && !category.trim().isEmpty())
            ? category.trim()
            : null;

        boolean isHr = actor.getRoles().stream()
                .anyMatch(r -> r.getCode().equals("ROLE_HR"));

        Page<Event> page;

        if (isHr) {
            page = eventRepository.searchPublishedPage(
                    normalizedCategory,
                    effectiveFrom,
                    effectiveTo,
                    pageable
            );
        } else {
            if (actor.getDepartment() == null) {
                throw new BadRequestException("L’utilisateur n’a pas de département");
            }

            Long deptId = actor.getDepartment().getId();

            page = eventRepository.searchPublishedVisibleForDeptPage(
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
                remainingCapacity
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
