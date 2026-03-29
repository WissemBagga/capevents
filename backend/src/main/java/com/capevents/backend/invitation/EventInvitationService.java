package com.capevents.backend.invitation;

import com.capevents.backend.common.exception.BadRequestException;
import com.capevents.backend.common.exception.NotFoundException;
import com.capevents.backend.event.Event;
import com.capevents.backend.event.EventRepository;
import com.capevents.backend.event.EventStatus;
import com.capevents.backend.invitation.dto.AdminEventInvitationResponse;
import com.capevents.backend.invitation.dto.SendInvitationRequest;
import com.capevents.backend.invitation.dto.SendInvitationResponse;
import com.capevents.backend.registration.EventRegistrationRepository;
import com.capevents.backend.registration.RegistrationStatus;
import com.capevents.backend.user.User;
import com.capevents.backend.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class EventInvitationService {

    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final EventInvitationRepository invitationRepository;
    private final EventRegistrationRepository registrationRepository;

    public EventInvitationService(
            EventRepository eventRepository,
            UserRepository userRepository,
            EventInvitationRepository invitationRepository,
            EventRegistrationRepository registrationRepository
    ) {
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
        this.invitationRepository = invitationRepository;
        this.registrationRepository = registrationRepository;
    }

    @Transactional
    public SendInvitationResponse sendInvitations(UUID eventId, SendInvitationRequest req, String actorEmail) {
        Event event = eventRepository.findByIdWithCreatorDept(eventId)
                .orElseThrow(() -> new NotFoundException("Événement introuvable"));

        User actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

        authorizeInvitation(actor, event);
        validateEventInvitable(event);
        validateRequest(req, actor);

        List<User> targets = resolveTargets(req, actor);

        int created = 0;
        int skipped = 0;

        for (User target : targets) {
            if (invitationRepository.existsByEventAndUser(event, target)) {
                skipped++;
                continue;
            }

            boolean alreadyRegistered = registrationRepository.existsByEventAndUserAndStatus(
                    event, target, RegistrationStatus.REGISTERED
            );
            if (alreadyRegistered) {
                skipped++;
                continue;
            }

            EventInvitation invitation = new EventInvitation();
            invitation.setEvent(event);
            invitation.setUser(target);
            invitation.setInvitedBy(actor);
            invitation.setTargetType(req.targetType());
            invitation.setStatus(InvitationStatus.PENDING);
            invitation.setMessage(req.message());
            invitation.setSentAt(Instant.now());

            invitationRepository.save(invitation);
            created++;
        }

        return new SendInvitationResponse(
                created,
                skipped,
                created + " invitation(s) created, " + skipped + " skipped"
        );
    }


    @Transactional(readOnly = true)
    public List<AdminEventInvitationResponse> getEventInvitations(UUID eventId, String actorEmail) {
        Event event = eventRepository.findByIdWithCreatorDept(eventId)
                .orElseThrow(() -> new NotFoundException("Événement introuvable"));

        User actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

        authorizeInvitation(actor, event);

        return invitationRepository.findByEventOrderBySentAtDesc(event).stream()
                .map(this::toAdminInvitationResponse)
                .toList();
    }

    private AdminEventInvitationResponse toAdminInvitationResponse(EventInvitation invitation) {
        User invitedUser = invitation.getUser();

        String departmentName = null;
        if (invitedUser.getDepartment() != null) {
            departmentName = invitedUser.getDepartment().getName();
        }

        return new AdminEventInvitationResponse(
                buildFullName(invitedUser.getFirstName(), invitedUser.getLastName()),
                invitedUser.getEmail(),
                departmentName,
                invitation.getTargetType(),
                invitation.getStatus(),
                invitation.getMessage(),
                invitation.getSentAt(),
                buildFullName(
                        invitation.getInvitedBy().getFirstName(),
                        invitation.getInvitedBy().getLastName()
                )
        );
    }

    private String buildFullName(String firstName, String lastName) {
        String first = firstName == null ? "" : firstName.trim();
        String last = lastName == null ? "" : lastName.trim();

        String fullName = (first + " " + last).trim();
        return fullName.isBlank() ? "-" : fullName;
    }

    private void validateEventInvitable(Event event) {
        if (event.getStatus() != EventStatus.PUBLISHED) {
            throw new BadRequestException("Les invitations ne sont autorisées que pour les événements publiés.");
        }
    }

    private void validateRequest(SendInvitationRequest req, User actor) {
        if (req.targetType() == null) {
            throw new BadRequestException("Le type de cible est requis");
        }

        boolean isHr = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_HR"));
        boolean isManager = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_MANAGER"));


        switch (req.targetType()){
            case GLOBAL -> {
                if (isManager && !isHr) {
                    throw new BadRequestException("Un manager ne peut pas envoyer d’invitations GLOBAL");
                }

                if (req.departmentId() != null) {
                    throw new BadRequestException("departmentId must be empty for a GLOBAL invitation");
                }
                if (req.userEmails() != null && !req.userEmails().isEmpty()) {
                    throw new BadRequestException("userEmails must be empty for a GLOBAL invitation");
                }
            }
            case DEPARTMENT -> {
                if (req.departmentId() == null) {
                    throw new BadRequestException("The department is required for department-type invitations");
                }
                if (req.userEmails() != null && !req.userEmails().isEmpty()) {
                    throw new BadRequestException("userEmails must be empty for a DEPARTMENT invitation");
                }
            }

            case INDIVIDUAL -> {
                if (req.userEmails() == null || req.userEmails().isEmpty()) {
                    throw new BadRequestException("Au moins une adresse e-mail d’utilisateur est requise pour les invitations individuelles");
                }
                if (req.departmentId() != null) {
                    throw new BadRequestException("departmentId must be empty for an INDIVIDUAL invitation");
                }
            }

            default -> throw new BadRequestException("Target type not supported");
        }
    }

    private List<User> resolveTargets(SendInvitationRequest req, User actor) {
        if (req.targetType() == InvitationTargetType.GLOBAL) {
            return resolveGlobalTargets();
        }

        if (req.targetType() == InvitationTargetType.DEPARTMENT) {
            return resolveDepartmentTargets(req.departmentId(), actor);
        }

        if (req.targetType() == InvitationTargetType.INDIVIDUAL) {
            return resolveIndividualTargets(req.userEmails(), actor);
        }

        throw new BadRequestException("Unsupported target type");
    }

    private List<User> resolveGlobalTargets() {
        return userRepository.findAll().stream()
                .filter(User::isActive)
                .toList();
    }

    private List<User> resolveDepartmentTargets(Long departmentId, User actor) {
        boolean isHr = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_HR"));

        if (!isHr) {
            Long actorDeptId = actor.getDepartment() != null ? actor.getDepartment().getId() : null;
            if (actorDeptId == null || !actorDeptId.equals(departmentId)) {
                throw new BadRequestException("You can only invite your own department");
            }
        }

        return userRepository.findAll().stream()
                .filter(User::isActive)
                .filter(user -> user.getDepartment() != null)
                .filter(user -> user.getDepartment().getId().equals(departmentId))
                .toList();
    }

    private List<User> resolveIndividualTargets(List<String> userEmails, User actor) {
        Set<String> emails = userEmails.stream()
                .filter(java.util.Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .map(String::toLowerCase)
                .collect(Collectors.toSet());

        List<User> users = userRepository.findAll().stream()
                .filter(User::isActive)
                .filter(user -> user.getEmail() != null)
                .filter(user -> emails.contains(user.getEmail().trim().toLowerCase()))
                .toList();

        boolean isHr = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_HR"));
        if (isHr) {
            return users;
        }

        Long actorDeptId = actor.getDepartment() != null ? actor.getDepartment().getId() : null;

        return users.stream()
                .filter(user -> user.getDepartment() != null)
                .filter(user -> actorDeptId != null && actorDeptId.equals(user.getDepartment().getId()))
                .toList();
    }

    private void authorizeInvitation(User actor, Event event) {
        boolean isHr = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_HR"));
        if (isHr) return;

        boolean isManager = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_MANAGER"));
        if (!isManager) {
            throw new NotFoundException("Événement introuvable");
        }

        Long actorDeptId = actor.getDepartment() != null ? actor.getDepartment().getId() : null;
        Long eventDeptId = event.getTargetDepartment() != null ? event.getTargetDepartment().getId() : null;

        if (actorDeptId == null || eventDeptId == null || !actorDeptId.equals(eventDeptId)) {
            throw new NotFoundException("Événement introuvable");
        }
    }
}