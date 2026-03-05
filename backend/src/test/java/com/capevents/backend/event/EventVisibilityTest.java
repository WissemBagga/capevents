package com.capevents.backend.event;

import com.capevents.backend.TestAuthHelper;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

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
                "Mounir@capgemini.com",
                "123456"
        );

        mockMvc.perform(get("/api/events/published")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }
}