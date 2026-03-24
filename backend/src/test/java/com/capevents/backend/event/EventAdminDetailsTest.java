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
class EventAdminDetailsTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @Test
    void hrCanReadAdminDetailsForDraftEvent() throws Exception {
        String token = TestAuthHelper.loginAndGetToken(
                mockMvc, objectMapper,
                "wissem.bagga@capgemini.com",
                "Azerty123-"
        );

        UUID draftId = UUID.fromString("5fed21d9-b15a-4c3f-9133-91649e7293fe");

        mockMvc.perform(get("/api/events/admin/{id}", draftId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void hrCanReadAdminDetailsForArchivedEvent() throws Exception {
        String token = TestAuthHelper.loginAndGetToken(
                mockMvc, objectMapper,
                "wissem.bagga@capgemini.com",
                "Azerty123-"
        );

        UUID archivedId = UUID.fromString("73bd980f-910f-4f26-ab3f-fd9132a7da82");

        mockMvc.perform(get("/api/events/admin/{id}", archivedId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }
}