package com.capevents.backend.service;

import com.capevents.backend.exception.NotFoundException;
import com.capevents.backend.entity.UserBadge;
import com.capevents.backend.entity.enums.BadgeCode;
import com.capevents.backend.dto.BadgeProgressResponse;
import com.capevents.backend.dto.MyBadgesResponse;
import com.capevents.backend.repository.*;
import com.capevents.backend.entity.enums.PointTransactionType;
import com.capevents.backend.entity.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
public class BadgeService {

    private static final String USER_NOT_FOUND_MESSAGE = "Utilisateur introuvable";

    private final UserBadgeRepository userBadgeRepository;
    private final UserRepository userRepository;
    private final EventRegistrationRepository registrationRepository;
    private final EventFeedbackRepository feedbackRepository;
    private final PointTransactionRepository pointTransactionRepository;

    public BadgeService(
            UserBadgeRepository userBadgeRepository,
            UserRepository userRepository,
            EventRegistrationRepository registrationRepository,
            EventFeedbackRepository feedbackRepository,
            PointTransactionRepository pointTransactionRepository
    ) {
        this.userBadgeRepository = userBadgeRepository;
        this.userRepository = userRepository;
        this.registrationRepository = registrationRepository;
        this.feedbackRepository = feedbackRepository;
        this.pointTransactionRepository = pointTransactionRepository;
    }

    @Transactional
    public void evaluateAfterAttendancePresent(User user) {
        evaluateAllForUser(user);
    }

    @Transactional
    public void evaluateAfterFeedback(User user) {
        evaluateAllForUser(user);
    }

    @Transactional
    public void evaluateAfterProposalApproved(User user) {
        evaluateAllForUser(user);
    }

    @Transactional
    public void evaluateAllForUser(User user) {
        long presentCount = registrationRepository.countPresentParticipationsByUserId(user.getId());
        long presentLast30Days = registrationRepository.countPresentParticipationsByUserIdSince(
                user.getId(),
                Instant.now().minus(30, ChronoUnit.DAYS)
        );
        long feedbackCount = feedbackRepository.countByUserId(user.getId());
        long approvedProposalCount = pointTransactionRepository.countByUserIdAndType(
                user.getId(),
                PointTransactionType.EVENT_PROPOSAL_APPROVED_BONUS
        );

        unlockIfEligible(user, BadgeCode.FIRST_STEP, presentCount >= 1);
        unlockIfEligible(user, BadgeCode.CHAMPION, presentCount >= 10);
        unlockIfEligible(user, BadgeCode.ON_FIRE, presentLast30Days >= 5);
        unlockIfEligible(user, BadgeCode.CRITIC, feedbackCount >= 20);
        unlockIfEligible(user, BadgeCode.INNOVATOR, approvedProposalCount >= 1);
    }

    @Transactional(readOnly = true)
    public MyBadgesResponse getMyBadges(String userEmail) {
        User user = userRepository.findByEmailWithRolesAndDepartment(userEmail.toLowerCase())
                .orElseThrow(() -> new NotFoundException(USER_NOT_FOUND_MESSAGE));

        long presentCount = registrationRepository.countPresentParticipationsByUserId(user.getId());
        long presentLast30Days = registrationRepository.countPresentParticipationsByUserIdSince(
                user.getId(),
                Instant.now().minus(30, ChronoUnit.DAYS)
        );
        long feedbackCount = feedbackRepository.countByUserId(user.getId());
        long approvedProposalCount = pointTransactionRepository.countByUserIdAndType(
                user.getId(),
                PointTransactionType.EVENT_PROPOSAL_APPROVED_BONUS
        );

        Map<BadgeCode, UserBadge> unlockedMap = new EnumMap<>(BadgeCode.class);
        for (UserBadge badge : userBadgeRepository.findByUserIdOrderByUnlockedAtDesc(user.getId())) {
            unlockedMap.put(badge.getBadgeCode(), badge);
        }

        List<BadgeProgressResponse> badges = List.of(
                        toBadgeResponse(BadgeCode.FIRST_STEP, unlockedMap.get(BadgeCode.FIRST_STEP), (int) presentCount, 1),
                        toBadgeResponse(BadgeCode.CHAMPION, unlockedMap.get(BadgeCode.CHAMPION), (int) presentCount, 10),
                        toBadgeResponse(BadgeCode.ON_FIRE, unlockedMap.get(BadgeCode.ON_FIRE), (int) presentLast30Days, 5),
                        toBadgeResponse(BadgeCode.CRITIC, unlockedMap.get(BadgeCode.CRITIC), (int) feedbackCount, 20),
                        toBadgeResponse(BadgeCode.INNOVATOR, unlockedMap.get(BadgeCode.INNOVATOR), (int) approvedProposalCount, 1)
                ).stream()
                .sorted(Comparator.comparing(BadgeProgressResponse::unlocked).reversed()
                        .thenComparing(BadgeProgressResponse::title))
                .toList();

        return new MyBadgesResponse(badges);
    }

    private void unlockIfEligible(User user, BadgeCode code, boolean eligible) {
        if (!eligible) {
            return;
        }

        if (userBadgeRepository.existsByUserIdAndBadgeCode(user.getId(), code)) {
            return;
        }

        UserBadge badge = new UserBadge();
        badge.setUser(user);
        badge.setBadgeCode(code);
        badge.setUnlockedAt(Instant.now());

        userBadgeRepository.save(badge);
    }

    private BadgeProgressResponse toBadgeResponse(BadgeCode code, UserBadge unlockedBadge, int rawProgress, int target) {
        int progress = Math.min(rawProgress, target);

        return new BadgeProgressResponse(
                code.name(),
                badgeTitle(code),
                badgeDescription(code),
                unlockedBadge != null,
                unlockedBadge != null ? unlockedBadge.getUnlockedAt() : null,
                progress,
                target
        );
    }

    private String badgeTitle(BadgeCode code) {
        return switch (code) {
            case FIRST_STEP -> "First Step";
            case CHAMPION -> "Champion";
            case ON_FIRE -> "On Fire";
            case CRITIC -> "Critique";
            case INNOVATOR -> "Innovateur";
        };
    }

    private String badgeDescription(BadgeCode code) {
        return switch (code) {
            case FIRST_STEP -> "Débloqué après votre première participation validée.";
            case CHAMPION -> "Débloqué après 10 participations validées.";
            case ON_FIRE -> "Débloqué après 5 participations validées sur 30 jours.";
            case CRITIC -> "Débloqué après 20 feedbacks envoyés.";
            case INNOVATOR -> "Débloqué après votre première proposition acceptée.";
        };
    }
}