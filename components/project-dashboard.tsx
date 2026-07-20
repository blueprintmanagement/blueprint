"use client";

import Link from "next/link";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  FileX2,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useProject } from "@/components/project-context";
import { deliveryMovements, suppliers } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/format";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

export function ProjectDashboard() {
  const { activeProject, projectExpenses } = useProject();
  const paidTotal = projectExpenses
    .filter((expense) => expense.status === "Pago")
    .reduce((sum, expense) => sum + expense.total, 0);
  const pendingTotal = projectExpenses
    .filter((expense) => expense.status === "Pendente")
    .reduce((sum, expense) => sum + expense.total, 0);
  const missingAttachments = projectExpenses.filter((expense) => !expense.hasAttachment).length;
  const notSent = projectExpenses.filter((expense) => !expense.sentToAccountant).length;

  const phaseRows = activeProject.phases.map((phase) => {
    const total = projectExpenses
      .filter((expense) => expense.phaseId === phase.id)
      .reduce((sum, expense) => sum + expense.total, 0);

    return {
      ...phase,
      total,
      percent: phase.budget ? Math.round((total / phase.budget) * 100) : 0,
    };
  });

  const activeDeliveries = deliveryMovements.filter(
    (movement) => movement.projectId === activeProject.id,
  );

  return (
    <main className="space-y-6">
      <section className="blueprint-panel overflow-hidden rounded-lg">
        <div className="border-l-4 border-blueprint-accent p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <span className="text-sm font-medium text-blueprint-accent">Obra aberta</span>
            <h1 className="mt-2 text-2xl font-semibold text-blueprint-ink">
              {activeProject.name}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-blueprint-muted">
              {activeProject.address} - inicio em {formatDate(activeProject.startDate)} - investidor {activeProject.investor}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/obras"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-blueprint-line bg-white px-4 text-sm font-medium text-blueprint-ink transition hover:bg-blueprint-surface"
            >
              <Building2 className="h-4 w-4" />
              Trocar obra
            </Link>
            <Link
              href="/despesas"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blueprint-accent px-4 text-sm font-medium text-white transition hover:bg-[#095f99]"
            >
              <ReceiptText className="h-4 w-4" />
              Lançar despesa
            </Link>
          </div>
        </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Pago", value: formatCurrency(paidTotal), icon: WalletCards },
          { label: "Pendente", value: formatCurrency(pendingTotal), icon: AlertCircle },
          { label: "Sem comprovante", value: String(missingAttachments), icon: FileX2 },
          { label: "Não enviado ao contador", value: String(notSent), icon: CheckCircle2 },
        ].map((metric) => (
          <article
            key={metric.label}
            className="blueprint-panel rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-blueprint-muted">{metric.label}</span>
              <metric.icon className="h-4 w-4 text-blueprint-accent" />
            </div>
            <p className="mt-3 text-xl font-semibold text-blueprint-ink">{metric.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="blueprint-panel rounded-lg">
          <div className="border-b border-blueprint-line px-5 py-4">
            <h2 className="text-base font-semibold text-blueprint-ink">Gasto por fase</h2>
          </div>
          <div className="divide-y divide-blueprint-line">
            {phaseRows.map((phase) => (
              <div key={phase.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-blueprint-ink">{phase.name}</p>
                    <p className="text-xs text-blueprint-muted">
                      {formatCurrency(phase.total)} de {formatCurrency(phase.budget)}
                    </p>
                  </div>
                  <Badge tone={phase.percent > 85 ? "amber" : "gray"}>{phase.percent}%</Badge>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-blueprint-accent"
                    style={{ width: `${Math.min(phase.percent, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="blueprint-panel rounded-lg">
          <div className="border-b border-blueprint-line px-5 py-4">
            <h2 className="text-base font-semibold text-blueprint-ink">Itens com entrega parcial</h2>
          </div>
          <div className="divide-y divide-blueprint-line">
            {activeDeliveries.length ? (
              activeDeliveries.map((movement) => {
                const supplier = suppliers.find((item) => item.id === movement.supplierId);

                return (
                  <div key={movement.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-blueprint-ink">{movement.itemName}</p>
                        <p className="mt-1 text-xs text-blueprint-muted">
                          {supplier?.name} - entregue para {movement.deliveredTo}
                        </p>
                      </div>
                      <Badge tone={movement.balance === 0 ? "green" : "amber"}>
                        saldo {movement.balance}
                      </Badge>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="px-5 py-8 text-sm text-blueprint-muted">
                Sem entregas parciais registradas para esta obra.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
