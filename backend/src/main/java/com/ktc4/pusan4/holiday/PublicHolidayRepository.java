package com.ktc4.pusan4.holiday;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

interface PublicHolidayRepository extends Repository<PublicHolidayEntity, LocalDate> {

    @Query("select holiday.holidayDate from PublicHolidayEntity holiday")
    List<LocalDate> findAllDates();

    List<PublicHolidayEntity> saveAll(Iterable<PublicHolidayEntity> holidays);

    @Modifying
    @Query("delete from PublicHolidayEntity holiday where holiday.holidayDate between :from and :to")
    int deleteBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);
}
