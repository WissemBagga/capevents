package com.capevents.backend.interest;

import com.capevents.backend.common.exception.BadRequestException;
import com.capevents.backend.common.exception.NotFoundException;
import com.capevents.backend.interest.dto.InterestResponse;
import com.capevents.backend.interest.dto.UpdateMyInterestsRequest;
import com.capevents.backend.user.User;
import com.capevents.backend.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class InterestService {

    private static final String USER_NOT_FOUND_MESSAGE = "Utilisateur introuvable";

    private final InterestRepository interestRepository;
    private final UserRepository userRepository;

    public InterestService(
            InterestRepository interestRepository,
            UserRepository userRepository
    ) {
        this.interestRepository = interestRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<InterestResponse> listAllActive() {
        return interestRepository.findByActiveTrueOrderByDisplayOrderAscLabelAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<InterestResponse> getMyInterests(String userEmail) {
        User user = userRepository.findByEmailWithRolesDepartmentAndInterests(userEmail.toLowerCase())
                .orElseThrow(() -> new NotFoundException(USER_NOT_FOUND_MESSAGE));

        return user.getInterests().stream()
                .sorted((a, b) -> {
                    int byOrder = Integer.compare(a.getDisplayOrder(), b.getDisplayOrder());
                    if (byOrder != 0) return byOrder;
                    return a.getLabel().compareToIgnoreCase(b.getLabel());
                })
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public List<InterestResponse> updateMyInterests(UpdateMyInterestsRequest req, String userEmail) {
        User user = userRepository.findByEmailWithRolesDepartmentAndInterests(userEmail.toLowerCase())
                .orElseThrow(() -> new NotFoundException(USER_NOT_FOUND_MESSAGE));

        List<Long> rawIds = req.interestIds();
        Set<Long> uniqueIds = new LinkedHashSet<>(rawIds);

        if (uniqueIds.isEmpty()) {
            throw new BadRequestException("Veuillez sélectionner au moins un intérêt.");
        }

        if (uniqueIds.size() > 6) {
            throw new BadRequestException("Vous pouvez sélectionner au maximum 6 intérêts.");
        }

        List<Interest> selectedInterests = interestRepository.findByIdInAndActiveTrue(uniqueIds);

        if (selectedInterests.size() != uniqueIds.size()) {
            throw new BadRequestException("Un ou plusieurs intérêts sélectionnés sont invalides.");
        }

        user.getInterests().clear();
        user.getInterests().addAll(selectedInterests);

        userRepository.save(user);

        return user.getInterests().stream()
                .sorted((a, b) -> {
                    int byOrder = Integer.compare(a.getDisplayOrder(), b.getDisplayOrder());
                    if (byOrder != 0) return byOrder;
                    return a.getLabel().compareToIgnoreCase(b.getLabel());
                })
                .map(this::toResponse)
                .toList();
    }

    private InterestResponse toResponse(Interest interest) {
        return new InterestResponse(
                interest.getId(),
                interest.getCode(),
                interest.getLabel()
        );
    }
}