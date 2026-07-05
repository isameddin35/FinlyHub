package com.finlyhub.invoice.repository;

import com.finlyhub.invoice.entity.InvoiceExtraction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceExtractionRepository extends JpaRepository<InvoiceExtraction, Long> {

    List<InvoiceExtraction> findByInvoiceId(Long invoiceId);

    Optional<InvoiceExtraction> findFirstByInvoiceIdOrderByCreatedAtDesc(Long invoiceId);
}
