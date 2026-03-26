package com.capevents.backend.invitation;

import com.capevents.backend.common.exception.BadRequestException;
import com.capevents.backend.common.exception.NotFoundException;
import com.capevents.backend.event.Event;
import com.capevents.backend.event.EventRepository;
import com.capevents.backend.event.EventStatus;
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
        validateRequest(req);

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

    private void validateEventInvitable(Event event) {
        if (event.getStatus() != EventStatus.PUBLISHED) {
            throw new BadRequestException("Les invitations ne sont autorisées que pour les événements publiés.");
        }
    }

    private void validateRequest(SendInvitationRequest req) {
        if (req.targetType() == null) {
            throw new BadRequestException("Le type de cible est requis");
        }

        if (req.targetType() == InvitationTargetType.DEPARTMENT && req.departmentId() == null) {
            throw new BadRequestException("Le département est requis pour les invitations de type département");
        }

        if (req.targetType() == InvitationTargetType.INDIVIDUAL &&
                (req.userEmails() == null || req.userEmails().isEmpty())) {
            throw new BadRequestException("Au moins une adresse e-mail d’utilisateur est requise pour les invitations individuelles");
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
                .map(String::toLowerCase)
                .collect(java.util.stream.Collectors.toSet());

        List<User> users = userRepository.findAll().stream()
                .filter(User::isActive)
                .filter(user -> emails.contains(user.getEmail().toLowerCase()))
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
        Long eventDeptId = null;

        if (event.getCreatedBy() != null && event.getCreatedBy().getDepartment() != null) {
            eventDeptId = event.getCreatedBy().getDepartment().getId();
        }

        if (actorDeptId == null || eventDeptId == null || !actorDeptId.equals(eventDeptId)) {
            throw new NotFoundException("Événement introuvable");
        }
    }
}