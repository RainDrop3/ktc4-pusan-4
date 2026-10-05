package com.ktc4.pusan4.holiday;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 특일정보 API getRestDeInfo 로 한 해의 공휴일(대체·임시공휴일 포함)을 받는다.
 */
@Component
class HolidayApiClient {

    private final RestClient restClient;
    private final String apiKey;

    HolidayApiClient(
        RestClient.Builder holidayRestClientBuilder,
        @Value("${app.holiday.base-url}") String baseUrl,
        @Value("${app.holiday.api-key}") String apiKey
    ) {
        this.restClient = holidayRestClientBuilder.baseUrl(baseUrl).build();
        this.apiKey = apiKey;
    }

    boolean configured() {
        return !apiKey.isBlank();
    }

    /**
     * @throws RuntimeException 호출이 실패했거나 resultCode 가 00 이 아닐 때
     */
    List<PublicHoliday> fetch(int year) {
        // 키를 URI 변수로 넘긴다. queryParam 에 값으로 넣으면 '+' 가 인코딩되지 않아 공백으로 읽혀 인증이 실패한다.
        JsonNode root = restClient.get()
            .uri(uri -> uri.path("/getRestDeInfo")
                .queryParam("serviceKey", "{serviceKey}")
                .queryParam("solYear", year)
                .queryParam("numOfRows", 100)
                .queryParam("_type", "json")
                .build(apiKey))
            .retrieve()
            .body(JsonNode.class);

        JsonNode header = root.path("response").path("header");
        if (!"00".equals(header.path("resultCode").asText())) {
            // 키 오류 등 게이트웨이 오류는 response 없이 OpenAPI_ServiceResponse 로 온다.
            String gatewayError = root.path("OpenAPI_ServiceResponse").path("cmmMsgHeader").path("errMsg").asText();
            throw new IllegalStateException("Holiday API error " + header.path("resultCode").asText() + " "
                + header.path("resultMsg").asText() + gatewayError);
        }
        // 같은 날 공휴일이 둘이면 따로 온다(2025-05-05 어린이날·부처님오신날). 날짜당 한 행으로 합친다.
        Map<LocalDate, String> names = new LinkedHashMap<>();
        for (JsonNode item : items(root)) {
            if ("Y".equals(item.path("isHoliday").asText())) {
                names.merge(
                    LocalDate.parse(item.path("locdate").asText(), DateTimeFormatter.BASIC_ISO_DATE),
                    item.path("dateName").asText(),
                    (first, second) -> first + ", " + second
                );
            }
        }
        return names.entrySet().stream()
            .map(entry -> new PublicHoliday(entry.getKey(), entry.getValue()))
            .toList();
    }

    // 항목이 여럿이면 배열, 하나면 객체, 없으면 items 가 빈 문자열로 온다(2026-10 실제 응답으로 확인).
    private static List<JsonNode> items(JsonNode root) {
        JsonNode item = root.path("response").path("body").path("items").path("item");
        if (item.isArray()) {
            List<JsonNode> items = new ArrayList<>();
            item.forEach(items::add);
            return items;
        }
        return item.isObject() ? List.of(item) : List.of();
    }
}
