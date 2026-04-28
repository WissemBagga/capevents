package com.capevents.backend.service;

import com.capevents.backend.exception.BadRequestException;
import com.capevents.backend.exception.NotFoundException;
import com.capevents.backend.dto.*;
import com.capevents.backend.entity.RewardRedemption;
import com.capevents.backend.entity.enums.RewardCode;
import com.capevents.backend.entity.enums.RewardRedemptionStatus;
import com.capevents.backend.repository.RewardRedemptionRepository;
import com.capevents.backend.entity.User;
import com.capevents.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;

@Service
public class RewardService {

    private static final String USER_NOT_FOUND_MESSAGE = "Utilisateur introuvable";

    private final RewardRedemptionRepository rewardRedemptionRepository;
    private final UserRepository userRepository;
    private final PointService pointService;
    private final NotificationService notificationService;

    public RewardService(
            RewardRedemptionRepository rewardRedemptionRepository,
            UserRepository userRepository,
            PointService pointService,
            NotificationService notificationService
    ) {
        this.rewardRedemptionRepository = rewardRedemptionRepository;
        this.userRepository = userRepository;
        this.pointService = pointService;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public MyRewardsResponse getMyRewards(String userEmail) {
        User user = userRepository.findByEmailWithRolesAndDepartment(userEmail.toLowerCase())
                .orElseThrow(() -> new NotFoundException(USER_NOT_FOUND_MESSAGE));

        long currentPoints = pointService.getCurrentBalance(user.getId());

        List<RewardCatalogItemResponse> catalog = Arrays.stream(RewardCode.values())
                .map(reward -> new RewardCatalogItemResponse(
                        reward.name(),
                        reward.getTitle(),
                        reward.getDescription(),
                        reward.getPointsCost(),
                        reward.isRequiresHrAction(),
                        currentPoints >= reward.getPointsCost()
                ))
                .toList();

        List<RewardRedemptionResponse> history = rewardRedemptionRepository
                .findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::toResponse)
                .toList();

        return new MyRewardsResponse(currentPoints, catalog, history);
    }

    @Transactional
    public RewardRedemptionResponse redeem(String userEmail, RedeemRewardRequest req) {
        User user = userRepository.findByEmailWithRolesAndDepartment(userEmail.toLowerCase())
                .orElseThrow(() -> new NotFoundException(USER_NOT_FOUND_MESSAGE));

        RewardCode rewardCode = parseRewardCode(req.rewardCode());

        long currentPoints = pointService.getCurrentBalance(user.getId());

        if (currentPoints < rewardCode.getPointsCost()) {
            throw new BadRequestException("Solde insuffisant pour échanger cette récompense.");
        }

        RewardRedemption redemption = new RewardRedemption();
        redemption.setUser(user);
        redemption.setRewardCode(rewardCode);
        redemption.setPointsSpent(rewardCode.getPointsCost());
        redemption.setStatus(
                rewardCode.isRequiresHrAction()
                        ? RewardRedemptionStatus.PENDING_HR_ACTION
                        : RewardRedemptionStatus.COMPLETED
        );

        RewardRedemption saved = rewardRedemptionRepository.save(redemption);

        pointService.spendPointsForReward(user, rewardCode);

        if (rewardCode.isRequiresHrAction()) {
            notificationService.notifyRewardRedemptionRequested(user, rewardCode.getTitle());
        } else {
            notificationService.notifyRewardRedemptionCompleted(user, rewardCode.getTitle());
            saved.setHandledAt(Instant.now());
            saved.setHandledBy(null);
        }

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<RewardAdminRequestResponse> getAdminRequests(String status) {
        List<RewardRedemption> items;

        if (status == null || status.isBlank() || status.equalsIgnoreCase("ALL")) {
            items = rewardRedemptionRepository.findAll()
                    .stream()
                    .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                    .toList();
        } else {
            RewardRedemptionStatus parsedStatus = RewardRedemptionStatus.valueOf(status.trim().toUpperCase());
            items = rewardRedemptionRepository.findByStatusOrderByCreatedAtDesc(parsedStatus);
        }

        return items.stream().map(this::toAdminResponse).toList();
    }

    @Transactional
    public RewardRedemptionResponse completeRedemption(Long redemptionId, String hrEmail) {
        RewardRedemption redemption = rewardRedemptionRepository.findById(redemptionId)
                .orElseThrow(() -> new NotFoundException("Demande de récompense introuvable."));

        User hr = userRepository.findByEmailWithRolesAndDepartment(hrEmail.toLowerCase())
                .orElseThrow(() -> new NotFoundException(USER_NOT_FOUND_MESSAGE));

        if (redemption.getStatus() != RewardRedemptionStatus.PENDING_HR_ACTION) {
            throw new BadRequestException("Cette demande est déjà traitée.");
        }

        redemption.setStatus(RewardRedemptionStatus.COMPLETED);
        redemption.setHandledAt(Instant.now());
        redemption.setHandledBy(hr);
        redemption.setHrComment(null);

        rewardRedemptionRepository.save(redemption);

        notificationService.notifyRewardRedemptionCompleted(
                redemption.getUser(),
                redemption.getRewardCode().getTitle()
        );

        return toResponse(redemption);
    }

    @Transactional
    public RewardRedemptionResponse rejectRedemption(Long redemptionId, String hrEmail, RejectRewardRequest req) {
        RewardRedemption redemption = rewardRedemptionRepository.findById(redemptionId)
                .orElseThrow(() -> new NotFoundException("Demande de récompense introuvable."));

        User hr = userRepository.findByEmailWithRolesAndDepartment(hrEmail.toLowerCase())
                .orElseThrow(() -> new NotFoundException(USER_NOT_FOUND_MESSAGE));

        if (redemption.getStatus() != RewardRedemptionStatus.PENDING_HR_ACTION) {
            throw new BadRequestException("Cette demande est déjà traitée.");
        }

        redemption.setStatus(RewardRedemptionStatus.REJECTED);
        redemption.setHandledAt(Instant.now());
        redemption.setHandledBy(hr);
        redemption.setHrComment(req.reason().trim());

        rewardRedemptionRepository.save(redemption);

        pointService.refundRewardPoints(redemption.getUser(), redemption.getRewardCode());

        notificationService.notifyRewardRedemptionRejected(
                redemption.getUser(),
                redemption.getRewardCode().getTitle(),
                req.reason().trim()
        );

        return toResponse(redemption);
    }

    private RewardCode parseRewardCode(String raw) {
        try {
            return RewardCode.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Récompense inconnue.");
        }
    }

    private RewardRedemptionResponse toResponse(RewardRedemption redemption) {
        return new RewardRedemptionResponse(
                redemption.getId(),
                redemption.getRewardCode().name(),
                redemption.getRewardCode().getTitle(),
                redemption.getPointsSpent(),
                redemption.getStatus().name(),
                redemption.getHrComment(),
                redemption.getCreatedAt(),
                redemption.getHandledAt(),
                redemption.getHandledBy() != null
                        ? redemption.getHandledBy().getFirstName() + " " + redemption.getHandledBy().getLastName()
                        : null
        );
    }

    private RewardAdminRequestResponse toAdminResponse(RewardRedemption redemption) {
        return new RewardAdminRequestResponse(
                redemption.getId(),
                redemption.getUser().getFirstName() + " " + redemption.getUser().getLastName(),
                redemption.getUser().getEmail(),
                redemption.getRewardCode().name(),
                redemption.getRewardCode().getTitle(),
                redemption.getPointsSpent(),
                redemption.getStatus().name(),
                redemption.getHrComment(),
                redemption.getCreatedAt(),
                redemption.getHandledAt(),
                redemption.getHandledBy() != null
                        ? redemption.getHandledBy().getFirstName() + " " + redemption.getHandledBy().getLastName()
                        : null
        );
    }
}