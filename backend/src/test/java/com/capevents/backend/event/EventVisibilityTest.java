package com.capevents.backend.event;

import com.capevents.backend.TestAuthHelper;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class EventVisibilityTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @Test
    void employeeCanListPublishedEvents() throws Exception {
        String token = TestAuthHelper.loginAndGetToken(
                mockMvc, objectMapper,
                "mounir@capgemini.com",
                "Mounir123!"
        );

        mockMvc.perform(get("/api/events/published")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void employeeCanSearchPublishedEvents() throws Exception {
        String token = TestAuthHelper.loginAndGetToken(
                mockMvc, objectMapper,
                "mounir@capgemini.com",
                "Mounir123!"
        );

        mockMvc.perform(get("/api/events/published/search")
                        .header("Authorization", "Bearer " + token)
                        .param("category", "training"))
                .andExpect(status().isOk());
    }

    @Test
    void searchPublishedShouldFailWhenFromIsAfterTo() throws Exception {
        String token = TestAuthHelper.loginAndGetToken(
                mockMvc, objectMapper,
                "mounir@capgemini.com",
                "Mounir123!"
        );

        mockMvc.perform(get("/api/events/published/search")
                        .header("Authorization", "Bearer " + token)
                        .param("from", "2027-12-31T10:00:00Z")
                        .param("to", "2027-01-01T10:00:00Z"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void employeeCanGetPublishedEventById() throws Exception {
        String token = TestAuthHelper.loginAndGetToken(
                mockMvc, objectMapper,
                "mounir@capgemini.com",
                "Mounir123!"
        );

        UUID publishedId = UUID.fromString("02a1a190-06f8-4ed7-a30a-01b1a8e047be");

        mockMvc.perform(get("/api/events/published/{id}", publishedId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void employeeCannotGetDraftEventByPublicId() throws Exception {
        String token = TestAuthHelper.loginAndGetToken(
                mockMvc, objectMapper,
                "mounir@capgemini.com",
                "Mounir123!"
        );

        UUID draftId = UUID.fromString("6f23c9a9-ae98-4062-bdd8-8532ff1dde3c");

        mockMvc.perform(get("/api/events/published/{id}", draftId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }
    @Test
    void employeeCannotGetCancelledEventByPublicId() throws Exception {
        String token = TestAuthHelper.loginAndGetToken(
                mockMvc, objectMapper,
                "mounir@capgemini.com",
                "Mounir123!"
        );

        UUID cancelledId = UUID.fromString("ab2ce376-28e6-49bb-ad6b-a99bf765862d");

        mockMvc.perform(get("/api/events/published/{id}", cancelledId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void employeeCannotGetArchivedEventByPublicId() throws Exception {
        String token = TestAuthHelper.loginAndGetToken(
                mockMvc, objectMapper,
                "mounir@capgemini.com",
                "Mounir123!"
        );

        UUID archivedId = UUID.fromString("73bd980f-910f-4f26-ab3f-fd9132a7da82");

        mockMvc.perform(get("/api/events/published/{id}", archivedId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }


}