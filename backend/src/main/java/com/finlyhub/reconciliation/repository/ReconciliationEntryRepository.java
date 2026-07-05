package com.finlyhub.reconciliation.repository;

import com.finlyhub.reconciliation.entity.ReconciliationEntry;
import com.finlyhub.reconciliation.entity.ReconciliationEntry.MatchStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReconciliationEntryRepository extends JpaRepository<ReconciliationEntry, Long> {

    List<ReconciliationEntry> findByReconciliationId(Long reconciliationId);

    List<ReconciliationEntry> findByReconciliationIdAndMatchStatus(Long reconciliationId, MatchStatus matchStatus);

    long countByReconciliationIdAndMatchStatus(Long reconciliationId, MatchStatus matchStatus);
}
