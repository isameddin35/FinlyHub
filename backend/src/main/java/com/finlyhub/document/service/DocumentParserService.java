package com.finlyhub.document.service;

import com.finlyhub.common.service.TokenizerService;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Service
public class DocumentParserService {

    private static final int CHUNK_TOKEN_SIZE = 512;
    private static final int CHUNK_OVERLAP_TOKENS = 64;

    private final TokenizerService tokenizerService;

    public DocumentParserService(TokenizerService tokenizerService) {
        this.tokenizerService = tokenizerService;
    }

    public String parseDocument(MultipartFile file) throws IOException {
        String filename = file.getOriginalFilename();
        if (filename == null) {
            throw new IllegalArgumentException("Filename is required");
        }
        return parseByFilename(file.getInputStream(), filename);
    }

    public String parseByFilename(java.io.InputStream inputStream, String filename) throws IOException {
        String lower = filename.toLowerCase();

        if (lower.endsWith(".pdf")) {
            return parsePdf(inputStream);
        } else if (lower.endsWith(".docx")) {
            return parseDocx(inputStream);
        } else if (lower.endsWith(".txt")) {
            return parseTxt(inputStream);
        } else {
            throw new IllegalArgumentException("Unsupported file type: " + filename);
        }
    }

    public List<String> chunkDocument(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        List<String> chunks = new ArrayList<>();
        String[] words = text.split("\\s+");
        int totalWords = words.length;
        int start = 0;

        while (start < totalWords) {
            int end = start;
            int tokenCount = 0;
            StringBuilder chunk = new StringBuilder();

            while (end < totalWords) {
                int wordTokens = tokenizerService.countTokens(words[end]);
                if (tokenCount + wordTokens > CHUNK_TOKEN_SIZE && end > start) {
                    break;
                }
                if (end > start) {
                    chunk.append(" ");
                }
                chunk.append(words[end]);
                tokenCount += wordTokens;
                end++;
            }

            if (end == start) {
                chunk.append(words[end]);
                end++;
            }

            chunks.add(chunk.toString());

            if (end == totalWords) {
                break;
            }

            int overlapTokens = 0;
            int overlapStart = end;
            while (overlapStart > start && overlapTokens < CHUNK_OVERLAP_TOKENS) {
                overlapStart--;
                overlapTokens += tokenizerService.countTokens(words[overlapStart]);
            }
            start = overlapStart > start ? overlapStart : start + 1;
        }

        return chunks;
    }

    public int countTokens(String text) {
        if (text == null || text.isEmpty()) {
            return 0;
        }
        return tokenizerService.countTokens(text);
    }

    private String parsePdf(java.io.InputStream inputStream) throws IOException {
        try (PDDocument document = Loader.loadPDF(inputStream.readAllBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        }
    }

    private String parseDocx(java.io.InputStream inputStream) throws IOException {
        try (XWPFDocument docx = new XWPFDocument(inputStream)) {
            XWPFWordExtractor extractor = new XWPFWordExtractor(docx);
            return extractor.getText();
        }
    }

    private String parseTxt(java.io.InputStream inputStream) throws IOException {
        StringBuilder text = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                text.append(line).append("\n");
            }
        }
        return text.toString();
    }
}
