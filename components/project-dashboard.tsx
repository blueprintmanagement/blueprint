"use client";

import Link from "next/link";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  FileX2,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useProject } from "@/components/project-context";
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
  const spentTotal = projectExpenses.reduce((sum, expense) => sum + expense.total, 0);
  const hasProjectBudget = activeProject.budget > 0;
  const usedPercent = hasProjectBudget
    ? Math.round((spentTotal / activeProject.budget) * 100)
    : 0;
  const unitTotal = activeProject.unitCount ?? activeProject.units?.length ?? 0;

  const phaseRows = activeProject.phases.map((phase) => {
    const total = projectExpenses
      .filter((expense) => expense.phaseId === phase.id)
      .reduce((sum, expense) => sum + expense.total, 0);

    return {
      ...phase,
      hasBudget: phase.budget > 0,
      total,
      percent: phase.budget ? Math.round((total / phase.budget) * 100) : 0,
    };
  });

  return (
    <main className="space-y-6">
      <section className="blueprint-panel overflow-hidden rounded-lg">
        <div className="grid gap-5 p-5 xl:grid-cols-[1fr_320px]">
          <div className="flex flex-col justify-between">
            <div>
              <span className="blueprint-kicker">Empreendimento aberto</span>
              <h1 className="mt-3 text-3xl font-semibold text-blueprint-ink">
                {activeProject.name}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-blueprint-muted">
                {activeProject.address} - início em {formatDate(activeProject.startDate)} -
                investidor {activeProject.investor}
              </p>
              {activeProject.description ? (
                <p className="mt-3 max-w-3xl text-sm leading-6 text-blueprint-ink">
                  {activeProject.description}
                </p>
              ) : null}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/obras"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-blueprint-line bg-white/90 px-4 text-sm font-medium text-blueprint-ink shadow-sm transition hover:border-blueprint-accent hover:bg-[#eef7ff]"
              >
                <Building2 className="h-4 w-4" />
                Trocar empreendimento
              </Link>
              <Link
                href="/despesas"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blueprint-accent px-4 text-sm font-medium text-white shadow-[0_10px_22px_rgba(11,118,189,0.22)] transition hover:bg-[#0867a7]"
              >
                <ReceiptText className="h-4 w-4" />
                Lançar despesa
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-blueprint-line bg-blueprint-ink p-4 text-white shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#b9d9ef]">
                  Uso do orçamento
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {hasProjectBudget ? `${usedPercent}%` : "Livre"}
                </p>
              </div>
              <CircleDollarSign className="h-7 w-7 text-[#71c5ec]" />
            </div>
            <div className="mt-4 h-2 rounded-full bg-white/12">
              <div
                className="h-2 rounded-full bg-blueprint-warm"
                style={{ width: `${hasProjectBudget ? Math.min(usedPercent, 100) : 100}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-[#d7e8f5]">
              {hasProjectBudget
                ? `${formatCurrency(spentTotal)} de ${formatCurrency(activeProject.budget)}`
                : `${formatCurrency(spentTotal)} registrados sem teto definido`}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {[
          {
            label: "Terreno",
            value: activeProject.landValue ? formatCurrency(activeProject.landValue) : "Não informado",
          },
          {
            label: "Metragem",
            value: activeProject.constructionArea
              ? `${activeProject.constructionArea} m²`
              : "Não informada",
          },
          {
            label: "Unidades",
            value: unitTotal ? String(unitTotal) : "Sem unidades",
          },
          {
            label: "Entrega prevista",
            value: activeProject.expectedDeliveryDate
              ? formatDate(activeProject.expectedDeliveryDate)
              : "Não definida",
          },
        ].map((item) => (
          <article key={item.label} className="blueprint-panel rounded-lg p-4">
            <p className="text-sm text-blueprint-muted">{item.label}</p>
            <p className="mt-2 text-lg font-semibold text-blueprint-ink">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {[
          {
            bg: "bg-emerald-50",
            icon: WalletCards,
            label: "Pago",
            tone: "text-emerald-600",
            value: formatCurrency(paidTotal),
          },
          {
            bg: "bg-amber-50",
            icon: AlertCircle,
            label: "Pendente",
            tone: "text-amber-600",
            value: formatCurrency(pendingTotal),
          },
          {
            bg: "bg-rose-50",
            icon: FileX2,
            label: "Sem comprovante",
            tone: "text-rose-600",
            value: String(missingAttachments),
          },
          {
            bg: "bg-blueprint-mist",
            icon: CheckCircle2,
            label: "Não enviado ao contador",
            tone: "text-blueprint-accent",
            value: String(notSent),
          },
        ].map((metric) => (
          <article
            key={metric.label}
            className="blueprint-panel rounded-lg p-4 transition hover:-translate-y-0.5 hover:shadow-lift"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-blueprint-muted">{metric.label}</span>
              <span className={`flex h-8 w-8 items-center justify-center rounded-md ${metric.bg}`}>
                <metric.icon className={`h-4 w-4 ${metric.tone}`} />
              </span>
            </div>
            <p className="mt-3 text-xl font-semibold text-blueprint-ink">{metric.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5">
        <div className="blueprint-panel overflow-hidden rounded-lg">
          <div className="border-b border-blueprint-line px-5 py-4">
            <h2 className="text-base font-semibold text-blueprint-ink">Gasto por fase</h2>
          </div>
          <div className="divide-y divide-blueprint-line">
            {phaseRows.map((phase) => (
              <div key={phase.id} className="px-5 py-4 transition hover:bg-white/70">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-blueprint-ink">{phase.name}</p>
                    <p className="text-xs text-blueprint-muted">
                      {phase.hasBudget
                        ? `${formatCurrency(phase.total)} de ${formatCurrency(phase.budget)}`
                        : `${formatCurrency(phase.total)} registrados`}
                    </p>
                  </div>
                  <Badge tone={phase.hasBudget && phase.percent > 85 ? "amber" : "gray"}>
                    {phase.hasBudget ? `${phase.percent}%` : "sem orçamento"}
                  </Badge>
                </div>
                {phase.hasBudget ? (
                  <div className="mt-3 h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-blueprint-accent"
                      style={{ width: `${Math.min(phase.percent, 100)}%` }}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
