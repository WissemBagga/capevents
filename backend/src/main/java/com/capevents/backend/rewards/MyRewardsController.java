package com.capevents.backend.rewards;

import com.capevents.backend.rewards.dto.MyRewardsResponse;
import com.capevents.backend.rewards.dto.RedeemRewardRequest;
import com.capevents.backend.rewards.dto.RewardRedemptionResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/me/rewards")
public class MyRewardsController {

    private final RewardService rewardService;

    public MyRewardsController(RewardService rewardService) {
        this.rewardService = rewardService;
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("isAuthenticated()")
    @GetMapping
    public MyRewardsResponse getMyRewards(Authentication auth) {
        return rewardService.getMyRewards(auth.getName());
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("isAuthenticated()")
    @PostMapping("/redeem")
    public RewardRedemptionResponse redeem(
            @Valid @RequestBody RedeemRewardRequest req,
            Authentication auth
    ) {
        return rewardService.redeem(auth.getName(), req);
    }
}