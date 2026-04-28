package com.capevents.backend.service;


import com.capevents.backend.entity.Role;
import com.capevents.backend.repository.RoleRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RoleService {
    private final RoleRepository roleRepository;

    public RoleService(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }
    public List<Role> listAll() {
        return roleRepository.findAll();
    }
}
