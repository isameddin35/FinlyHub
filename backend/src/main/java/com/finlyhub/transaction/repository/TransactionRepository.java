package com.finlyhub.transaction.repository;

import com.finlyhub.transaction.entity.Transaction;
import com.finlyhub.transaction.entity.Transaction.CategorizationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByUserId(Long userId);

    List<Transaction> findByUserIdAndCategorizationStatus(Long userId, CategorizationStatus status);

    List<Transaction> findByImportBatchId(String importBatchId);

    List<Transaction> findByUserIdOrderByTransactionDateDesc(Long userId);

    List<Transaction> findByUserIdAndTransactionDateBetween(Long userId, LocalDate start, LocalDate end);

    long countByUserIdAndCategorizationStatus(Long userId, CategorizationStatus status);
}
