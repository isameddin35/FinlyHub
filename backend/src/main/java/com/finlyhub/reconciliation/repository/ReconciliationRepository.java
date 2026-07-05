package com.finlyhub.reconciliation.repository;

import com.finlyhub.reconciliation.entity.Reconciliation;
import com.finlyhub.reconciliation.entity.Reconciliation.ReconciliationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReconciliationRepository extends JpaRepository<Reconciliation, Long> {

    List<Reconciliation> findByUserId(Long userId);

    List<Reconciliation> findByUserIdAndStatus(Long userId, ReconciliationStatus status);

    List<Reconciliation> findByUserIdOrderByCreatedAtDesc(Long userId);
}
