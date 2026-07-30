package com.finlyhub.document.repository;

import com.finlyhub.document.entity.Document;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DocumentRepository extends JpaRepository<Document, Long> {

    List<Document> findByUserId(Long userId);

    List<Document> findByUserIdAndStatus(Long userId, Document.DocumentStatus status);

    List<Document> findByUserIdOrderByCreatedAtDesc(Long userId);

    Page<Document> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    long countByUserIdAndStatus(Long userId, Document.DocumentStatus status);
}
