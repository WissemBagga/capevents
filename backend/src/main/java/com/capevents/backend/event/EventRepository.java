package com.capevents.backend.event;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EventRepository extends JpaRepository<Event, UUID> {
    List<Event> findByStatusAndStartAtAfterOrderByCreatedAtAsc(EventStatus status, Instant now);

    List<Event> findAllByOrderByCreatedAtDesc();

    @Query("""
      select e from Event e
      left join fetch e.createdBy cb
      left join fetch cb.department d
      where d.id = :deptId
      order by e.createdAt desc
    """)
    List<Event> findAllByCreatorDepartment(@Param("deptId") Long deptId);


    @Query("""
      select e from Event e
      left join fetch e.createdBy cb
      left join fetch cb.department
      left join fetch e.targetDepartment td
      where e.id = :id
    """)
    Optional<Event> findByIdWithCreatorDept(@Param("id") UUID id);

    Page<Event> findByStatusAndStartAtAfter(EventStatus status, Instant startAt, Pageable pageable);



    @Query("""
      select e from Event e
      left join fetch e.createdBy
      left join fetch e.targetDepartment td
      where e.id = :id
        and e.status = com.capevents.backend.event.EventStatus.PUBLISHED
        and (
          e.audience = com.capevents.backend.event.EventAudience.GLOBAL
          or (e.audience = com.capevents.backend.event.EventAudience.DEPARTMENT and td.id = :deptId)
        )
    """)
    Optional<Event> findPublishedByIdVisibleForDept(@Param("id") UUID id, @Param("deptId") Long deptId);



    @Query("""
  select e from Event e
  left join e.targetDepartment td
  where e.status = com.capevents.backend.event.EventStatus.PUBLISHED
    and e.startAt >= :now
    and (
      e.audience = com.capevents.backend.event.EventAudience.GLOBAL
      or (e.audience = com.capevents.backend.event.EventAudience.DEPARTMENT and td.id = :deptId)
    )
""")
    Page<Event> findPublishedVisibleForDeptPage(
            @Param("now") Instant now,
            @Param("deptId") Long deptId,
            Pageable pageable
    );

    @Query("""
  select e from Event e
  left join e.targetDepartment td
  where e.status = com.capevents.backend.event.EventStatus.PUBLISHED
    and e.startAt >= :now
    and (
      e.audience = com.capevents.backend.event.EventAudience.GLOBAL
      or (e.audience = com.capevents.backend.event.EventAudience.DEPARTMENT and td.id = :deptId)
    )
    and (:category is null or e.category = :category)
    and e.startAt >= :from
    and e.startAt <= :to
""")
    Page<Event> searchPublishedVisibleForDeptPage(
            @Param("now") Instant now,
            @Param("deptId") Long deptId,
            @Param("category") String category,
            @Param("from") Instant from,
            @Param("to") Instant to,
            Pageable pageable
    );
    @Query("""
  select e from Event e
  where e.status = com.capevents.backend.event.EventStatus.PUBLISHED
    and e.startAt >= :now
    and (:category is null or e.category = :category)
    and e.startAt >= :from
    and e.startAt <= :to
""")
    Page<Event> searchPublishedPage(
            @Param("now") Instant now,
            @Param("category") String category,
            @Param("from") Instant from,
            @Param("to") Instant to,
            Pageable pageable
    );

}
