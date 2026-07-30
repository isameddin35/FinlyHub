package com.finlyhub.common.util;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DateUtil;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

public final class FileParsingUtils {

    private FileParsingUtils() {}

    public static String getCellValue(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) {
                    yield cell.getLocalDateTimeCellValue().toLocalDate().toString();
                }
                double val = cell.getNumericCellValue();
                if (val == Math.floor(val) && !Double.isInfinite(val)) {
                    yield String.valueOf((long) val);
                }
                yield String.valueOf(val);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> {
                try { yield String.valueOf(cell.getNumericCellValue()); }
                catch (Exception e) {
                    try { yield cell.getStringCellValue(); }
                    catch (Exception e2) { yield ""; }
                }
            }
            default -> "";
        };
    }

    public static LocalDate parseDate(String value, DateTimeFormatter... formatters) {
        if (value == null || value.isEmpty()) return null;
        for (DateTimeFormatter fmt : formatters.length > 0 ? formatters : new DateTimeFormatter[0]) {
            try { return LocalDate.parse(value, fmt); }
            catch (DateTimeParseException ignored) {}
        }
        return null;
    }

    public static BigDecimal parseAmount(String value) {
        if (value == null || value.isEmpty()) return BigDecimal.ZERO;
        String cleaned = value.replaceAll("[^\\d.,-]", "");
        if (cleaned.isEmpty()) return BigDecimal.ZERO;
        int lastComma = cleaned.lastIndexOf(',');
        int lastDot = cleaned.lastIndexOf('.');
        if (lastComma > lastDot) {
            cleaned = cleaned.replace(".", "").replace(',', '.');
        } else if (lastDot > lastComma) {
            cleaned = cleaned.replace(",", "");
        }
        try { return new BigDecimal(cleaned); }
        catch (NumberFormatException e) { return BigDecimal.ZERO; }
    }
}
