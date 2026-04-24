package com.capevents.backend.points;

import com.capevents.backend.common.exception.NotFoundException;
import com.capevents.backend.event.Event;
import com.capevents.backend.points.dto.MyPointsResponse;
import com.capevents.backend.points.dto.PointTransactionResponse;
import com.capevents.backend.rewards.RewardCode;
import com.capevents.backend.rewards.RewardRedemptionRepository;
import com.capevents.backend.user.User;
import com.capevents.backend.user.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class PointService {

    private static final String USER_NOT_FOUND_MESSAGE = "Utilisateur introuvable";

    private final PointTransactionRepository pointTransactionRepository;
    private final UserRepository userRepository;
    private final RewardRedemptionRepository rewardRedemptionRepository;

    public PointService(
            PointTransactionRepository pointTransactionRepository,
            UserRepository userRepository, RewardRedemptionRepository rewardRedemptionRepository
    ) {
        this.pointTransactionRepository = pointTransactionRepository;
        this.userRepository = userRepository;
        this.rewardRedemptionRepository = rewardRedemptionRepository;
    }

    @Transactional
    public void awardRegistrationBonus(User user, Event event) {
        saveTransaction(
                user,
                event,
                PointTransactionType.REGISTRATION_BONUS,
                10,
                "Inscription à l’événement"
        );
    }

    @Transactional
    public void applyUnregisterPenalty(User user, Event event) {
        saveTransaction(
                user,
                event,
                PointTransactionType.UNREGISTER_PENALTY,
                -10,
                "Désinscription volontaire"
        );
    }

    @Transactional
    public void awardAttendancePresentBonus(User user, Event event) {
        if (pointTransactionRepository.existsByUserIdAndEventIdAndType(
                user.getId(),
                event.getId(),
                PointTransactionType.ATTENDANCE_PRESENT_BONUS
        )) {
            return;
        }

        saveTransaction(
                user,
                event,
                PointTransactionType.ATTENDANCE_PRESENT_BONUS,
                50,
                "Présence confirmée"
        );
    }

    @Transactional
    public void applyAttendanceAbsentPenalty(User user, Event event) {
        if (pointTransactionRepository.existsByUserIdAndEventIdAndType(
                user.getId(),
                event.getId(),
                PointTransactionType.ATTENDANCE_ABSENT_PENALTY
        )) {
            return;
        }

        saveTransaction(
                user,
                event,
                PointTransactionType.ATTENDANCE_ABSENT_PENALTY,
                -15,
                "Absent après inscription"
        );
    }

    @Transactional
    public void awardFeedbackBonus(User user, Event event) {
        if (pointTransactionRepository.existsByUserIdAndEventIdAndType(
                user.getId(),
                event.getId(),
                PointTransactionType.FEEDBACK_BONUS
        )) {
            return;
        }

        saveTransaction(
                user,
                event,
                PointTransactionType.FEEDBACK_BONUS,
                20,
                "Feedback envoyé"
        );
    }

    @Transactional
    public void awardProposalApprovedBonus(User user, Event event) {
        if (pointTransactionRepository.existsByUserIdAndEventIdAndType(
                user.getId(),
                event.getId(),
                PointTransactionType.EVENT_PROPOSAL_APPROVED_BONUS
        )) {
            return;
        }

        saveTransaction(
                user,
                event,
                PointTransactionType.EVENT_PROPOSAL_APPROVED_BONUS,
                100,
                "Proposition d’événement approuvée"
        );
    }

    @Transactional(readOnly = true)
    public MyPointsResponse getMyPoints(String userEmail, int limit) {
        User user = userRepository.findByEmailWithRolesAndDepartment(userEmail.toLowerCase())
                .orElseThrow(() -> new NotFoundException(USER_NOT_FOUND_MESSAGE));

        int safeLimit = Math.min(Math.max(limit, 1), 100);

        long totalPoints = getCurrentBalance(user.getId());

        var history = pointTransactionRepository
                .findByUserIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(0, safeLimit))
                .stream()
                .map(pt -> new PointTransactionResponse(
                        pt.getId(),
                        pt.getType().name(),
                        pt.getPointsDelta(),
                        pt.getReason(),
                        pt.getEvent().getId(),
                        pt.getEvent().getTitle(),
                        pt.getCreatedAt()
                ))
                .toList();

        return new MyPointsResponse(totalPoints, history);
    }


    @Transactional
    public void spendPointsForReward(User user, RewardCode rewardCode) {
        saveTransaction(
                user,
                null,
                PointTransactionType.REWARD_REDEMPTION_SPENT,
                -rewardCode.getPointsCost(),
                "Échange de récompense : " + rewardCode.getTitle()
        );
    }

    @Transactional
    public void refundRewardPoints(User user, RewardCode rewardCode) {
        saveTransaction(
                user,
                null,
                PointTransactionType.REWARD_REDEMPTION_REFUND,
                rewardCode.getPointsCost(),
                "Remboursement de récompense refusée : " + rewardCode.getTitle()
        );
    }

    @Transactional(readOnly = true)
    public long getCurrentBalance(UUID userId) {
        return pointTransactionRepository.sumPointsByUserId(userId);
    }

    private void saveTransaction(
            User user,
            Event event,
            PointTransactionType type,
            int pointsDelta,
            String reason
    ) {
        PointTransaction transaction = new PointTransaction();
        transaction.setUser(user);
        transaction.setEvent(event);
        transaction.setType(type);
        transaction.setPointsDelta(pointsDelta);
        transaction.setReason(reason);

        pointTransactionRepository.save(transaction);
    }

}