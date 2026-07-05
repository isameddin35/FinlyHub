package com.finlyhub.invoice.service;

import org.springframework.web.multipart.MultipartFile;

public interface OcrService {

    String extractText(MultipartFile file);

    String extractText(String filePath);
}
