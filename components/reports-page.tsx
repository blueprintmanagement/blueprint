"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileArchive, FileCheck2, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { useProject } from "@/components/project-context";
import { formatCurrency } from "@/lib/format";
import { getAvailableMonths } from "@/lib/months";

export function ReportsPage() {
  const { activeProject, expenses, projectExpenses, suppliers, updateExpense } = useProject();
  const availableMonths = useMemo(
    () => getAvailableMonths(projectExpenses.map((expense) => expense.purchaseDate)),
    [projectExpenses],
  );
  const [month, setMonth] = useState(availableMonths[0]?.value ?? new Date().toISOString().slice(0, 7));

  useEffect(() => {
    if (!availableMonths.some((availableMonth) => availableMonth.value === month)) {
      setMonth(availableMonths[0]?.value ?? new Date().toISOString().slice(0, 7));
    }
  }, [availableMonths, month]);

  const monthExpenses = projectExpenses.filter((expense) => expense.purchaseDate.startsWith(month));
  const total = monthExpenses.reduce((sum, expense) => sum + expense.total, 0);
  const attached = monthExpenses.filter((expense) => expense.hasAttachment).length;
  const missing = monthExpenses.length - attached;
  const notSent = monthExpenses.filter((expense) => !expense.sentToAccountant).length;
  const readiness = monthExpenses.length
    ? Math.round(((attached + (monthExpenses.length - notSent)) / (monthExpenses.length * 2)) * 100)
    : 0;

  async function handleExportMonth() {
    const { exportMonthlyWorkbook } = await import("@/lib/export-month");

    exportMonthlyWorkbook({
      expenses,
      month,
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

  return (
    <main className="space-y-5">
      <div className="blueprint-panel rounded-lg p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="text-sm font-medium text-blueprint-accent">Dossiê da obra</span>
          <h1 className="mt-2 text-2xl font-semibold text-blueprint-ink">
            Dossiê mensal - {activeProject.name}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-blueprint-muted">
            Fechamento da obra aberta com planilha automática e lista de pendências antes do envio ao contador.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            aria-label="Selecionar mês do dossiê"
          >
            {availableMonths.map((availableMonth) => (
              <option key={availableMonth.value} value={availableMonth.value}>
                {availableMonth.label}
              </option>
            ))}
          </Select>
          <Button
            variant="secondary"
            className="w-full justify-start sm:w-auto"
            onClick={handleExportMonth}
          >
            <Download className="h-4 w-4" />
            Exportar mês
          </Button>
          <Button
            className="w-full justify-start sm:w-auto"
            onClick={handleExportAllMonths}
          >
            <Download className="h-4 w-4" />
            Exportar todos
          </Button>
        </div>
      </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <article className="blueprint-panel rounded-lg p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-blueprint-ink">Pacote {month}</h2>
              <p className="mt-1 text-sm text-blueprint-muted">
                {monthExpenses.length} lançamentos, {attached} com comprovante e {notSent} ainda não enviados.
              </p>
            </div>
            <Badge tone={readiness === 100 ? "green" : "amber"}>{readiness}% pronto</Badge>
          </div>

          <div className="mt-5 h-3 rounded-full bg-slate-100">
            <div
              className="h-3 rounded-full bg-blueprint-accent"
              style={{ width: `${readiness}%` }}
            />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-blueprint-line p-4">
              <p className="text-sm text-blueprint-muted">Total</p>
              <p className="mt-2 text-lg font-semibold text-blueprint-ink">{formatCurrency(total)}</p>
            </div>
            <div className="rounded-lg border border-blueprint-line p-4">
              <p className="text-sm text-blueprint-muted">Anexos</p>
              <p className="mt-2 text-lg font-semibold text-blueprint-ink">{attached}</p>
            </div>
            <div className="rounded-lg border border-blueprint-line p-4">
              <p className="text-sm text-blueprint-muted">Sem anexo</p>
              <p className="mt-2 text-lg font-semibold text-blueprint-ink">{missing}</p>
            </div>
            <div className="rounded-lg border border-blueprint-line p-4">
              <p className="text-sm text-blueprint-muted">Não enviado</p>
              <p className="mt-2 text-lg font-semibold text-blueprint-ink">{notSent}</p>
            </div>
          </div>
        </article>

        <aside className="blueprint-panel rounded-lg p-5">
          <FileArchive className="h-6 w-6 text-blueprint-accent" />
          <h2 className="mt-4 text-base font-semibold text-blueprint-ink">Checklist do fechamento</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center gap-2 text-blueprint-ink">
              <CheckCircle2 className="h-4 w-4 text-blueprint-accent" />
              Lançamentos separados por fase
            </div>
            <div className="flex items-center gap-2 text-blueprint-ink">
              {missing === 0 ? (
                <CheckCircle2 className="h-4 w-4 text-blueprint-accent" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600" />
              )}
              Comprovantes anexados
            </div>
            <div className="flex items-center gap-2 text-blueprint-ink">
              {notSent === 0 ? (
                <CheckCircle2 className="h-4 w-4 text-blueprint-accent" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600" />
              )}
              Marcados como enviados
            </div>
          </div>
          <Link
            href="/despesas"
            className="mt-5 inline-flex h-10 w-full items-center justify-start rounded-md bg-blueprint-accent px-4 text-sm font-medium text-white transition hover:bg-[#095f99]"
          >
            Revisar despesas
          </Link>
        </aside>
      </section>

      <section className="blueprint-panel rounded-lg">
        <div className="border-b border-blueprint-line px-5 py-4">
          <h2 className="text-base font-semibold text-blueprint-ink">Pendências do dossiê</h2>
        </div>
        <div className="divide-y divide-blueprint-line">
          {monthExpenses
            .filter((expense) => !expense.hasAttachment || !expense.sentToAccountant || expense.status === "Pendente")
            .map((expense) => (
              <div key={expense.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                <p className="font-medium text-blueprint-ink">{expense.description}</p>
                <p className="text-xs text-blueprint-muted">
                  {expense.hasAttachment ? "Com comprovante" : "Sem comprovante"} - {expense.sentToAccountant ? "enviado" : "não enviado"}
                </p>
              </div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-blueprint-ink">{formatCurrency(expense.total)}</p>
                  {!expense.hasAttachment ? (
                    <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-blueprint-line bg-white px-3 text-xs font-medium text-blueprint-ink transition hover:bg-[#eef6fd]">
                      <FileCheck2 className="h-4 w-4" />
                      Anexar
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
                  ) : null}
                  {!expense.sentToAccountant ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-9 px-3 text-xs"
                      onClick={() => updateExpense(expense.id, { sentToAccountant: true })}
                    >
                      <Send className="h-4 w-4" />
                      Marcar enviado
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          {monthExpenses.filter((expense) => !expense.hasAttachment || !expense.sentToAccountant || expense.status === "Pendente").length === 0 ? (
            <p className="px-5 py-8 text-sm text-blueprint-muted">
              Nenhuma pendência neste dossiê.
            </p>
          ) : null}
        </div>
      </section>

      <section className="blueprint-panel rounded-lg">
        <div className="border-b border-blueprint-line px-5 py-4">
          <h2 className="text-base font-semibold text-blueprint-ink">Comprovantes esperados</h2>
          <p className="mt-1 text-xs text-blueprint-muted">
            Lista do que precisa existir no pacote enviado ao contador.
          </p>
        </div>
        <div className="divide-y divide-blueprint-line">
          {monthExpenses.map((expense) => (
            <div key={expense.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="font-medium text-blueprint-ink">
                  {expense.invoiceNumber ? `NF ${expense.invoiceNumber}` : `Comprovante ${expense.paymentMethod}`}
                </p>
                <p className="text-xs text-blueprint-muted">{expense.description}</p>
              </div>
              <Badge tone={expense.hasAttachment ? "green" : "amber"}>
                {expense.hasAttachment ? "Anexado" : "Faltando"}
              </Badge>
            </div>
          ))}
          {monthExpenses.length === 0 ? (
            <p className="px-5 py-8 text-sm text-blueprint-muted">
              Nenhum lançamento neste mês.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
