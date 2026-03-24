package com.capevents.backend.event;

import com.capevents.backend.TestAuthHelper;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class EventBusinessRulesTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @Test
    void managerCanCreateEventForOwnDepartment() throws Exception {
        String token = TestAuthHelper.loginAndGetToken(
                mockMvc, objectMapper,
                "ahmed@capgemini.com",
                "Ahmed123*"
        );

        String body = """
        {
          "title":"Finance Event",
          "category":"WORK",
          "description":"Finance meeting",
          "startAt":"2030-04-10T10:00:00Z",
          "durationMinutes":60,
          "locationType":"ONLINE",
          "locationName":"Teams",
          "meetingUrl":"https://meet.test.com",
          "address":null,
          "capacity":10,
          "registrationDeadline":"2030-04-09T10:00:00Z",
          "imageUrl":null,
          "audience":"DEPARTMENT",
          "targetDepartmentId":3
        }
        """;

        mockMvc.perform(post("/api/events")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());
    }

    @Test
    void createEventShouldFailWhenDeadlineIsAfterStart() throws Exception {
        String token = TestAuthHelper.loginAndGetToken(
                mockMvc, objectMapper,
                "ahmed@capgemini.com",
                "Ahmed123*"
        );

        String body = """
        {
          "title":"Invalid Event",
          "category":"WORK",
          "description":"Invalid deadline",
          "startAt":"2030-04-10T10:00:00Z",
          "durationMinutes":60,
          "locationType":"ONLINE",
          "locationName":"Teams",
          "meetingUrl":"https://meet.test.com",
          "address":null,
          "capacity":10,
          "registrationDeadline":"2030-04-11T10:00:00Z",
          "imageUrl":null,
          "audience":"DEPARTMENT",
          "targetDepartmentId":1
        }
        """;

        mockMvc.perform(post("/api/events")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createEventShouldFailWhenOnlineWithoutMeetingUrl() throws Exception {
        String token = TestAuthHelper.loginAndGetToken(
                mockMvc, objectMapper,
                "ahmed@capgemini.com",
                "Ahmed123*"
        );

        String body = """
        {
          "title":"Invalid Event",
          "category":"WORK",
          "description":"Missing meeting URL",
          "startAt":"2030-04-10T10:00:00Z",
          "durationMinutes":60,
          "locationType":"ONLINE",
          "locationName":"Teams",
          "meetingUrl":"",
          "address":null,
          "capacity":10,
          "registrationDeadline":"2030-04-09T10:00:00Z",
          "imageUrl":null,
          "audience":"DEPARTMENT",
          "targetDepartmentId":1
        }
        """;

        mockMvc.perform(post("/api/events")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateArchivedEventShouldFail() throws Exception {
        String token = TestAuthHelper.loginAndGetToken(
                mockMvc, objectMapper,
                "wissem.bagga@capgemini.com",
                "Azerty123-"
        );

        UUID archivedEventId = UUID.fromString("73bd980f-910f-4f26-ab3f-fd9132a7da82");

        String body = """
        {
          "title":"Updated Archived Event",
          "category":"WORK",
          "description":"Desc",
          "startAt":"2030-04-10T10:00:00Z",
          "durationMinutes":60,
          "locationType":"ONLINE",
          "locationName":"Teams",
          "meetingUrl":"https://meet.test.com",
          "address":null,
          "capacity":10,
          "registrationDeadline":"2030-04-09T10:00:00Z",
          "imageUrl":null,
          "audience":"GLOBAL",
          "targetDepartmentId":null
        }
        """;

        mockMvc.perform(put("/api/events/{id}", archivedEventId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateCancelledEventShouldFail() throws Exception {
        String token = TestAuthHelper.loginAndGetToken(
                mockMvc, objectMapper,
                "wissem.bagga@capgemini.com",
                "Azerty123-"
        );

        UUID cancelledEventId = UUID.fromString("ab2ce376-28e6-49bb-ad6b-a99bf765862d");

        String body = """
    {
      "title":"Updated Cancelled Event",
      "category":"WORK",
      "description":"Desc",
      "startAt":"2030-04-10T10:00:00Z",
      "durationMinutes":60,
      "locationType":"ONLINE",
      "locationName":"Teams",
      "meetingUrl":"https://meet.test.com",
      "address":null,
      "capacity":10,
      "registrationDeadline":"2030-04-09T10:00:00Z",
      "imageUrl":null,
      "audience":"GLOBAL",
      "targetDepartmentId":null
    }
    """;

        mockMvc.perform(put("/api/events/{id}", cancelledEventId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void publishArchivedEventShouldFail() throws Exception {
        String token = TestAuthHelper.loginAndGetToken(
                mockMvc, objectMapper,
                "wissem.bagga@capgemini.com",
                "Azerty123-"
        );

        UUID archivedEventId = UUID.fromString("73bd980f-910f-4f26-ab3f-fd9132a7da82");

        mockMvc.perform(post("/api/events/{id}/publish", archivedEventId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    @Test
    void publishCancelledEventShouldFail() throws Exception {
        String token = TestAuthHelper.loginAndGetToken(
                mockMvc, objectMapper,
                "wissem.bagga@capgemini.com",
                "Azerty123-"
        );

        UUID cancelledEventId = UUID.fromString("ab2ce376-28e6-49bb-ad6b-a99bf765862d");

        mockMvc.perform(post("/api/events/{id}/publish", cancelledEventId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

}
