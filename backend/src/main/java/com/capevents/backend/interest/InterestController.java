package com.capevents.backend.interest;

import com.capevents.backend.interest.dto.InterestResponse;
import com.capevents.backend.interest.dto.UpdateMyInterestsRequest;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class InterestController {

    private final InterestService interestService;

    public InterestController(InterestService interestService) {
        this.interestService = interestService;
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAuthority('ROLE_EMPLOYEE')")
    @GetMapping("/interests")
    public List<InterestResponse> listAllActive() {
        return interestService.listAllActive();
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAuthority('ROLE_EMPLOYEE')")
    @GetMapping("/me/interests")
    public List<InterestResponse> getMyInterests(Authentication auth) {
        return interestService.getMyInterests(auth.getName());
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAuthority('ROLE_EMPLOYEE')")
    @PutMapping("/me/interests")
    public List<InterestResponse> updateMyInterests(
            @Valid @RequestBody UpdateMyInterestsRequest req,
            Authentication auth
    ) {
        return interestService.updateMyInterests(req, auth.getName());
    }
}