"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileCheck2,
  FileX2,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { NewExpenseDrawer } from "@/components/expenses/new-expense-drawer";
import { useProject } from "@/components/project-context";
import { formatCurrency } from "@/lib/format";
import { getAvailableMonths } from "@/lib/months";
import { displayText } from "@/lib/display";
import { Expense } from "@/lib/mock-data";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

export function ExpensesPage() {
  const { activeProject, addExpense, deleteExpense, expenses, projectExpenses, suppliers, updateExpense } = useProject();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [monthFilter, setMonthFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [attachmentFilter, setAttachmentFilter] = useState("all");
  const [sentFilter, setSentFilter] = useState("all");
  const [search, setSearch] = useState("");
  const availableMonths = useMemo(
    () => getAvailableMonths(projectExpenses.map((expense) => expense.purchaseDate)),
    [projectExpenses],
  );

  useEffect(() => {
    if (monthFilter === "all") {
      return;
    }

    if (!availableMonths.some((month) => month.value === monthFilter)) {
      setMonthFilter("all");
    }
  }, [availableMonths, monthFilter]);

  const rows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return projectExpenses
      .filter((expense) => monthFilter === "all" || expense.purchaseDate.startsWith(monthFilter))
      .filter((expense) => statusFilter === "all" || expense.status === statusFilter)
      .filter((expense) => phaseFilter === "all" || expense.phaseId === phaseFilter)
      .filter((expense) => supplierFilter === "all" || expense.supplierId === supplierFilter)
      .filter((expense) => {
        if (sentFilter === "sent") {
          return expense.sentToAccountant;
        }

        if (sentFilter === "pending") {
          return !expense.sentToAccountant;
        }

        return true;
      })
      .filter((expense) => {
        if (attachmentFilter === "with") {
          return expense.hasAttachment;
        }

        if (attachmentFilter === "missing") {
          return !expense.hasAttachment;
        }

        return true;
      })
      .map((expense) => {
        const phaseName =
          activeProject.phases.find((phase) => phase.id === expense.phaseId)?.name ??
          "Fase não encontrada";
        const supplierName =
          suppliers.find((supplier) => supplier.id === expense.supplierId)?.name ??
          "Fornecedor não encontrado";

        return {
          ...expense,
          phaseName,
          supplierName,
          searchable: `${phaseName} ${supplierName} ${expense.description} ${expense.type} ${expense.invoiceNumber ?? ""}`.toLowerCase(),
        };
      })
      .filter((expense) => !normalizedSearch || expense.searchable.includes(normalizedSearch));
  }, [
    activeProject.phases,
    attachmentFilter,
    monthFilter,
    phaseFilter,
    projectExpenses,
    search,
    sentFilter,
    statusFilter,
    supplierFilter,
    suppliers,
  ]);

  const total = rows.reduce((sum, expense) => sum + expense.total, 0);
  const paidTotal = rows
    .filter((expense) => expense.status === "Pago")
    .reduce((sum, expense) => sum + expense.total, 0);
  const pendingTotal = rows
    .filter((expense) => expense.status === "Pendente")
    .reduce((sum, expense) => sum + expense.total, 0);
  const missingAttachments = rows.filter((expense) => !expense.hasAttachment).length;
  const notSent = rows.filter((expense) => !expense.sentToAccountant).length;

  async function handleExportMonth() {
    const { exportCompleteWorkbook, exportMonthlyWorkbook } = await import("@/lib/export-month");

    if (monthFilter === "all") {
      exportCompleteWorkbook({
        expenses,
        project: activeProject,
        suppliers,
      });
      return;
    }

    exportMonthlyWorkbook({
      expenses,
      month: monthFilter,
      project: activeProject,
      suppliers,
    });
  }

  async function handleExportAllMonths() {
    const { exportCompleteWorkbook } = await import("@/lib/export-month");

    exportCompleteWorkbook({
      expenses,
      project: activeProject,
      suppliers,
    });
  }

  function openCreateExpense() {
    setEditingExpense(null);
    setIsDrawerOpen(true);
  }

  function openEditExpense(expense: Expense) {
    setEditingExpense(expense);
    setIsDrawerOpen(true);
  }

  function handleDeleteExpense(expense: Expense) {
    const confirmed = window.confirm(
      `Excluir a despesa "${expense.description}" no valor de ${formatCurrency(expense.total)}? Esta ação remove o lançamento deste protótipo local.`,
    );

    if (confirmed) {
      deleteExpense(expense.id);
    }
  }

  return (
    <main className="space-y-5">
      <div className="blueprint-panel overflow-hidden rounded-lg p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <span className="blueprint-kicker">Livro de despesas</span>
          <h1 className="mt-3 text-3xl font-semibold text-blueprint-ink">
            {activeProject.name}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-blueprint-muted">
            Lance compras livres, reaproveite o catálogo quando ajudar e feche o mês com uma planilha limpa.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="secondary"
            className="justify-start"
            onClick={handleExportMonth}
          >
            <Download className="h-4 w-4" />
            Exportar mês
          </Button>
          <Button
            variant="secondary"
            className="justify-start"
            onClick={handleExportAllMonths}
          >
            <Download className="h-4 w-4" />
            Exportar todos
          </Button>
          <Button onClick={openCreateExpense} className="justify-start">
            <Plus className="h-4 w-4" />
            Nova Despesa
          </Button>
        </div>
      </div>
      </div>

      <section className="overflow-hidden rounded-lg border border-blueprint-line bg-blueprint-ink p-4 text-white shadow-soft">
        <div className="grid gap-4 md:grid-cols-[1.1fr_1fr_1fr_1fr]">
          <div>
            <p className="text-xs uppercase tracking-normal text-[#B8D9F2]">Total filtrado</p>
            <p className="mt-1 text-2xl font-semibold">{formatCurrency(total)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-normal text-[#B8D9F2]">Pago / pendente</p>
            <p className="mt-1 text-sm">
              {formatCurrency(paidTotal)} pago · {formatCurrency(pendingTotal)} aberto
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-normal text-[#B8D9F2]">Pendências</p>
            <p className="mt-1 flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-[#f1b56f]" />
              {missingAttachments} sem anexo · {notSent} não enviados
            </p>
          </div>
          <div className="flex items-center md:justify-end">
            <Badge tone={missingAttachments === 0 && notSent === 0 ? "green" : "amber"}>
              Dossiê {missingAttachments === 0 && notSent === 0 ? "pronto" : "incompleto"}
            </Badge>
          </div>
        </div>
      </section>

      <section className="blueprint-panel overflow-hidden rounded-lg">
        <div className="grid gap-3 border-b border-blueprint-line bg-white/70 p-4 xl:grid-cols-[150px_190px_150px_190px_160px_170px_1fr]">
          <Select
            aria-label="Filtrar por mês"
            value={monthFilter}
            onChange={(event) => setMonthFilter(event.target.value)}
          >
            <option value="all">Todos os meses</option>
            {availableMonths.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Filtrar por fase"
            value={phaseFilter}
            onChange={(event) => setPhaseFilter(event.target.value)}
          >
            <option value="all">Todas as fases</option>
            {activeProject.phases.map((phase) => (
              <option key={phase.id} value={phase.id}>
                {phase.name}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Filtrar por status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">Todos status</option>
            <option value="Pago">Pago</option>
            <option value="Pendente">Pendente</option>
          </Select>

          <Select
            aria-label="Filtrar por fornecedor"
            value={supplierFilter}
            onChange={(event) => setSupplierFilter(event.target.value)}
          >
            <option value="all">Todos fornecedores</option>
            {suppliers
              .filter((supplier) =>
                projectExpenses.some((expense) => expense.supplierId === supplier.id),
              )
              .map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
          </Select>

          <Select
            aria-label="Filtrar por anexo"
            value={attachmentFilter}
            onChange={(event) => setAttachmentFilter(event.target.value)}
          >
            <option value="all">Todos anexos</option>
            <option value="with">Com anexo</option>
            <option value="missing">Sem anexo</option>
          </Select>

          <Select
            aria-label="Filtrar por envio"
            value={sentFilter}
            onChange={(event) => setSentFilter(event.target.value)}
          >
            <option value="all">Todos envios</option>
            <option value="sent">Enviado</option>
            <option value="pending">Não enviado</option>
          </Select>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blueprint-muted" />
            <Input
              aria-label="Buscar despesas"
              placeholder="Buscar por item, fornecedor, nota fiscal ou fase"
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blueprint-line bg-blueprint-mist/60 px-4 py-3">
          <p className="text-sm font-medium text-blueprint-ink">
            {rows.length} lançamentos encontrados
          </p>
            <p className="text-xs text-blueprint-muted">
            A exportação gera uma planilha única com todos os dados linha a linha.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="blueprint-table w-full min-w-[1320px] border-collapse text-left text-sm">
            <thead>
              <tr>
                <th className="px-4 py-3 font-semibold">Compra</th>
                <th className="px-4 py-3 font-semibold">Fatura</th>
                <th className="px-4 py-3 font-semibold">Loja</th>
                <th className="px-4 py-3 font-semibold">NF</th>
                <th className="px-4 py-3 font-semibold">Fase</th>
                <th className="px-4 py-3 font-semibold">Ref</th>
                <th className="px-4 py-3 font-semibold">Fornecedor</th>
                <th className="px-4 py-3 text-right font-semibold">Valor</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-center font-semibold">Anexo</th>
                <th className="px-4 py-3 text-center font-semibold">Envio</th>
                <th className="px-4 py-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blueprint-line">
              {rows.map((expense) => (
                <tr key={expense.id} className="bg-white">
                  <td className="whitespace-nowrap px-4 py-4 text-blueprint-muted">
                    {formatDate(expense.purchaseDate)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-blueprint-muted">
                    {expense.invoicePaymentDate ? formatDate(expense.invoicePaymentDate) : "-"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-blueprint-muted">
                    {expense.storePaymentDate ? formatDate(expense.storePaymentDate) : "-"}
                  </td>
                  <td className="px-4 py-4 text-blueprint-muted">{expense.invoiceNumber ?? "-"}</td>
                  <td className="px-4 py-4 text-blueprint-muted">{expense.phaseName}</td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-blueprint-ink">{expense.description}</div>
                    <div className="text-xs text-blueprint-muted">
                      {expense.quantity} x {formatCurrency(expense.unitValue)} - {displayText(expense.paymentMethod)}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-blueprint-muted">{expense.supplierName}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-blueprint-ink">
                    {formatCurrency(expense.total)}
                  </td>
                  <td className="px-4 py-4">
                    <Badge tone={expense.status === "Pago" ? "green" : "amber"}>
                      {expense.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-center">
                    {expense.hasAttachment ? (
                      <FileCheck2 className="mx-auto h-5 w-5 text-blueprint-accent" aria-label={expense.attachmentName ?? "Com anexo"} />
                    ) : (
                      <FileX2 className="mx-auto h-5 w-5 text-slate-300" />
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <Badge tone={expense.sentToAccountant ? "green" : "gray"}>
                      {expense.sentToAccountant ? "Enviado" : "Aberto"}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 px-2"
                        title={expense.status === "Pago" ? "Marcar pendente" : "Marcar pago"}
                        onClick={() =>
                          updateExpense(expense.id, {
                            status: expense.status === "Pago" ? "Pendente" : "Pago",
                          })
                        }
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 px-2"
                        title={expense.sentToAccountant ? "Desmarcar envio" : "Marcar enviado"}
                        onClick={() =>
                          updateExpense(expense.id, {
                            sentToAccountant: !expense.sentToAccountant,
                          })
                        }
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <label
                        className="inline-flex h-8 cursor-pointer items-center justify-center rounded-md px-2 text-blueprint-muted transition hover:bg-blueprint-surface hover:text-blueprint-ink"
                        title="Registrar comprovante"
                      >
                        <FileCheck2 className="h-4 w-4" />
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          className="sr-only"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            updateExpense(expense.id, {
                              hasAttachment: true,
                              attachmentName: file.name,
                              attachmentSize: file.size,
                              attachmentType: file.type,
                            });
                          }}
                        />
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 px-2"
                        title="Editar despesa"
                        onClick={() => openEditExpense(expense)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 px-2 text-red-700 hover:bg-red-50 hover:text-red-800"
                        title="Excluir despesa"
                        onClick={() => handleDeleteExpense(expense)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {rows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-sm text-blueprint-muted">
                    Nenhuma despesa encontrada para a obra e filtros atuais.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <NewExpenseDrawer
        editingExpense={editingExpense}
        open={isDrawerOpen}
        onCreateExpense={(expense) => {
          addExpense(expense);
        }}
        onUpdateExpense={updateExpense}
        onOpenChange={(open) => {
          setIsDrawerOpen(open);
          if (!open) {
            setEditingExpense(null);
          }
        }}
      />
    </main>
  );
}
