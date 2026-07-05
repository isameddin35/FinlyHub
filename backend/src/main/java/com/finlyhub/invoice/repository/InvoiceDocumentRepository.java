package com.finlyhub.invoice.repository;

import com.finlyhub.invoice.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InvoiceDocumentRepository extends JpaRepository<Document, Long> {
}
