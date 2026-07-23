"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
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
import { cn } from "@/lib/utils";

type ViewMode = "list" | "calendar";
type ManualFormType = "Lembrete" | "Mudança de fase" | "Outro";
type AgendaEventSource = "Automático" | "Manual";
type AgendaEventKind =
  | "Empreendimento"
  | "Terreno"
  | "Despesa"
  | "Pagamento"
  | "Nota / lembrete"
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

const manualTypeOptions: Array<{
  description: string;
  label: string;
  value: ManualFormType;
}> = [
  {
    description: "Recado, tarefa simples, observação do dia ou algo para lembrar depois.",
    label: "Nota / lembrete",
    value: "Lembrete",
  },
  {
    description: "Registra início, pausa, retomada ou troca de etapa do empreendimento.",
    label: "Mudança de fase",
    value: "Mudança de fase",
  },
  {
    description: "Use para eventos que não se encaixam nas opções acima.",
    label: "Outro",
    value: "Outro",
  },
];

const eventIcons: Record<AgendaEventKind, React.ElementType> = {
  Despesa: ReceiptText,
  Empreendimento: Building2,
  "Mudança de fase": CalendarDays,
  "Nota / lembrete": Bell,
  Outro: FileText,
  Pagamento: CheckCircle2,
  Terreno: Landmark,
};

const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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

function addMonthToPeriod(period: string, offset: number) {
  const parsed = new Date(`${period}-02T12:00:00`);
  parsed.setMonth(parsed.getMonth() + offset);

  return parsed.toISOString().slice(0, 7);
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

function getCalendarDays(period: string) {
  const firstDay = new Date(`${period}-01T12:00:00`);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    return {
      date: date.toISOString().slice(0, 10),
      day: date.getDate(),
      inMonth: date.toISOString().slice(0, 7) === period,
    };
  });
}

function normalizeManualKind(type: AgendaEntryType): AgendaEventKind {
  if (type === "Mudança de fase") return "Mudança de fase";
  if (type === "Outro") return "Outro";

  return "Nota / lembrete";
}

function toAgendaEntryType(type: ManualFormType): AgendaEntryType {
  return type;
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
  const today = new Date().toISOString().slice(0, 10);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [projectFilter, setProjectFilter] = useState(activeProject.id);
  const [monthFilter, setMonthFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [calendarMonth, setCalendarMonth] = useState(today.slice(0, 7));
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({
    date: today,
    description: "",
    phaseId: "",
    projectId: activeProject.id,
    title: "",
    type: "Lembrete" as ManualFormType,
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

      if (!project) return [];

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
      const kind = normalizeManualKind(entry.type);

      return {
        date: entry.date,
        description: entry.description || "Registro manual sem descrição.",
        id: entry.id,
        kind,
        phaseName: getPhaseName(project, entry.phaseId),
        projectId: project.id,
        projectName: project.name,
        source: "Manual",
        title: entry.title,
        tone: kind === "Mudança de fase" ? "violet" : kind === "Nota / lembrete" ? "amber" : "gray",
      };
    });
  }, [activeProject, agendaEntries, projects]);

  const allEvents = useMemo(
    () => [...automaticEvents, ...manualEvents].sort((a, b) => a.date.localeCompare(b.date)),
    [automaticEvents, manualEvents],
  );
  const availableMonths = useMemo(() => getAvailableMonths(allEvents), [allEvents]);
  const typeOptions = useMemo(
    () => Array.from(new Set(allEvents.map((event) => event.kind))).sort(),
    [allEvents],
  );
  const filteredEvents = useMemo(() => {
    return allEvents
      .filter((event) => projectFilter === "all" || event.projectId === projectFilter)
      .filter((event) => viewMode === "calendar" || monthFilter === "all" || event.date.startsWith(monthFilter))
      .filter((event) => typeFilter === "all" || event.kind === typeFilter || event.source === typeFilter)
      .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  }, [allEvents, monthFilter, projectFilter, typeFilter, viewMode]);
  const groupedEvents = groupEventsByDate(filteredEvents);
  const calendarEvents = filteredEvents.filter((event) => event.date.startsWith(calendarMonth));
  const calendarEventsByDate = groupEventsByDate(calendarEvents);
  const calendarDays = getCalendarDays(calendarMonth);
  const nextEvents = allEvents.filter((event) => event.date >= today);
  const selectedProject = projects.find((project) => project.id === form.projectId) ?? activeProject;
  const requiresPhase = form.type === "Mudança de fase";

  function resetForm() {
    setForm((current) => ({
      ...current,
      description: "",
      phaseId: "",
      title: "",
      type: "Lembrete",
    }));
    setError("");
  }

  function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.date || !form.title.trim()) {
      setError("Informe data e título do registro.");
      return;
    }

    if (requiresPhase && !form.phaseId) {
      setError("Escolha a fase vinculada à mudança.");
      return;
    }

    addAgendaEntry({
      createdAt: new Date().toISOString(),
      date: form.date,
      description: form.description.trim() || undefined,
      id: `agenda-${Date.now()}`,
      phaseId: requiresPhase ? form.phaseId : undefined,
      projectId: form.projectId,
      title: form.title.trim(),
      type: toAgendaEntryType(form.type),
    });
    setIsCreating(false);
    resetForm();
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
              de notas, lembretes e mudanças de fase adicionados manualmente.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="grid grid-cols-2 rounded-md border border-blueprint-line bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "rounded px-3 py-2 text-sm font-medium transition",
                  viewMode === "list" ? "bg-blueprint-ink text-white" : "text-blueprint-muted hover:bg-blueprint-surface",
                )}
              >
                Lista
              </button>
              <button
                type="button"
                onClick={() => setViewMode("calendar")}
                className={cn(
                  "rounded px-3 py-2 text-sm font-medium transition",
                  viewMode === "calendar" ? "bg-blueprint-ink text-white" : "text-blueprint-muted hover:bg-blueprint-surface",
                )}
              >
                Calendário
              </button>
            </div>
            <Button type="button" className="justify-start" onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4" />
              Adicionar registro
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Registros filtrados", value: String(viewMode === "calendar" ? calendarEvents.length : filteredEvents.length) },
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
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsCreating(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {manualTypeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    phaseId: option.value === "Mudança de fase" ? current.phaseId : "",
                    type: option.value,
                  }))
                }
                className={cn(
                  "rounded-lg border px-4 py-3 text-left transition",
                  form.type === option.value
                    ? "border-blueprint-accent bg-[#eef7ff] ring-2 ring-[#dceeff]"
                    : "border-blueprint-line bg-white hover:border-blueprint-accent",
                )}
              >
                <span className="text-sm font-semibold text-blueprint-ink">{option.label}</span>
                <span className="mt-1 block text-xs leading-5 text-blueprint-muted">
                  {option.description}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[170px_1fr_1fr]">
            <FieldLabel label="Data">
              <Input
                type="date"
                value={form.date}
                onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
              />
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
            <FieldLabel label={requiresPhase ? "Título da mudança" : "Título"}>
              <Input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder={requiresPhase ? "Ex: Início da alvenaria" : "Ex: Conferir orçamento com investidor"}
              />
            </FieldLabel>
          </div>

          <div className={cn("mt-3 grid gap-3", requiresPhase ? "lg:grid-cols-[280px_1fr]" : "lg:grid-cols-1")}>
            {requiresPhase ? (
              <FieldLabel label="Fase vinculada">
                <Select
                  value={form.phaseId}
                  onChange={(event) => setForm((current) => ({ ...current, phaseId: event.target.value }))}
                >
                  <option value="">Selecione uma fase</option>
                  {selectedProject.phases.map((phase) => (
                    <option key={phase.id} value={phase.id}>
                      {phase.name}
                    </option>
                  ))}
                </Select>
              </FieldLabel>
            ) : null}
            <FieldLabel label={requiresPhase ? "Observação da mudança" : "Texto do registro"}>
              <Input
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder={
                  requiresPhase
                    ? "Ex: Equipe liberada para começar a etapa nesta data"
                    : "Detalhes, observações ou combinados importantes"
                }
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
          <Select
            value={monthFilter}
            onChange={(event) => {
              setMonthFilter(event.target.value);
              if (event.target.value !== "all") setCalendarMonth(event.target.value);
            }}
            disabled={viewMode === "calendar"}
          >
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
            {typeOptions.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </Select>
          <div className="flex items-center gap-2 rounded-md border border-blueprint-line bg-blueprint-mist px-3 text-sm text-blueprint-ink">
            <Clock3 className="h-4 w-4 text-blueprint-accent" />
            {viewMode === "calendar"
              ? "Calendário mensal com registros destacados"
              : "Agenda sincronizada com dados locais"}
          </div>
        </div>

        {viewMode === "list" ? (
          <AgendaListView
            deleteAgendaEntry={deleteAgendaEntry}
            events={filteredEvents}
            groupedEvents={groupedEvents}
          />
        ) : (
          <AgendaCalendarView
            calendarEventsByDate={calendarEventsByDate}
            calendarMonth={calendarMonth}
            days={calendarDays}
            onMonthChange={setCalendarMonth}
            today={today}
          />
        )}
      </section>
    </main>
  );
}

function AgendaListView({
  deleteAgendaEntry,
  events,
  groupedEvents,
}: {
  deleteAgendaEntry: (entryId: string) => void;
  events: AgendaEvent[];
  groupedEvents: Record<string, AgendaEvent[]>;
}) {
  return (
    <div className="divide-y divide-blueprint-line">
      {Object.entries(groupedEvents).map(([date, items]) => (
        <div key={date} className="grid gap-4 px-5 py-5 lg:grid-cols-[180px_1fr]">
          <div>
            <p className="text-sm font-semibold text-blueprint-ink">{formatDate(date)}</p>
            <p className="mt-1 text-xs text-blueprint-muted">{items.length} registro(s)</p>
          </div>
          <div className="space-y-3">
            {items.map((event) => (
              <AgendaEventCard
                key={event.id}
                event={event}
                onDelete={event.source === "Manual" ? () => deleteAgendaEntry(event.id) : undefined}
              />
            ))}
          </div>
        </div>
      ))}

      {events.length === 0 ? <AgendaEmptyState /> : null}
    </div>
  );
}

function AgendaCalendarView({
  calendarEventsByDate,
  calendarMonth,
  days,
  onMonthChange,
  today,
}: {
  calendarEventsByDate: Record<string, AgendaEvent[]>;
  calendarMonth: string;
  days: Array<{ date: string; day: number; inMonth: boolean }>;
  onMonthChange: (month: string) => void;
  today: string;
}) {
  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-blueprint-line px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold capitalize text-blueprint-ink">
            {formatMonth(calendarMonth)}
          </h2>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-9 px-3"
            onClick={() => onMonthChange(addMonthToPeriod(calendarMonth, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-9 px-3"
            onClick={() => onMonthChange(today.slice(0, 7))}
          >
            Hoje
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-9 px-3"
            onClick={() => onMonthChange(addMonthToPeriod(calendarMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-7 border-b border-blueprint-line bg-blueprint-surface text-center text-xs font-semibold uppercase tracking-[0.04em] text-blueprint-muted">
            {weekDays.map((day) => (
              <div key={day} className="px-2 py-3">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day) => {
              const events = calendarEventsByDate[day.date] ?? [];
              const isToday = day.date === today;
              const isPast = day.date < today;

              return (
                <div
                  key={day.date}
                  className={cn(
                    "min-h-32 border-b border-r border-blueprint-line p-2 transition",
                    day.inMonth ? "bg-white/82" : "bg-slate-50/60",
                    isPast && day.inMonth ? "text-slate-400" : "text-blueprint-ink",
                    isToday ? "bg-[#eef7ff] ring-2 ring-inset ring-blueprint-accent" : "",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                        isToday ? "bg-blueprint-accent text-white" : day.inMonth ? "bg-blueprint-surface" : "bg-white text-slate-400",
                      )}
                    >
                      {day.day}
                    </span>
                    {events.length ? (
                      <Badge tone={events.some((event) => event.tone === "amber") ? "amber" : "gray"}>
                        {events.length}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="mt-2 space-y-1.5">
                    {events.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className={cn(
                          "rounded-md border px-2 py-1 text-xs leading-4",
                          event.source === "Manual"
                            ? "border-[#d7dcff] bg-[#f4f6ff] text-[#4554a6]"
                            : "border-blueprint-line bg-white text-blueprint-ink",
                        )}
                        title={`${event.title} - ${event.projectName}`}
                      >
                        <p className="truncate font-medium">{event.title}</p>
                        <p className="truncate text-[0.68rem] opacity-75">{event.kind}</p>
                      </div>
                    ))}
                    {events.length > 3 ? (
                      <p className="text-xs font-medium text-blueprint-muted">
                        +{events.length - 3} registro(s)
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function AgendaEventCard({
  event,
  onDelete,
}: {
  event: AgendaEvent;
  onDelete?: () => void;
}) {
  const Icon = eventIcons[event.kind];

  return (
    <article className="rounded-lg border border-blueprint-line bg-white/86 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blueprint-mist text-blueprint-accent">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-blueprint-ink">{event.title}</h3>
              <Badge tone={event.tone}>{event.kind}</Badge>
              <Badge tone={event.source === "Manual" ? "violet" : "gray"}>{event.source}</Badge>
            </div>
            <p className="mt-1 text-sm leading-6 text-blueprint-muted">{event.description}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-blueprint-muted">
              <span>{event.projectName}</span>
              {event.phaseName ? <span>Fase: {event.phaseName}</span> : null}
            </div>
          </div>
        </div>
        {onDelete ? (
          <Button
            type="button"
            variant="ghost"
            className="h-8 px-2 text-red-700 hover:bg-red-50 hover:text-red-800"
            onClick={onDelete}
            title="Excluir registro manual"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function AgendaEmptyState() {
  return (
    <div className="px-5 py-12 text-center">
      <CalendarDays className="mx-auto h-8 w-8 text-blueprint-accent" />
      <p className="mt-3 font-medium text-blueprint-ink">Nenhum registro encontrado</p>
      <p className="mt-1 text-sm text-blueprint-muted">
        Ajuste os filtros ou adicione um registro manual para este período.
      </p>
    </div>
  );
}
