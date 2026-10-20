package com.ktc4.pusan4.holiday;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

/**
 * API 로 한 번도 받지 못한 해를 채울 공휴일 (holiday/seed.txt). 한 줄에 "날짜,이름" 이고 # 줄은 건너뛴다.
 */
@Component
class HolidaySeed {

    private final List<PublicHoliday> holidays;

    HolidaySeed() {
        ClassPathResource resource = new ClassPathResource("holiday/seed.txt");
        try (BufferedReader reader = new BufferedReader(
            new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            holidays = reader.lines()
                .filter(line -> !line.isBlank() && !line.startsWith("#"))
                .map(HolidaySeed::parse)
                .toList();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    List<PublicHoliday> holidays(int year) {
        return holidays.stream().filter(holiday -> holiday.date().getYear() == year).toList();
    }

    // 이름에 쉼표가 들어갈 수 있다("어린이날, 부처님오신날"). 첫 쉼표에서만 자른다.
    private static PublicHoliday parse(String line) {
        String[] fields = line.split(",", 2);
        return new PublicHoliday(LocalDate.parse(fields[0]), fields[1]);
    }
}
