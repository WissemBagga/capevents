package com.capevents.backend.event;

import com.capevents.backend.TestAuthHelper;
import com.capevents.backend.service.EventService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class EventSecurityTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired
    private EventService eventService;

    @Test
    void managerCannotCreateEventForAnotherDepartment() throws Exception {

        String token = TestAuthHelper.loginAndGetToken(
                mockMvc, objectMapper,
                "ahmed@capgemini.com",
                "Ahmed123*"
        );

        String body = """
      {
        "title":"Test Event",
        "category":"WORK",
        "description":"Test",
        "startAt":"2030-03-10T10:00:00Z",
        "durationMinutes":60,
        "locationType":"ONLINE",
        "locationName":"Teams",
        "meetingUrl":"https://meet.test.com",
        "address":null,
        "capacity":10,
        "registrationDeadline":"2030-03-09T10:00:00Z",
        "imageUrl":null,
        "audience":"DEPARTMENT",
        "targetDepartmentId":2
      }
    """;

        mockMvc.perform(post("/api/events")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }
    @Test
    void hrCanAccessAdminList() throws Exception {
        String token = TestAuthHelper.loginAndGetToken(
                mockMvc, objectMapper,
                "wissem.bagga@capgemini.com",
                "Azerty123-"
        );

        mockMvc.perform(get("/api/events/admin")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void managerCannotAccessGlobalAdminList() throws Exception {
        String token = TestAuthHelper.loginAndGetToken(
                mockMvc, objectMapper,
                "ahmed@capgemini.com",
                "Ahmed123*"
        );

        mockMvc.perform(get("/api/events/admin")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void managerCanAccessDepartmentAdminList() throws Exception {
        String token = TestAuthHelper.loginAndGetToken(
                mockMvc, objectMapper,
                "ahmed@capgemini.com",
                "Ahmed123*"
        );

        mockMvc.perform(get("/api/events/admin/department")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void employeeCannotAccessDepartmentAdminList() throws Exception {
        String token = TestAuthHelper.loginAndGetToken(
                mockMvc, objectMapper,
                "mounir@capgemini.com",
                "Mounir123!"
        );

        mockMvc.perform(get("/api/events/admin/department")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void managerCannotAccessAdminDetailsOfAnotherDepartmentEvent() throws Exception {
        String token = TestAuthHelper.loginAndGetToken(
                mockMvc, objectMapper,
                "ahmed@capgemini.com",
                "Ahmed123*"
        );

        UUID otherDeptEventId = UUID.fromString("a68d1d6d-78d0-419e-add9-752e32804859");

        mockMvc.perform(get("/api/events/admin/{id}", otherDeptEventId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }
}

