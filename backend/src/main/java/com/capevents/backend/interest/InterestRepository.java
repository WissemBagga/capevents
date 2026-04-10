package com.capevents.backend.interest;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface InterestRepository extends JpaRepository<Interest, Long> {

    List<Interest> findByActiveTrueOrderByDisplayOrderAscLabelAsc();

    List<Interest> findByIdIn(Collection<Long> ids);

    List<Interest> findByIdInAndActiveTrue(Collection<Long> ids);
}