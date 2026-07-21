"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/field";
import { useProject } from "@/components/project-context";
import { Phase, Project, ProjectStatus } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const projectStatuses: ProjectStatus[] = ["Em andamento", "Planejada", "Pausada"];
const defaultPhases = "Terraplanagem\nFundação\nEstrutura\nAlvenaria\nAcabamento";

type ProjectForm = {
  name: string;
  shortName: string;
  address: string;
  owner: string;
  investor: string;
  budget: string;
  status: ProjectStatus;
  startDate: string;
  phases: string;
  phaseBudgets: Record<string, string>;
};

const emptyProjectForm: ProjectForm = {
  name: "",
  shortName: "",
  address: "",
  owner: "",
  investor: "",
  budget: "",
  status: "Planejada",
  startDate: new Date().toISOString().slice(0, 10),
  phases: defaultPhases,
  phaseBudgets: {},
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseCurrencyInput(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".").trim();

  return Number(normalized);
}

function parsePhaseLine(line: string) {
  const [rawName, rawBudget] = line.split("|");
  const budget = rawBudget ? parseCurrencyInput(rawBudget) : 0;

  return {
    budget: Number.isFinite(budget) && budget > 0 ? budget : 0,
    name: rawName.trim(),
  };
}

function buildPhases(projectId: string, phasesText: string): Phase[] {
  const parsedPhases = phasesText
    .split("\n")
    .map(parsePhaseLine)
    .filter((phase) => phase.name);
  const phaseRows = parsedPhases.length
    ? parsedPhases
    : defaultPhases.split("\n").map((name) => ({ budget: 0, name }));

  return phaseRows.map((phase, index) => ({
    id: `${projectId}-phase-${index + 1}`,
    name: phase.name,
    budget: phase.budget,
  }));
}

function sumPhaseBudgets(phases: Phase[]) {
  return phases.reduce((total, phase) => total + phase.budget, 0);
}

export function ProjectSelectionPage() {
  const {
    activeProjectId,
    addProject,
    deleteProject,
    expenses,
    projects,
    setActiveProjectId,
    updateProject,
  } = useProject();
  const [isCreating, setIsCreating] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectForm>(emptyProjectForm);
  const [formError, setFormError] = useState("");
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleteName, setDeleteName] = useState("");
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);

  const projectLimitReached = projects.length >= 10;
  const projectSpend = useMemo(() => {
    return projects.reduce<Record<string, number>>((acc, project) => {
      acc[project.id] = expenses
        .filter((expense) => expense.projectId === project.id)
        .reduce((sum, expense) => sum + expense.total, 0);
      return acc;
    }, {});
  }, [expenses, projects]);

  function updateForm(patch: Partial<ProjectForm>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function resetCreateForm() {
    setIsCreating(false);
    setEditingProjectId(null);
    setForm(emptyProjectForm);
    setFormError("");
  }

  function startCreateProject() {
    setIsCreating(true);
    setEditingProjectId(null);
    setForm(emptyProjectForm);
    setFormError("");
  }

  function startEditProject(project: Project) {
    setIsCreating(true);
    setEditingProjectId(project.id);
    setForm({
      name: project.name,
      shortName: project.shortName,
      address: project.address,
      owner: project.owner,
      investor: project.investor === "Nenhum" ? "" : project.investor,
      budget: String(project.budget),
      status: project.status,
      startDate: project.startDate,
      phases: project.phases.map((phase) => phase.name).join("\n"),
      phaseBudgets: project.phases.reduce<Record<string, string>>((acc, phase) => {
        acc[phase.id] = phase.budget ? String(phase.budget) : "";
        return acc;
      }, {}),
    });
    setFormError("");
  }

  function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingProjectId && projectLimitReached) {
      setFormError("O limite atual de testes e de 10 obras simultâneas.");
      return;
    }

    const name = form.name.trim();
    const explicitBudget = parseCurrencyInput(form.budget);

    if (!name || !form.shortName.trim() || !form.address.trim()) {
      setFormError("Informe nome, apelido e endereço da obra.");
      return;
    }

    if (form.budget.trim() && (!Number.isFinite(explicitBudget) || explicitBudget < 0)) {
      setFormError("Informe um orçamento válido ou deixe o campo em branco.");
      return;
    }

    const investor = form.investor.trim() || "Nenhum";

    if (editingProjectId) {
      const currentProject = projects.find((project) => project.id === editingProjectId);
      const updatedPhases =
        currentProject?.phases.map((phase) => {
          const phaseBudget = parseCurrencyInput(form.phaseBudgets[phase.id] ?? "");

          return {
            ...phase,
            budget: Number.isFinite(phaseBudget) && phaseBudget > 0 ? phaseBudget : 0,
          };
        }) ?? [];
      const fallbackBudget = sumPhaseBudgets(updatedPhases);

      updateProject(editingProjectId, {
        name,
        shortName: form.shortName.trim(),
        address: form.address.trim(),
        owner: form.owner.trim() || "Responsável não informado",
        investor,
        budget: form.budget.trim() ? explicitBudget : fallbackBudget,
        phases: updatedPhases,
        status: form.status,
        startDate: form.startDate || new Date().toISOString().slice(0, 10),
      });
      resetCreateForm();
      return;
    }

    const baseId = slugify(name) || "obra";
    const projectId = `project-${baseId}-${Date.now()}`;
    const phases = buildPhases(projectId, form.phases);
    const fallbackBudget = sumPhaseBudgets(phases);
    const project: Project = {
      id: projectId,
      name,
      shortName: form.shortName.trim(),
      address: form.address.trim(),
      owner: form.owner.trim() || "Responsável não informado",
      investor,
      budget: form.budget.trim() ? explicitBudget : fallbackBudget,
      spent: 0,
      status: form.status,
      startDate: form.startDate || new Date().toISOString().slice(0, 10),
      phases,
    };

    addProject(project);
    resetCreateForm();
  }

  function openDelete(project: Project) {
    setProjectToDelete(project);
    setDeleteName("");
    setDeleteAcknowledged(false);
  }

  function closeDelete() {
    setProjectToDelete(null);
    setDeleteName("");
    setDeleteAcknowledged(false);
  }

  function confirmDelete() {
    if (!projectToDelete || deleteName !== projectToDelete.name || !deleteAcknowledged) {
      return;
    }

    deleteProject(projectToDelete.id);
    closeDelete();
  }

  return (
    <main className="space-y-6">
      <div className="blueprint-panel rounded-lg p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="text-sm font-medium text-blueprint-accent">Selecionar obra</span>
            <h1 className="mt-2 text-2xl font-semibold text-blueprint-ink">
              Escolha qual obra quer abrir
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-blueprint-muted">
              Cada obra funciona como um ambiente proprio: despesas, fases, fornecedores usados e dossiê mensal ficam focados nela.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <Badge tone={projectLimitReached ? "amber" : "gray"}>
              {projects.length}/10 obras
            </Badge>
            <Button
              type="button"
              onClick={startCreateProject}
              disabled={projectLimitReached}
              className="justify-start"
            >
              <Plus className="h-4 w-4" />
              Nova obra
            </Button>
          </div>
        </div>
      </div>

      {isCreating ? (
        <form onSubmit={submitProject} className="blueprint-panel rounded-lg p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-blueprint-ink">
                {editingProjectId ? "Editar obra" : "Criar obra do zero"}
              </h2>
              <p className="mt-1 text-sm text-blueprint-muted">
                {editingProjectId
                  ? "Atualize os dados administrativos da obra sem alterar os lançamentos existentes."
                  : "Defina as fases iniciais uma por linha. Depois poderemos evoluir isso para edição completa."}
              </p>
            </div>
            <Button type="button" variant="ghost" className="h-9 px-2" onClick={resetCreateForm}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <FieldLabel label="Nome da obra">
              <Input value={form.name} onChange={(event) => updateForm({ name: event.target.value })} placeholder="Ex: Casa Jardim Europa" />
            </FieldLabel>
            <FieldLabel label="Apelido">
              <Input value={form.shortName} onChange={(event) => updateForm({ shortName: event.target.value })} placeholder="Ex: Jardim Europa" />
            </FieldLabel>
            <FieldLabel label="Status">
              <Select value={form.status} onChange={(event) => updateForm({ status: event.target.value as ProjectStatus })}>
                {projectStatuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </Select>
            </FieldLabel>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_180px]">
            <FieldLabel label="Endereço">
              <Input value={form.address} onChange={(event) => updateForm({ address: event.target.value })} placeholder="Rua, bairro, cidade" />
            </FieldLabel>
            <FieldLabel label="Responsável">
              <Input value={form.owner} onChange={(event) => updateForm({ owner: event.target.value })} placeholder="Dona da obra" />
            </FieldLabel>
            <FieldLabel label="Investidor">
              <Input value={form.investor} onChange={(event) => updateForm({ investor: event.target.value })} placeholder="Nome, grupo ou deixe em branco para Nenhum" />
            </FieldLabel>
            <FieldLabel label="Início">
              <Input type="date" value={form.startDate} onChange={(event) => updateForm({ startDate: event.target.value })} />
            </FieldLabel>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[220px_1fr]">
            <FieldLabel label="Orçamento previsto">
              <Input
                min="0"
                step="0.01"
                type="number"
                value={form.budget}
                onChange={(event) => updateForm({ budget: event.target.value })}
                placeholder="Opcional"
              />
            </FieldLabel>
            {!editingProjectId ? (
              <FieldLabel label="Fases iniciais">
                <textarea
                  value={form.phases}
                  onChange={(event) => updateForm({ phases: event.target.value })}
                  placeholder={"Fundação | 92000\nAlvenaria | 86500\nAcabamento"}
                  className="min-h-24 rounded-md border border-blueprint-line bg-white px-3 py-2 text-sm text-blueprint-ink outline-none transition placeholder:text-slate-400 focus:border-blueprint-accent focus:ring-4 focus:ring-[#dceeff]"
                />
                <span className="text-xs font-normal text-blueprint-muted">
                  Use uma fase por linha. O valor depois de | é opcional.
                </span>
              </FieldLabel>
            ) : (
              <div className="rounded-md border border-blueprint-line bg-blueprint-surface p-3">
                <p className="text-sm font-medium text-blueprint-ink">Orçamento por fase</p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {projects
                    .find((project) => project.id === editingProjectId)
                    ?.phases.map((phase) => (
                      <FieldLabel key={phase.id} label={phase.name}>
                        <Input
                          min="0"
                          step="0.01"
                          type="number"
                          value={form.phaseBudgets[phase.id] ?? ""}
                          onChange={(event) =>
                            updateForm({
                              phaseBudgets: {
                                ...form.phaseBudgets,
                                [phase.id]: event.target.value,
                              },
                            })
                          }
                          placeholder="Sem orçamento"
                        />
                      </FieldLabel>
                    ))}
                </div>
              </div>
            )}
          </div>

          {formError ? (
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {formError}
            </p>
          ) : null}

          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={resetCreateForm}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingProjectId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingProjectId ? "Salvar alterações" : "Criar e abrir obra"}
            </Button>
          </div>
        </form>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        {projects.map((project) => {
          const isActive = project.id === activeProjectId;
          const spent = projectSpend[project.id] ?? 0;
          const hasBudget = project.budget > 0;
          const percent = hasBudget ? Math.round((spent / project.budget) * 100) : 0;
          const canDelete = projects.length > 1;

          return (
            <article
              key={project.id}
              className={cn(
                "rounded-lg border bg-white p-5 shadow-sm transition",
                isActive ? "border-blueprint-accent ring-4 ring-[#dceeff]" : "border-blueprint-line hover:-translate-y-0.5 hover:border-blueprint-accent",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blueprint-ink text-lg font-semibold text-white">
                  {project.shortName.slice(0, 2).toUpperCase()}
                </div>
                {isActive ? (
                  <Badge tone="green">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    aberta
                  </Badge>
                ) : (
                  <Badge tone="gray">{project.status}</Badge>
                )}
              </div>

              <h2 className="mt-5 text-lg font-semibold text-blueprint-ink">{project.name}</h2>
              <p className="mt-2 text-sm text-blueprint-muted">{project.address}</p>

              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-blueprint-muted">Investidor</dt>
                  <dd className="mt-1 font-medium text-blueprint-ink">{project.investor}</dd>
                </div>
                <div>
                  <dt className="text-blueprint-muted">Orçamento usado</dt>
                  <dd className="mt-1 font-medium text-blueprint-ink">
                    {hasBudget ? `${percent}%` : "Sem orçamento"}
                  </dd>
                </div>
              </dl>

              {hasBudget ? (
                <div className="mt-5 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-blueprint-accent"
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>
              ) : null}

              <p className="mt-3 text-sm text-blueprint-muted">
                {hasBudget ? `${formatCurrency(spent)} de ${formatCurrency(project.budget)}` : `${formatCurrency(spent)} registrados`}
              </p>

              <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                <Button
                  className="w-full"
                  variant={isActive ? "secondary" : "primary"}
                  onClick={() => setActiveProjectId(project.id)}
                >
                  {isActive ? "Obra selecionada" : "Abrir obra"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => startEditProject(project)}
                  title="Editar obra"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-700 hover:bg-red-50 hover:text-red-800"
                  disabled={!canDelete}
                  onClick={() => openDelete(project)}
                  title={canDelete ? "Excluir obra" : "Não e possível excluir a última obra"}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </article>
          );
        })}
      </section>

      <Link
        href="/"
        className="inline-flex h-10 items-center justify-center rounded-md border border-blueprint-line bg-white px-4 text-sm font-medium text-blueprint-ink transition hover:bg-blueprint-surface"
      >
        Ir para dashboard da obra aberta
      </Link>

      {projectToDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/50 px-4">
          <section className="w-full max-w-lg rounded-lg border border-red-200 bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-sm font-semibold text-red-700">Exclusao permanente</span>
                <h2 className="mt-2 text-xl font-semibold text-blueprint-ink">
                  Excluir {projectToDelete.name}?
                </h2>
                <p className="mt-2 text-sm text-blueprint-muted">
                  Esta ação remove a obra e todos os lançamentos ligados a ela deste protótipo local. Para confirmar, digite o nome exato da obra.
                </p>
              </div>
              <Button type="button" variant="ghost" className="h-9 px-2" onClick={closeDelete}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              Nome exigido: <strong>{projectToDelete.name}</strong>
            </div>

            <div className="mt-4 space-y-3">
              <FieldLabel label="Digite o nome da obra">
                <Input value={deleteName} onChange={(event) => setDeleteName(event.target.value)} />
              </FieldLabel>
              <label className="flex items-start gap-2 rounded-md border border-blueprint-line bg-blueprint-surface px-3 py-2 text-sm text-blueprint-ink">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={deleteAcknowledged}
                  onChange={(event) => setDeleteAcknowledged(event.target.checked)}
                />
                Entendo que as despesas desta obra serão removidas do ambiente local de testes.
              </label>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={closeDelete}>
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-red-700 hover:bg-red-800"
                disabled={deleteName !== projectToDelete.name || !deleteAcknowledged}
                onClick={confirmDelete}
              >
                <Trash2 className="h-4 w-4" />
                Excluir definitivamente
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
