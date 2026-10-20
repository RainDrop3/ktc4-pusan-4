package com.ktc4.pusan4.holiday;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class HolidaySeedTest {

    private final HolidaySeed seed = new HolidaySeed();

    @Test
    void matches_what_the_api_client_reads_from_the_same_year() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(org.hamcrest.Matchers.startsWith("https://holiday.test")))
            .andRespond(withSuccess(new ClassPathResource("holiday/rest-de-info-2025.json"), MediaType.APPLICATION_JSON));
        HolidayApiClient client = new HolidayApiClient(builder, "https://holiday.test", "key");

        assertThat(seed.holidays(2025)).containsExactlyElementsOf(client.fetch(2025));
    }

    @Test
    void keeps_a_comma_in_the_name() {
        assertThat(seed.holidays(2025)).contains(new PublicHoliday(LocalDate.of(2025, 5, 5), "어린이날, 부처님오신날"));
    }

    @Test
    void has_nothing_for_a_year_outside_the_file() {
        assertThat(seed.holidays(2024)).isEmpty();
    }
}
