package com.finlyhub.chatbot.service;

import java.time.LocalDate;

public record RetrievalFilter(String documentType, LocalDate fromDate, LocalDate toDate) {

    public boolean isEmpty() {
        return documentType == null && fromDate == null && toDate == null;
    }
}
