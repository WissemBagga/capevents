package com.capevents.backend.rewards;

import com.capevents.backend.rewards.dto.RejectRewardRequest;
import com.capevents.backend.rewards.dto.RewardAdminRequestResponse;
import com.capevents.backend.rewards.dto.RewardRedemptionResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/rewards")
public class AdminRewardController {

    private final RewardService rewardService;

    public AdminRewardController(RewardService rewardService) {
        this.rewardService = rewardService;
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAuthority('ROLE_HR')")
    @GetMapping
    public List<RewardAdminRequestResponse> getRequests(
            @RequestParam(defaultValue = "ALL") String status
    ) {
        return rewardService.getAdminRequests(status);
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAuthority('ROLE_HR')")
    @PostMapping("/{id}/complete")
    public RewardRedemptionResponse complete(
            @PathVariable Long id,
            Authentication auth
    ) {
        return rewardService.completeRedemption(id, auth.getName());
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAuthority('ROLE_HR')")
    @PostMapping("/{id}/reject")
    public RewardRedemptionResponse reject(
            @PathVariable Long id,
            @Valid @RequestBody RejectRewardRequest req,
            Authentication auth
    ) {
        return rewardService.rejectRedemption(id, auth.getName(), req);
    }
}