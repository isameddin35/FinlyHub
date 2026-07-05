package com.finlyhub.invoice.service;

import lombok.extern.slf4j.Slf4j;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@Service
@Slf4j
public class OcrServiceImpl implements OcrService {

    private final Tesseract tesseract;

    public OcrServiceImpl() {
        this.tesseract = new Tesseract();
        this.tesseract.setDatapath(System.getenv().getOrDefault("TESSDATA_PREFIX", "/usr/share/tessdata"));
        this.tesseract.setLanguage("eng");
    }

    @Override
    public String extractText(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType != null && contentType.equals("application/pdf")) {
            return extractTextFromPdf(file);
        }
        return extractTextFromImage(file);
    }

    private String extractTextFromPdf(MultipartFile file) {
        try {
            byte[] bytes = file.getBytes();
            try (PDDocument document = Loader.loadPDF(bytes)) {
                PDFTextStripper stripper = new PDFTextStripper();
                String text = stripper.getText(document);
                if (text != null && !text.isBlank()) {
                    return text;
                }
            }
            return extractTextFromImage(file);
        } catch (IOException e) {
            throw new RuntimeException("Failed to process PDF file", e);
        }
    }

    private String extractTextFromImage(MultipartFile file) {
        try {
            Path tempFile = Files.createTempFile("ocr_", file.getOriginalFilename());
            try {
                file.transferTo(tempFile.toFile());
                return tesseract.doOCR(tempFile.toFile());
            } finally {
                Files.deleteIfExists(tempFile);
            }
        } catch (IOException | TesseractException e) {
            throw new RuntimeException("Failed to perform OCR on file", e);
        }
    }

    @Override
    public String extractText(String filePath) {
        try {
            byte[] bytes = Files.readAllBytes(Path.of(filePath));
            String contentType = filePath.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/png";
            if (contentType.equals("application/pdf")) {
                try (PDDocument document = Loader.loadPDF(bytes)) {
                    PDFTextStripper stripper = new PDFTextStripper();
                    String text = stripper.getText(document);
                    if (text != null && !text.isBlank()) {
                        return text;
                    }
                }
                return tesseract.doOCR(Path.of(filePath).toFile());
            }
            return tesseract.doOCR(Path.of(filePath).toFile());
        } catch (IOException | TesseractException e) {
            throw new RuntimeException("Failed to perform OCR on file: " + filePath, e);
        }
    }
}
