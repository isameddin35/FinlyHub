import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const SYMBOL_TO_ISO: Record<string, string> = {
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
  '₩': 'KRW',
  '₽': 'RUB',
  '₹': 'INR',
  '₪': 'ILS',
  '₫': 'VND',
  '₱': 'PHP',
  '₴': 'UAH',
  '₦': 'NGN',
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  const iso = SYMBOL_TO_ISO[currency] ?? currency
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: iso,
    }).format(amount)
  } catch {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}
