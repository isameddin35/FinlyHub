package com.finlyhub.common.bootstrap;

import com.finlyhub.audit.entity.AuditLog;
import com.finlyhub.audit.repository.AuditLogRepository;
import com.finlyhub.chatbot.entity.Conversation;
import com.finlyhub.chatbot.entity.Message;
import com.finlyhub.chatbot.repository.ConversationRepository;
import com.finlyhub.chatbot.repository.MessageRepository;
import com.finlyhub.document.entity.Document;
import com.finlyhub.document.entity.DocumentChunk;
import com.finlyhub.document.repository.DocumentChunkRepository;
import com.finlyhub.document.repository.DocumentRepository;
import com.finlyhub.invoice.entity.Invoice;
import com.finlyhub.invoice.repository.InvoiceRepository;
import com.finlyhub.reconciliation.entity.Reconciliation;
import com.finlyhub.reconciliation.entity.ReconciliationEntry;
import com.finlyhub.reconciliation.repository.ReconciliationEntryRepository;
import com.finlyhub.reconciliation.repository.ReconciliationRepository;
import com.finlyhub.transaction.entity.Transaction;
import com.finlyhub.transaction.repository.TransactionRepository;
import com.finlyhub.transaction.repository.TransactionCategoryRepository;
import com.finlyhub.user.entity.Role;
import com.finlyhub.user.entity.User;
import com.finlyhub.user.repository.RoleRepository;
import com.finlyhub.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@Profile("demo")
@RequiredArgsConstructor
public class DemoAccountCloner implements CommandLineRunner {

    private static final int ACCOUNT_COUNT = 10;
    private static final String PASSWORD = "password";

    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final InvoiceRepository invoiceRepository;
    private final TransactionRepository transactionRepository;
    private final TransactionCategoryRepository transactionCategoryRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final ReconciliationRepository reconciliationRepository;
    private final ReconciliationEntryRepository reconciliationEntryRepository;
    private final AuditLogRepository auditLogRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.findByEmail("demo01@finlyhub.com").isPresent()) {
            return;
        }

        User admin = userRepository.findByEmail("admin@finlyhub.com")
                .orElseThrow(() -> new IllegalStateException("Admin user not found"));
        Role adminRole = roleRepository.findByName("ADMIN")
                .orElseThrow(() -> new IllegalStateException("ADMIN role not found"));

        List<Invoice> adminInvoices = invoiceRepository.findByUserId(admin.getId());
        List<Transaction> adminTransactions = transactionRepository.findByUserId(admin.getId());
        List<Conversation> adminConversations = conversationRepository.findByUserId(admin.getId());
        List<Document> adminDocuments = documentRepository.findByUserId(admin.getId());
        List<Reconciliation> adminReconciliations = reconciliationRepository.findByUserId(admin.getId());
        List<AuditLog> adminAuditLogs = auditLogRepository.findByUserIdOrderByCreatedAtDesc(admin.getId());

        for (int i = 1; i <= ACCOUNT_COUNT; i++) {
            String email = String.format("demo%02d@finlyhub.com", i);
            createDemoAccount(email, adminRole, adminInvoices, adminTransactions,
                    adminConversations, adminDocuments, adminReconciliations, adminAuditLogs);
        }
    }

    private void createDemoAccount(String email, Role adminRole,
                                   List<Invoice> adminInvoices,
                                   List<Transaction> adminTransactions,
                                   List<Conversation> adminConversations,
                                   List<Document> adminDocuments,
                                   List<Reconciliation> adminReconciliations,
                                   List<AuditLog> adminAuditLogs) {
        User demo = new User();
        demo.setEmail(email);
        demo.setPasswordHash(passwordEncoder.encode(PASSWORD));
        String num = email.substring(4, 6);
        demo.setFirstName("Demo");
        demo.setLastName("User " + num);
        demo.setCompany("Finly Hub Demo");
        demo.setEmailVerified(true);
        demo.setEnabled(true);
        demo = userRepository.save(demo);
        demo.getRoles().add(adminRole);
        userRepository.save(demo);

        Map<Long, Long> invoiceIdMap = new HashMap<>();
        cloneInvoices(adminInvoices, demo, invoiceIdMap);

        cloneTransactions(adminTransactions, demo);

        cloneConversations(adminConversations, demo);

        Map<Long, Long> documentIdMap = new HashMap<>();
        cloneDocuments(adminDocuments, demo, documentIdMap);

        cloneReconciliations(adminReconciliations, demo);

        cloneAuditLogs(adminAuditLogs, demo, invoiceIdMap);
    }

    private void cloneInvoices(List<Invoice> adminInvoices, User demo, Map<Long, Long> invoiceIdMap) {
        for (Invoice src : adminInvoices) {
            Invoice inv = new Invoice();
            inv.setUser(demo);
            inv.setInvoiceNumber(src.getInvoiceNumber());
            inv.setVendorName(src.getVendorName());
            inv.setVendorEmail(src.getVendorEmail());
            inv.setVendorAddress(src.getVendorAddress());
            inv.setInvoiceDate(src.getInvoiceDate());
            inv.setDueDate(src.getDueDate());
            inv.setCurrency(src.getCurrency());
            inv.setSubtotal(src.getSubtotal());
            inv.setTaxAmount(src.getTaxAmount());
            inv.setVatAmount(src.getVatAmount());
            inv.setDiscountAmount(src.getDiscountAmount());
            inv.setTotalAmount(src.getTotalAmount());
            inv.setStatus(src.getStatus());
            inv.setConfidenceScore(src.getConfidenceScore());
            inv.setProcessingTimeMs(src.getProcessingTimeMs());
            inv = invoiceRepository.save(inv);
            invoiceIdMap.put(src.getId(), inv.getId());
        }
    }

    private void cloneTransactions(List<Transaction> adminTransactions, User demo) {
        for (Transaction src : adminTransactions) {
            Transaction tx = new Transaction();
            tx.setUser(demo);
            tx.setTransactionDate(src.getTransactionDate());
            tx.setDescription(src.getDescription());
            tx.setAmount(src.getAmount());
            tx.setCurrency(src.getCurrency());
            tx.setReference(src.getReference());
            tx.setVendor(src.getVendor());
            tx.setSource(src.getSource());
            tx.setConfidenceScore(src.getConfidenceScore());
            tx.setCategorizationStatus(src.getCategorizationStatus());
            tx.setUserApproved(src.getUserApproved());
            tx.setApprovedAt(src.getApprovedAt());
            tx.setTransactionType(src.getTransactionType());
            tx.setDepartment(src.getDepartment());
            tx.setImportBatchId(src.getImportBatchId());

            if (src.getCategory() != null) {
                transactionCategoryRepository.findByName(src.getCategory().getName())
                        .ifPresent(tx::setCategory);
            }
            if (src.getSuggestedCategory() != null) {
                transactionCategoryRepository.findByName(src.getSuggestedCategory().getName())
                        .ifPresent(tx::setSuggestedCategory);
            }

            transactionRepository.save(tx);
        }
    }

    private void cloneConversations(List<Conversation> adminConversations, User demo) {
        for (Conversation src : adminConversations) {
            Conversation conv = new Conversation();
            conv.setUser(demo);
            conv.setTitle(src.getTitle());
            conv.setActive(src.isActive());
            conv = conversationRepository.save(conv);

            List<Message> messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(src.getId());
            for (Message msg : messages) {
                Message clone = new Message();
                clone.setConversation(conv);
                clone.setRole(msg.getRole());
                clone.setContent(msg.getContent());
                clone.setSources(msg.getSources());
                clone.setConfidenceScore(msg.getConfidenceScore());
                clone.setTokenCount(msg.getTokenCount());
                messageRepository.save(clone);
            }
        }
    }

    private void cloneDocuments(List<Document> adminDocuments, User demo, Map<Long, Long> documentIdMap) {
        for (Document src : adminDocuments) {
            Document doc = new Document();
            doc.setUser(demo);
            doc.setFilename(src.getFilename());
            doc.setOriginalFilename(src.getOriginalFilename());
            doc.setContentType(src.getContentType());
            doc.setFileSize(src.getFileSize());
            doc.setStoragePath(src.getStoragePath());
            doc.setDocumentType(src.getDocumentType());
            doc.setStatus(src.getStatus());
            doc.setRawText(src.getRawText());
            doc = documentRepository.save(doc);
            documentIdMap.put(src.getId(), doc.getId());

            List<DocumentChunk> chunks = documentChunkRepository.findByDocumentIdOrderByChunkIndex(src.getId());
            for (DocumentChunk chunk : chunks) {
                entityManager.createNativeQuery(
                        "INSERT INTO document_chunks (document_id, chunk_index, content, token_count, embedding, created_at) " +
                        "VALUES (?, ?, ?, ?, (SELECT ('[' || string_agg((random() * 2 - 1)::text, ',') || ']')::vector FROM generate_series(1,768)), NOW())")
                        .setParameter(1, doc.getId())
                        .setParameter(2, chunk.getChunkIndex())
                        .setParameter(3, chunk.getContent())
                        .setParameter(4, chunk.getTokenCount())
                        .executeUpdate();
            }
        }
    }

    private void cloneReconciliations(List<Reconciliation> adminReconciliations, User demo) {
        for (Reconciliation src : adminReconciliations) {
            Reconciliation rec = new Reconciliation();
            rec.setUser(demo);
            rec.setTitle(src.getTitle());
            rec.setStatus(src.getStatus());
            rec.setPeriodStart(src.getPeriodStart());
            rec.setPeriodEnd(src.getPeriodEnd());
            rec.setTotalBankTransactions(src.getTotalBankTransactions());
            rec.setTotalAccountingTransactions(src.getTotalAccountingTransactions());
            rec.setMatchedCount(src.getMatchedCount());
            rec.setUnmatchedCount(src.getUnmatchedCount());
            rec.setNeedsReviewCount(src.getNeedsReviewCount());
            rec.setDiscrepancyAmount(src.getDiscrepancyAmount());
            rec = reconciliationRepository.save(rec);

            List<ReconciliationEntry> entries = reconciliationEntryRepository
                    .findByReconciliationId(src.getId());
            Map<Long, Long> entryIdMap = new HashMap<>();

            for (ReconciliationEntry entry : entries) {
                entityManager.createNativeQuery(
                        "INSERT INTO reconciliation_entries (reconciliation_id, source, transaction_date, " +
                        "description, amount, reference, match_status, match_score, amount_difference, " +
                        "date_difference_days, created_at) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())")
                        .setParameter(1, rec.getId())
                        .setParameter(2, entry.getSource().name())
                        .setParameter(3, entry.getTransactionDate())
                        .setParameter(4, entry.getDescription())
                        .setParameter(5, entry.getAmount())
                        .setParameter(6, entry.getReference())
                        .setParameter(7, entry.getMatchStatus().name())
                        .setParameter(8, entry.getMatchScore())
                        .setParameter(9, entry.getAmountDifference())
                        .setParameter(10, entry.getDateDifferenceDays())
                        .executeUpdate();

                Long newId = ((Number) entityManager.createNativeQuery("SELECT LASTVAL()")
                        .getSingleResult()).longValue();
                entryIdMap.put(entry.getId(), newId);
            }

            for (Map.Entry<Long, Long> e : entryIdMap.entrySet()) {
                Long oldEntryId = e.getKey();
                Long newEntryId = e.getValue();
                ReconciliationEntry oldEntry = entries.stream()
                        .filter(ea -> ea.getId().equals(oldEntryId))
                        .findFirst().orElse(null);
                if (oldEntry != null && oldEntry.getMatchedEntryId() != null) {
                    Long newMatchedId = entryIdMap.get(oldEntry.getMatchedEntryId());
                    if (newMatchedId != null) {
                        entityManager.createNativeQuery(
                                "UPDATE reconciliation_entries SET matched_entry_id = ? WHERE id = ?")
                                .setParameter(1, newMatchedId)
                                .setParameter(2, newEntryId)
                                .executeUpdate();
                    }
                }
            }
        }
    }

    private void cloneAuditLogs(List<AuditLog> adminAuditLogs, User demo, Map<Long, Long> invoiceIdMap) {
        for (AuditLog src : adminAuditLogs) {
            Long newEntityId = invoiceIdMap.get(src.getEntityId());
            entityManager.createNativeQuery(
                    "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, " +
                    "old_values, new_values, ip_address, user_agent, created_at) " +
                    "VALUES (?, ?, ?, ?, cast(? as jsonb), cast(? as jsonb), ?, ?, NOW())")
                    .setParameter(1, demo.getId())
                    .setParameter(2, src.getAction())
                    .setParameter(3, src.getEntityType())
                    .setParameter(4, newEntityId != null ? newEntityId : src.getEntityId())
                    .setParameter(5, src.getOldValues())
                    .setParameter(6, src.getNewValues())
                    .setParameter(7, src.getIpAddress())
                    .setParameter(8, src.getUserAgent())
                    .executeUpdate();
        }
    }
}
