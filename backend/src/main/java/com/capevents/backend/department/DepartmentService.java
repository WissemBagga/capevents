package com.capevents.backend.department;

import com.capevents.backend.common.exception.BadRequestException;
import com.capevents.backend.department.dto.CreateDepartmentRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DepartmentService {

    private final DepartmentRepository departmentRepository;

    public DepartmentService(DepartmentRepository departmentRepository) {
        this.departmentRepository = departmentRepository;
    }

    @Transactional(readOnly = true)
    public List<Department> listAll() {
        return departmentRepository.findAll()
                .stream()
                .sorted((a, b) -> a.getName().compareToIgnoreCase(b.getName()))
                .toList();
    }

    @Transactional
    public Department create(CreateDepartmentRequest req) {
        String normalizedName = req.name().trim();

        boolean exists = departmentRepository.findAll().stream()
                .anyMatch(d -> d.getName() != null && d.getName().trim().equalsIgnoreCase(normalizedName));

        if (exists) {
            throw new BadRequestException("Un département avec ce nom existe déjà.");
        }

        Department department = new Department();
        department.setName(normalizedName);

        return departmentRepository.save(department);
    }
}