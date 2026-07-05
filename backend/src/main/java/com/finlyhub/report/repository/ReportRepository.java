package com.finlyhub.report.repository;

import com.finlyhub.report.entity.Report;
import com.finlyhub.report.entity.Report.ReportType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {

    List<Report> findByUserId(Long userId);

    List<Report> findByUserIdAndType(Long userId, ReportType type);

    List<Report> findByUserIdOrderByCreatedAtDesc(Long userId);
}
