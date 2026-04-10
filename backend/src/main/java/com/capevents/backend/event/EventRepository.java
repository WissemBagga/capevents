package com.capevents.backend.event;

import com.capevents.backend.user.User;
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
    Page<Event> findByCreatedByOrderByCreatedAtDesc(User createdBy, Pageable pageable);

    @Query("""
      select e from Event e
      left join fetch e.createdBy cb
      left join fetch cb.department d
      where d.id = :deptId
      order by e.createdAt desc
    """)
    Page<Event> findAllByCreatorDepartment(@Param("deptId") Long deptId, Pageable pageable);


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
        and e.status = 'PUBLISHED'
        and (
          e.audience = 'GLOBAL'
          or (e.audience = 'DEPARTMENT' and td.id = :deptId)
        )
    """)
    Optional<Event> findPublishedByIdVisibleForDept(@Param("id") UUID id, @Param("deptId") Long deptId);



    @Query("""
      select e from Event e
      left join e.targetDepartment td
      where e.status = 'PUBLISHED'
        and e.startAt >= :now
        and (
          e.audience = 'GLOBAL'
          or (e.audience = 'DEPARTMENT' and td.id = :deptId)
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
  where e.status = 'PUBLISHED'
    and (
      e.audience = 'GLOBAL'
      or (e.audience = 'DEPARTMENT' and td.id = :deptId)
    )
    and e.startAt >= :from
    and e.startAt <= :to
    and lower(e.category) like lower(concat('%', :category, '%'))
""")
    Page<Event> searchPublishedVisibleForDeptPage(
            @Param("deptId") Long deptId,
            @Param("category") String category,
            @Param("from") Instant from,
            @Param("to") Instant to,
            Pageable pageable
    );

    @Query("""
      select e from Event e
      where e.status = 'PUBLISHED'
      and  e.startAt >= :from
      and  e.startAt <= :to
      and (:category is null or lower(e.category) like lower( concat('%', :category, '%')))
    
""")
    Page<Event> searchPublishedPage(
            @Param("category") String category,
            @Param("from") Instant from,
            @Param("to") Instant to,
            Pageable pageable
    );



    @Query("""
      select e from Event e
      where e.status = 'PUBLISHED'
        and e.startAt >= :from
        and e.startAt <= :to
    """)
    Page<Event> searchPublishedPageWithoutCategory(
            @Param("from") Instant from,
            @Param("to") Instant to,
            Pageable pageable
    );

    @Query("""
      select e from Event e
      where e.status = 'PUBLISHED'
        and e.startAt >= :from
        and e.startAt <= :to
        and lower(e.category) like lower(concat('%', :category, '%'))
    """)
    Page<Event> searchPublishedPageWithCategory(
            @Param("category") String category,
            @Param("from") Instant from,
            @Param("to") Instant to,
            Pageable pageable
    );


    @Query("""
      select e from Event e
      left join e.targetDepartment td
      where e.status = 'PUBLISHED'
        and (
          e.audience = 'GLOBAL'
          or (e.audience = 'DEPARTMENT' and td.id = :deptId)
        )
        and e.startAt >= :from
        and e.startAt <= :to
    """)
    Page<Event> searchPublishedVisibleForDeptPageWithoutCategory(
            @Param("deptId") Long deptId,
            @Param("from") Instant from,
            @Param("to") Instant to,
            Pageable pageable
    );

    @Query("""
      select e from Event e
      left join e.targetDepartment td
      where e.status = 'PUBLISHED'
        and (
          e.audience = 'GLOBAL'
          or (e.audience = 'DEPARTMENT' and td.id = :deptId)
        )
        and e.startAt >= :from
        and e.startAt <= :to
        and lower(e.category) like lower(concat('%', :category, '%'))
    """)
    Page<Event> searchPublishedVisibleForDeptPageWithCategory(
            @Param("deptId") Long deptId,
            @Param("category") String category,
            @Param("from") Instant from,
            @Param("to") Instant to,
            Pageable pageable
    );

    Page<Event> findByStatusOrderByCreatedAtDesc(EventStatus status, Pageable pageable);

    @Query("""
    select e from Event e
    left join e.targetDepartment td
    where e.status = 'PENDING'
      and e.audience = 'DEPARTMENT'
      and td.id = :departmentId
    order by e.createdAt desc
    """)
    Page<Event> findPendingForManagerDepartment(
            @Param("departmentId") Long departmentId,
            Pageable pageable
    );

    @Query("""
        select e from Event e
        left join fetch e.createdBy cb
        left join fetch cb.department
        left join fetch e.targetDepartment
        order by e.createdAt desc
    """)
    List<Event> findAllForAnalytics();

    @Query("""
        select e from Event e
        left join fetch e.createdBy cb
        left join fetch cb.department
        left join fetch e.targetDepartment
        where cb.department.id = :departmentId
        order by e.createdAt desc
    """)
    List<Event> findAllForAnalyticsByCreatorDepartment(@Param("departmentId") Long departmentId);

    List<Event> findByStatusAndStartAtBetweenAndReminder24hSentAtIsNull(
            EventStatus status,
            Instant from,
            Instant to
    );

    List<Event> findByStatusAndRegistrationDeadlineBetweenAndDeadlineReminder48hSentAtIsNull(
            EventStatus status,
            Instant from,
            Instant to
    );

    List<Event> findByStatusAndFeedbackNotificationSentAtIsNullOrderByCreatedAtDesc(
            EventStatus status
    );
}
