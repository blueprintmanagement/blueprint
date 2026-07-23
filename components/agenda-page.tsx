"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Landmark,
  Plus,
  ReceiptText,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/field";
import { useProject } from "@/components/project-context";
import { AgendaEntryType, Project } from "@/lib/mock-data";
import { displayText } from "@/lib/display";
import { formatCurrency } from "@/lib/format";

type AgendaEventSource = "Automático" | "Manual";
type AgendaEventKind =
  | "Empreendimento"
  | "Terreno"
  | "Despesa"
  | "Pagamento"
  | "Lembrete"
  | "Anotação"
  | "Mudança de fase"
  | "Outro";

type AgendaEvent = {
  id: string;
  date: string;
  title: string;
  description: string;
  projectId: string;
  projectName: string;
  source: AgendaEventSource;
  kind: AgendaEventKind;
  tone: "green" | "amber" | "gray" | "violet";
  phaseName?: string;
};

const manualTypes: AgendaEntryType[] = ["Lembrete", "Anotação", "Mudança de fase", "Outro"];

const eventIcons: Record<AgendaEventKind, React.ElementType> = {
  Anotação: FileText,
  Despesa: ReceiptText,
  Empreendimento: Building2,
  Lembrete: Bell,
  "Mudança de fase": CalendarDays,
  Outro: FileText,
  Pagamento: CheckCircle2,
  Terreno: Landmark,
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}-02T12:00:00`));
}

function addMonths(date: string, months: number) {
  const parsed = new Date(`${date}T12:00:00`);
  parsed.setMonth(parsed.getMonth() + months);

  return parsed.toISOString().slice(0, 10);
}

function getPhaseName(project: Project, phaseId?: string) {
  return project.phases.find((phase) => phase.id === phaseId)?.name;
}

function getAvailableMonths(events: AgendaEvent[]) {
  return Array.from(new Set(events.map((event) => event.date.slice(0, 7))))
    .sort((a, b) => b.localeCompare(a))
    .map((value) => ({
      label: formatMonth(value),
      value,
    }));
}

function groupEventsByDate(events: AgendaEvent[]) {
  return events.reduce<Record<string, AgendaEvent[]>>((acc, event) => {
    acc[event.date] = [...(acc[event.date] ?? []), event];
    return acc;
  }, {});
}

export function AgendaPage() {
  const {
    activeProject,
    addAgendaEntry,
    agendaEntries,
    deleteAgendaEntry,
    expenses,
    projects,
    suppliers,
  } = useProject();
  const [projectFilter, setProjectFilter] = useState(activeProject.id);
  const [monthFilter, setMonthFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: "",
    phaseId: "",
    projectId: activeProject.id,
    title: "",
    type: "Lembrete" as AgendaEntryType,
  });
  const [error, setError] = useState("");

  const automaticEvents = useMemo<AgendaEvent[]>(() => {
    const projectEvents = projects.flatMap((project) => {
      const events: AgendaEvent[] = [];

      if (project.acquisitionDate) {
        events.push({
          date: project.acquisitionDate,
          description: project.landValue
            ? `Valor registrado: ${formatCurrency(project.landValue)}`
            : "Data de aquisição do terreno registrada no empreendimento.",
          id: `auto-${project.id}-acquisition`,
          kind: "Terreno",
          projectId: project.id,
          projectName: project.name,
          source: "Automático",
          title: "Aquisição do terreno",
          tone: "violet",
        });
      }

      if (project.startDate) {
        events.push({
          date: project.startDate,
          description: project.durationMonths
            ? `Prazo planejado: ${project.durationMonths} meses.`
            : "Data inicial registrada no cronograma.",
          id: `auto-${project.id}-start`,
          kind: "Empreendimento",
          projectId: project.id,
          projectName: project.name,
          source: "Automático",
          title: "Início do empreendimento",
          tone: "green",
        });
      }

      if (project.expectedDeliveryDate) {
        events.push({
          date: project.expectedDeliveryDate,
          description: "Previsão de entrega cadastrada no empreendimento.",
          id: `auto-${project.id}-delivery`,
          kind: "Empreendimento",
          projectId: project.id,
          projectName: project.name,
          source: "Automático",
          title: "Previsão de entrega",
          tone: "amber",
        });
      } else if (project.durationMonths && project.startDate) {
        events.push({
          date: addMonths(project.startDate, project.durationMonths),
          description: `Data estimada pelo prazo de ${project.durationMonths} meses.`,
          id: `auto-${project.id}-deadline`,
          kind: "Empreendimento",
          projectId: project.id,
          projectName: project.name,
          source: "Automático",
          title: "Prazo estimado do empreendimento",
          tone: "amber",
        });
      }

      return events;
    });

    const expenseEvents = expenses.flatMap((expense) => {
      const project = projects.find((item) => item.id === expense.projectId);
      const supplier = suppliers.find((item) => item.id === expense.supplierId);

      if (!project) {
        return [];
      }

      const events: AgendaEvent[] = [
        {
          date: expense.purchaseDate,
          description: `${supplier?.name ?? "Fornecedor não encontrado"} - ${formatCurrency(expense.total)} - ${displayText(expense.paymentMethod)}.`,
          id: `auto-${expense.id}-purchase`,
          kind: "Despesa",
          phaseName: getPhaseName(project, expense.phaseId),
          projectId: project.id,
          projectName: project.name,
          source: "Automático",
          title: `Compra: ${displayText(expense.description)}`,
          tone: expense.status === "Pago" ? "green" : "amber",
        },
      ];

      if (expense.invoicePaymentDate) {
        events.push({
          date: expense.invoicePaymentDate,
          description: `Fatura vinculada à despesa ${displayText(expense.description)}.`,
          id: `auto-${expense.id}-invoice-payment`,
          kind: "Pagamento",
          phaseName: getPhaseName(project, expense.phaseId),
          projectId: project.id,
          projectName: project.name,
          source: "Automático",
          title: "Pagamento de fatura",
          tone: expense.status === "Pago" ? "green" : "amber",
        });
      }

      if (expense.storePaymentDate) {
        events.push({
          date: expense.storePaymentDate,
          description: `Pagamento na loja/fornecedor: ${supplier?.name ?? "Fornecedor não encontrado"}.`,
          id: `auto-${expense.id}-store-payment`,
          kind: "Pagamento",
          phaseName: getPhaseName(project, expense.phaseId),
          projectId: project.id,
          projectName: project.name,
          source: "Automático",
          title: "Pagamento ao fornecedor",
          tone: expense.status === "Pago" ? "green" : "amber",
        });
      }

      return events;
    });

    return [...projectEvents, ...expenseEvents];
  }, [expenses, projects, suppliers]);

  const manualEvents = useMemo<AgendaEvent[]>(() => {
    return agendaEntries.map((entry) => {
      const project = projects.find((item) => item.id === entry.projectId) ?? activeProject;

      return {
        date: entry.date,
        description: entry.description || "Registro manual sem descrição.",
        id: entry.id,
        kind: entry.type,
        phaseName: getPhaseName(project, entry.phaseId),
        projectId: project.id,
        projectName: project.name,
        source: "Manual",
        title: entry.title,
        tone:
          entry.type === "Mudança de fase"
            ? "violet"
            : entry.type === "Lembrete"
              ? "amber"
              : "gray",
      };
    });
  }, [activeProject, agendaEntries, projects]);

  const allEvents = useMemo(
    () => [...automaticEvents, ...manualEvents].sort((a, b) => a.date.localeCompare(b.date)),
    [automaticEvents, manualEvents],
  );
  const availableMonths = useMemo(() => getAvailableMonths(allEvents), [allEvents]);
  const filteredEvents = useMemo(() => {
    return allEvents
      .filter((event) => projectFilter === "all" || event.projectId === projectFilter)
      .filter((event) => monthFilter === "all" || event.date.startsWith(monthFilter))
      .filter((event) => typeFilter === "all" || event.kind === typeFilter || event.source === typeFilter)
      .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  }, [allEvents, monthFilter, projectFilter, typeFilter]);
  const groupedEvents = groupEventsByDate(filteredEvents);
  const nextEvents = allEvents.filter((event) => event.date >= new Date().toISOString().slice(0, 10));
  const selectedProject = projects.find((project) => project.id === form.projectId) ?? activeProject;

  function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.date || !form.title.trim()) {
      setError("Informe data e título do registro.");
      return;
    }

    addAgendaEntry({
      createdAt: new Date().toISOString(),
      date: form.date,
      description: form.description.trim() || undefined,
      id: `agenda-${Date.now()}`,
      phaseId: form.type === "Mudança de fase" ? form.phaseId || undefined : undefined,
      projectId: form.projectId,
      title: form.title.trim(),
      type: form.type,
    });
    setError("");
    setIsCreating(false);
    setForm((current) => ({
      ...current,
      description: "",
      phaseId: "",
      title: "",
      type: "Lembrete",
    }));
  }

  return (
    <main className="space-y-5">
      <section className="blueprint-panel overflow-hidden rounded-lg p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="blueprint-kicker">Agenda</span>
            <h1 className="mt-3 text-3xl font-semibold text-blueprint-ink">
              Linha do tempo operacional
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-blueprint-muted">
              Reúne automaticamente despesas, datas do empreendimento e prazos importantes, além
              de lembretes, anotações e mudanças de fase adicionados manualmente.
            </p>
          </div>
          <Button type="button" className="justify-start" onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4" />
            Adicionar registro
          </Button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Registros filtrados", value: String(filteredEvents.length) },
          { label: "Automáticos", value: String(filteredEvents.filter((event) => event.source === "Automático").length) },
          { label: "Manuais", value: String(filteredEvents.filter((event) => event.source === "Manual").length) },
          { label: "Próximos eventos", value: String(nextEvents.length) },
        ].map((metric) => (
          <article key={metric.label} className="blueprint-panel rounded-lg p-4">
            <p className="text-sm text-blueprint-muted">{metric.label}</p>
            <p className="mt-2 text-2xl font-semibold text-blueprint-ink">{metric.value}</p>
          </article>
        ))}
      </section>

      {isCreating ? (
        <form onSubmit={submitEntry} className="blueprint-panel rounded-lg p-5 shadow-lift">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-blueprint-ink">Novo registro manual</h2>
              <p className="mt-1 text-sm text-blueprint-muted">
                Use para lembretes, anotações e mudança de fase que não vêm automaticamente das
                despesas ou do cadastro do empreendimento.
              </p>
            </div>
            <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>
              Cancelar
            </Button>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[170px_190px_1fr_1fr]">
            <FieldLabel label="Data">
              <Input
                type="date"
                value={form.date}
                onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
              />
            </FieldLabel>
            <FieldLabel label="Tipo">
              <Select
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    phaseId: event.target.value === "Mudança de fase" ? current.phaseId : "",
                    type: event.target.value as AgendaEntryType,
                  }))
                }
              >
                {manualTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </Select>
            </FieldLabel>
            <FieldLabel label="Empreendimento">
              <Select
                value={form.projectId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, phaseId: "", projectId: event.target.value }))
                }
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </FieldLabel>
            <FieldLabel label="Título">
              <Input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Ex: Conferir orçamento com investidor"
              />
            </FieldLabel>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[220px_1fr]">
            <FieldLabel label="Fase">
              <Select
                disabled={form.type !== "Mudança de fase"}
                value={form.phaseId}
                onChange={(event) => setForm((current) => ({ ...current, phaseId: event.target.value }))}
              >
                <option value="">Sem fase específica</option>
                {selectedProject.phases.map((phase) => (
                  <option key={phase.id} value={phase.id}>
                    {phase.name}
                  </option>
                ))}
              </Select>
            </FieldLabel>
            <FieldLabel label="Descrição">
              <Input
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Detalhes, observações ou combinados importantes"
              />
            </FieldLabel>
          </div>

          {error ? (
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex justify-end">
            <Button type="submit">
              <Plus className="h-4 w-4" />
              Salvar registro
            </Button>
          </div>
        </form>
      ) : null}

      <section className="blueprint-panel overflow-hidden rounded-lg">
        <div className="grid gap-3 border-b border-blueprint-line bg-white/70 p-4 lg:grid-cols-[1fr_180px_190px_1fr]">
          <Select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
            <option value="all">Todos os empreendimentos</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
          <Select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}>
            <option value="all">Todos os meses</option>
            {availableMonths.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </Select>
          <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="all">Todos os tipos</option>
            <option value="Automático">Automáticos</option>
            <option value="Manual">Manuais</option>
            <option value="Despesa">Despesas</option>
            <option value="Pagamento">Pagamentos</option>
            <option value="Empreendimento">Empreendimento</option>
            <option value="Terreno">Terreno</option>
            {manualTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </Select>
          <div className="flex items-center gap-2 rounded-md border border-blueprint-line bg-blueprint-mist px-3 text-sm text-blueprint-ink">
            <Clock3 className="h-4 w-4 text-blueprint-accent" />
            {availableMonths.length ? "Agenda sincronizada com dados locais" : "Sem registros"}
          </div>
        </div>

        <div className="divide-y divide-blueprint-line">
          {Object.entries(groupedEvents).map(([date, events]) => (
            <div key={date} className="grid gap-4 px-5 py-5 lg:grid-cols-[180px_1fr]">
              <div>
                <p className="text-sm font-semibold text-blueprint-ink">{formatDate(date)}</p>
                <p className="mt-1 text-xs text-blueprint-muted">{events.length} registro(s)</p>
              </div>
              <div className="space-y-3">
                {events.map((event) => {
                  const Icon = eventIcons[event.kind];
                  const isManual = event.source === "Manual";

                  return (
                    <article
                      key={event.id}
                      className="rounded-lg border border-blueprint-line bg-white/86 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="flex gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blueprint-mist text-blueprint-accent">
                            <Icon className="h-5 w-5" />
                          </span>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-blueprint-ink">{event.title}</h3>
                              <Badge tone={event.tone}>{event.kind}</Badge>
                              <Badge tone={isManual ? "violet" : "gray"}>{event.source}</Badge>
                            </div>
                            <p className="mt-1 text-sm leading-6 text-blueprint-muted">
                              {event.description}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-blueprint-muted">
                              <span>{event.projectName}</span>
                              {event.phaseName ? <span>Fase: {event.phaseName}</span> : null}
                            </div>
                          </div>
                        </div>
                        {isManual ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-8 px-2 text-red-700 hover:bg-red-50 hover:text-red-800"
                            onClick={() => deleteAgendaEntry(event.id)}
                            title="Excluir registro manual"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredEvents.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-blueprint-accent" />
              <p className="mt-3 font-medium text-blueprint-ink">Nenhum registro encontrado</p>
              <p className="mt-1 text-sm text-blueprint-muted">
                Ajuste os filtros ou adicione um registro manual para este período.
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
