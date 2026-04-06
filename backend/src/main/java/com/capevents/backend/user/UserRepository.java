package com.capevents.backend.user;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);

    Page<User> findByDepartment_Id(Long departmentId, Pageable pageable);

    @Query("select u from User u left join fetch u.roles where u.email = :email")
    Optional<User> findByEmailWithRoles(@Param("email")String email);
    boolean existsByEmail(String email);
    @Query("""
         select u from User u
         left join fetch u.roles
         left join fetch u.department
         where u.email = :email
    """)
    Optional<User> findByEmailWithRolesAndDepartment(@Param("email") String email);

    @Query("""
    select distinct u from User u
    join u.roles r
    where u.active = true
      and r.code = 'ROLE_HR'
    """)
    List<User> findActiveHrUsers();

    @Query("""
    select distinct u from User u
    join u.roles r
    where u.active = true
      and r.code = 'ROLE_MANAGER'
      and u.department.id = :departmentId
    """)
    List<User> findActiveManagersByDepartmentId(@Param("departmentId") Long departmentId);

}
