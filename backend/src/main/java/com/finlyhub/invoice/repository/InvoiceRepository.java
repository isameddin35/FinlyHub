package com.finlyhub.invoice.repository;

import com.finlyhub.invoice.entity.Invoice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    List<Invoice> findByUserId(Long userId);

    List<Invoice> findByUserIdAndStatus(Long userId, Invoice.Status status);

    List<Invoice> findByUserIdOrderByCreatedAtDesc(Long userId);

    Page<Invoice> findByUserId(Long userId, Pageable pageable);
}
