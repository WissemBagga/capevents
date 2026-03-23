package com.capevents.backend.event;

import com.capevents.backend.TestAuthHelper;
import com.fasterxml.jackson.databind.ObjectMapper;
import net.bytebuddy.implementation.bind.MethodDelegationBinder;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
                "Ahmed123!"
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


   /* public void additionTest() {
        int s = 5;
        int add = eventService.addition(2,3);
        if (s==add){
            System.out.println("valide");
        }
        else {
            System.out.println("invalide");
        }
    }*/
}