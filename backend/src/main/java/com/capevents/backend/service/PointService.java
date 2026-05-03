package com.capevents.backend.service;

import com.capevents.backend.dto.LeaderboardParticipantResponse;
import com.capevents.backend.dto.LeaderboardResponse;
import com.capevents.backend.exception.NotFoundException;
import com.capevents.backend.entity.Event;
import com.capevents.backend.entity.PointTransaction;
import com.capevents.backend.entity.enums.PointTransactionType;
import com.capevents.backend.dto.MyPointsResponse;
import com.capevents.backend.dto.PointTransactionResponse;
import com.capevents.backend.repository.PointTransactionRepository;
import com.capevents.backend.entity.enums.RewardCode;
import com.capevents.backend.repository.RewardRedemptionRepository;
import com.capevents.backend.entity.User;
import com.capevents.backend.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class PointService {

    private static final String USER_NOT_FOUND_MESSAGE = "Utilisateur introuvable";

    private final PointTransactionRepository pointTransactionRepository;
    private final UserRepository userRepository;

    public PointService(
            PointTransactionRepository pointTransactionRepository,
            UserRepository userRepository, RewardRedemptionRepository rewardRedemptionRepository
    ) {
        this.pointTransactionRepository = pointTransactionRepository;
        this.userRepository = userRepository;
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
                .map(this::toPointTransactionResponse)
                .toList();

        return new MyPointsResponse(totalPoints, history);
    }

    @Transactional(readOnly = true)
    public LeaderboardResponse getLeaderboard(String userEmail) {
        User currentUser = userRepository.findByEmailWithRolesAndDepartment(userEmail.toLowerCase())
                .orElseThrow(() -> new NotFoundException(USER_NOT_FOUND_MESSAGE));

        java.util.List<User> employees = userRepository.findActiveVerifiedEmployeeUsers();

        if (employees.stream().noneMatch(u -> u.getId().equals(currentUser.getId()))) {
            employees = new java.util.ArrayList<>(employees);
            employees.add(currentUser);
        }

        java.util.List<LeaderboardParticipantResponse> allParticipants = new java.util.ArrayList<>();

        for (User employee : employees) {
            long pts = getCurrentBalance(employee.getId());
            boolean isCurrentUser = employee.getId().equals(currentUser.getId());
            String displayName = isCurrentUser ? "Moi (" + employee.getFirstName() + ")" : employee.getFirstName() + " " + employee.getLastName();

            allParticipants.add(new LeaderboardParticipantResponse(
                    employee.getId(),
                    0,
                    employee.getFirstName(),
                    employee.getLastName(),
                    displayName,
                    employee.getAvatarUrl(),
                    pts,
                    isCurrentUser
            ));
        }

        allParticipants.sort((a, b) -> Long.compare(b.points(), a.points()));

        int currentRank = 1;
        LeaderboardParticipantResponse currentUserRank = null;
        java.util.List<LeaderboardParticipantResponse> rankedParticipants = new java.util.ArrayList<>();

        for (int i = 0; i < allParticipants.size(); i++) {
            if (i > 0 && allParticipants.get(i).points() < allParticipants.get(i - 1).points()) {
                currentRank = i + 1;
            }
            LeaderboardParticipantResponse original = allParticipants.get(i);
            LeaderboardParticipantResponse withRank = new LeaderboardParticipantResponse(
                    original.userId(),
                    currentRank,
                    original.firstName(),
                    original.lastName(),
                    original.displayName(),
                    original.avatarUrl(),
                    original.points(),
                    original.isCurrentUser()
            );
            rankedParticipants.add(withRank);
            if (original.isCurrentUser()) {
                currentUserRank = withRank;
            }
        }

        java.util.List<LeaderboardParticipantResponse> topParticipants = rankedParticipants.stream().limit(3).toList();

        return new LeaderboardResponse(topParticipants, currentUserRank, rankedParticipants.size());
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

    private PointTransactionResponse toPointTransactionResponse(PointTransaction pt) {
        Event event = pt.getEvent();

        return new PointTransactionResponse(
                pt.getId(),
                pt.getType().name(),
                pt.getPointsDelta(),
                pt.getReason(),
                event != null ? event.getId() : null,
                event != null ? event.getTitle() : null,
                pt.getCreatedAt()
        );
    }

}