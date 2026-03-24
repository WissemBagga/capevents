package com.capevents.backend.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void loginShouldReturnTokenWhenCredentialsAreValid() throws Exception {
        String body = """
                {
                  "email": "ahmed@capgemini.com",
                  "password": "Ahmed123*"
                }
        """;

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.tokenType").value("Bearer"));
    }

    @Test
    void loginShouldFailWhenPasswordIsInvalid() throws Exception {
        String body = """
        {
          "email": "ahmed@capgemini.com",
          "password": "WrongPassword123!"
        }
        """;

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void registerShouldFailWhenEmailAlreadyUsed() throws Exception {
        String body = """
        {
          "firstName": "Test",
          "lastName": "User",
          "email": "ahmed@capgemini.com",
          "password": "Test1234!",
          "phone": "+216 54842194",
          "departmentId": 1
        }
        """;

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void registerShouldFailWhenEmailDomainIsNotAllowed() throws Exception {
        String body = """
        {
          "firstName": "wissem",
          "lastName": "bagga",
          "email": "wissem.bagga@gmail.com",
          "password": "Azerty1234!",
          "phone": "+216 54842194",
          "departmentId": 1
        }
        """;

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void forgotPasswordShouldReturnOkForExistingEmail() throws Exception {
        String body = """
        {
          "email": "ahmed@capgemini.com"
        }
        """;

        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());
    }

    @Test
    void resetPasswordShouldFailWhenTokenIsInvalid() throws Exception {
        String body = """
        {
          "token": "invalidtoken123",
          "newPassword": "NewPassword123!"
        }
        """;

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }
}