package com.capevents.backend.rewards;

import com.capevents.backend.common.exception.BadRequestException;
import com.capevents.backend.common.exception.NotFoundException;
import com.capevents.backend.notification.NotificationService;
import com.capevents.backend.points.PointService;
import com.capevents.backend.rewards.dto.MyRewardsResponse;
import com.capevents.backend.rewards.dto.RedeemRewardRequest;
import com.capevents.backend.rewards.dto.RewardCatalogItemResponse;
import com.capevents.backend.rewards.dto.RewardRedemptionResponse;
import com.capevents.backend.user.User;
import com.capevents.backend.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

        RewardCode rewardCode;
        try {
            rewardCode = RewardCode.valueOf(req.rewardCode().trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Récompense inconnue.");
        }

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

        if (rewardCode.isRequiresHrAction()) {
            notificationService.notifyRewardRedemptionRequested(user, rewardCode.getTitle());
        }

        return toResponse(saved);
    }

    private RewardRedemptionResponse toResponse(RewardRedemption redemption) {
        return new RewardRedemptionResponse(
                redemption.getId(),
                redemption.getRewardCode().name(),
                redemption.getRewardCode().getTitle(),
                redemption.getPointsSpent(),
                redemption.getStatus().name(),
                redemption.getCreatedAt()
        );
    }
}