import { useState, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { transactionApi } from '@/api/transactions'
import type { TransactionResponse } from '@/types/transaction'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckCircle, AlertCircle, TrendingUp, TrendingDown, FileSpreadsheet } from 'lucide-react'
import { formatCurrency, formatDate, formatPercentage } from '@/lib/utils'

const CSS = `
.fhsp-root{ font-family:'Inter', sans-serif; color:#1E293B; }
.fhsp-root *{ box-sizing:border-box; }

.fhsp-header{ display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:24px; gap:16px; flex-wrap:wrap; }
.fhsp-header h2{ font-family:'Poppins', sans-serif; font-weight:700; font-size:24px; color:#0F172A; letter-spacing:-0.01em; margin-bottom:4px; }
.fhsp-header p{ font-size:13.5px; color:#64748B; }

.fhsp-import-btn{
  display:inline-flex; align-items:center; gap:8px; padding:10px 18px; border-radius:11px; border:none;
  background:linear-gradient(120deg, #2563EB, #3B82F6 45%, #7C3AED 100%);
  color:#fff; font-size:13.5px; font-weight:700; cursor:pointer;
  box-shadow:0 10px 24px -10px rgba(37,99,235,0.5); transition:transform 0.2s ease;
}
.fhsp-import-btn:hover{ transform:translateY(-1px); }
.fhsp-import-btn svg{ width:15px; height:15px; stroke:#fff; fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }

.fhsp-stats{ display:grid; grid-template-columns:repeat(3, 1fr); gap:16px; margin-bottom:22px; }
.fhsp-stat-card{
  display:flex; align-items:center; gap:14px; padding:18px 20px; border-radius:16px;
  background:rgba(255,255,255,0.8); border:1px solid #E2E8F0;
  box-shadow:0 1px 2px rgba(15,23,42,0.03), 0 14px 30px -24px rgba(15,23,42,0.14);
}
.fhsp-stat-icon{ width:40px; height:40px; border-radius:11px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
.fhsp-stat-icon svg{ width:19px; height:19px; fill:none; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
.fhsp-icon-blue{ background:rgba(37,99,235,0.09); } .fhsp-icon-blue svg{ stroke:#2563EB; }
.fhsp-icon-amber{ background:#FFF7ED; } .fhsp-icon-amber svg{ stroke:#C2610A; }
.fhsp-icon-green{ background:#ECFDF5; } .fhsp-icon-green svg{ stroke:#16A34A; }
.fhsp-stat-value{ font-family:'JetBrains Mono', monospace; font-weight:700; font-size:22px; color:#0F172A; }
.fhsp-stat-label{ font-size:12px; color:#64748B; margin-top:2px; }

.fhsp-tabs{ display:inline-flex; gap:4px; padding:4px; border-radius:12px; background:#F1F5F9; margin-bottom:18px; }
.fhsp-tab{
  padding:8px 18px; border-radius:9px; border:none; background:none; cursor:pointer;
  font-size:13px; font-weight:600; color:#64748B; transition:background 0.2s ease, color 0.2s ease;
}
.fhsp-tab.fhsp-tab-active{ background:#fff; color:#0F172A; box-shadow:0 1px 3px rgba(15,23,42,0.08); }

@media (max-width:900px){
  .fhsp-stats{ grid-template-columns:1fr; }
}

.dark .fhsp-stat-card{ background:rgba(15,23,42,0.85); border-color:#334155; }
.dark .fhsp-stat-value{ color:#F1F5F9; }
.dark .fhsp-tabs{ background:#1E293B; }
.dark .fhsp-tab{ color:#64748B; }
.dark .fhsp-tab.fhsp-tab-active{ background:rgba(51,65,85,0.6); color:#F1F5F9; }
.dark .fhsp-header h2{ color:#F1F5F9; }
.dark .fhsp-header p{ color:#94A3B8; }
`;

const TABS = ["All", "PENDING", "APPROVED"];

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  UNCATEGORIZED: "Uncategorized",
};

function normalizeConfidence(score: number | null): number | null {
  if (score == null) return null;
  return score > 1 ? score : score * 100;
}

function getConfidenceVariant(score: number): 'success' | 'warning' | 'destructive' {
  const normalized = normalizeConfidence(score) ?? 0;
  if (normalized >= 80) return 'success';
  if (normalized >= 50) return 'warning';
  return 'destructive';
}

function getConfidenceColor(score: number): string {
  const normalized = normalizeConfidence(score) ?? 0;
  if (normalized >= 80) return 'bg-emerald-500';
  if (normalized >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

export function FinlyHubSpending() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState("All");
  const [selectedCategories, setSelectedCategories] = useState<Record<number, string>>({});
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const { data: transactions, isLoading, isError } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await transactionApi.list();
      return res.data.data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => transactionApi.getCategories().then(res => res.data.data),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => transactionApi.import(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transactions imported');
    },
    onError: () => toast.error('Failed to import transactions'),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, categoryId }: { id: number; categoryId: number }) =>
      transactionApi.approve(id, { categoryId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setApprovingId(null);
      toast.success('Transaction approved');
    },
    onError: () => {
      setApprovingId(null);
      toast.error('Failed to approve transaction');
    },
  });

  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importMutation.mutate(file);
    e.target.value = '';
  };

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    return tab === "All"
      ? transactions
      : transactions.filter((t) => t.categorizationStatus === tab);
  }, [transactions, tab]);

  const pending = !transactions ? 0 : transactions.filter((t) => t.categorizationStatus === "PENDING" || t.categorizationStatus === "UNCATEGORIZED").length;
  const approved = !transactions ? 0 : transactions.filter((t) => t.categorizationStatus === "APPROVED").length;

  const handleApprove = (transaction: TransactionResponse) => {
    const categoryIdStr = selectedCategories[transaction.id];
    const hasCategoryOverride = categoryIdStr !== undefined && categoryIdStr !== '';

    if (hasCategoryOverride) {
      setApprovingId(transaction.id);
      approveMutation.mutate({ id: transaction.id, categoryId: parseInt(categoryIdStr) });
      return;
    }

    if (transaction.suggestedCategoryName && categories) {
      const suggested = categories.find(c => c.name === transaction.suggestedCategoryName);
      if (suggested) {
        setApprovingId(transaction.id);
        approveMutation.mutate({ id: transaction.id, categoryId: suggested.id });
        return;
      }
    }

    toast.error('Please select a category');
  };

  return (
    <div className="fhsp-root">
      <style>{CSS}</style>

      <div className="fhsp-header">
        <div>
          <h2>Transactions</h2>
          <p>Upload and manage your financial transactions</p>
        </div>
        <input type="file" accept=".csv,.xlsx" style={{ display: "none" }} onChange={onImport} disabled={importMutation.isPending} ref={inputRef} />
        <button type="button" className="fhsp-import-btn" disabled={importMutation.isPending} onClick={() => inputRef.current?.click()}>
          <svg viewBox="0 0 24 24"><path d="M12 15.5V4.5M8 8.5l4-4 4 4" /><path d="M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15" /></svg>
          {importMutation.isPending ? "Importing..." : "Import CSV/XLSX"}
        </button>
      </div>

      <div className="fhsp-stats">
        <div className="fhsp-stat-card">
          <div className="fhsp-stat-icon fhsp-icon-blue"><svg viewBox="0 0 24 24"><path d="M6.5 3.5h8l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 6.5 3.5Z" /><path d="M14.5 3.5V8h4" /></svg></div>
          <div><div className="fhsp-stat-value">{transactions?.length ?? 0}</div><div className="fhsp-stat-label">Total Transactions</div></div>
        </div>
        <div className="fhsp-stat-card">
          <div className="fhsp-stat-icon fhsp-icon-amber"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg></div>
          <div><div className="fhsp-stat-value">{pending}</div><div className="fhsp-stat-label">Pending Review</div></div>
        </div>
        <div className="fhsp-stat-card">
          <div className="fhsp-stat-icon fhsp-icon-green"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="m8 12.3 2.6 2.6L16.5 9" /></svg></div>
          <div><div className="fhsp-stat-value">{approved}</div><div className="fhsp-stat-label">Approved</div></div>
        </div>
      </div>

      <div className="fhsp-tabs">
        {TABS.map((t) => (
          <button key={t} className={"fhsp-tab" + (tab === t ? " fhsp-tab-active" : "")} onClick={() => setTab(t)}>
            {t === "All" ? "All" : STATUS_LABEL[t] || t}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
              <h3 className="text-lg font-semibold">Failed to load transactions</h3>
              <p className="mt-2 text-sm text-muted-foreground">Please try again later.</p>
              <Button variant="outline" className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ['transactions'] })}>
                Retry
              </Button>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileSpreadsheet className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No transactions yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {tab === 'PENDING'
                  ? 'All transactions have been reviewed.'
                  : tab === 'APPROVED'
                  ? 'No approved transactions found.'
                  : 'Import a CSV or XLSX file to get started.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-xs font-medium uppercase text-muted-foreground">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Confidence</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction, index) => (
                    <tr
                      key={transaction.id}
                      className={`border-b text-sm transition-colors hover:bg-muted/50 ${index % 2 === 1 ? 'bg-muted/20' : ''}`}
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        {formatDate(transaction.transactionDate)}
                      </td>
                      <td className="max-w-[250px] truncate px-4 py-3">
                        {transaction.description}
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 font-medium ${
                          transaction.amount < 0 ? 'text-red-500' : 'text-emerald-500'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          {transaction.amount < 0 ? (
                            <TrendingDown className="h-3.5 w-3.5" />
                          ) : (
                            <TrendingUp className="h-3.5 w-3.5" />
                          )}
                          {formatCurrency(Math.abs(transaction.amount), transaction.currency)}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {transaction.categorizationStatus === "APPROVED" ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            {transaction.categoryName}
                          </Badge>
                        ) : (
                          <Badge
                            variant={
                              transaction.confidenceScore !== null
                                ? getConfidenceVariant(transaction.confidenceScore)
                                : 'secondary'
                            }
                          >
                            {transaction.suggestedCategoryName || 'Uncategorized'}
                          </Badge>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {transaction.categorizationStatus !== "APPROVED" && transaction.confidenceScore !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full rounded-full transition-all ${getConfidenceColor(transaction.confidenceScore)}`}
                                style={{ width: `${normalizeConfidence(transaction.confidenceScore)}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatPercentage(normalizeConfidence(transaction.confidenceScore)!)}
                            </span>
                          </div>
                        ) : transaction.categorizationStatus === "APPROVED" ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {transaction.categorizationStatus !== "APPROVED" ? (
                          <div className="flex items-center gap-2">
                            <Select
                              value={selectedCategories[transaction.id] ?? ''}
                              onValueChange={(value) =>
                                setSelectedCategories((prev) => ({ ...prev, [transaction.id]: value }))
                              }
                            >
                              <SelectTrigger className="h-8 w-[140px]">
                                <SelectValue placeholder="Category..." />
                              </SelectTrigger>
                              <SelectContent>
                                {categories?.map((cat) => (
                                  <SelectItem key={cat.id} value={String(cat.id)}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => handleApprove(transaction)}
                              disabled={approvingId === transaction.id}
                            >
                              {approvingId === transaction.id ? (
                                'Approving...'
                              ) : (
                                <>
                                  <CheckCircle className="mr-1 h-3.5 w-3.5" />
                                  Approve
                                </>
                              )}
                            </Button>
                          </div>
                        ) : (
                          <Badge
                            variant="outline"
                            className="gap-1 border-emerald-200 text-emerald-600"
                          >
                            <CheckCircle className="h-3 w-3" />
                            Approved
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
