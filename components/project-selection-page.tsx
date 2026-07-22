"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/field";
import { useProject } from "@/components/project-context";
import { Phase, Project, ProjectStatus, ProjectUnit } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const projectStatuses: ProjectStatus[] = ["Planejamento", "Obra", "Pronto", "Entregue"];
const defaultPhases = "Terraplanagem\nFundação\nEstrutura\nAlvenaria\nAcabamento";
const budgetModes = [
  {
    description: "O empreendimento começa apenas registrando gastos. O orçamento pode ser definido depois.",
    label: "Sem orçamento definido",
    value: "none",
  },
  {
    description: "Informe um valor total simples para acompanhar quanto já foi usado.",
    label: "Orçamento geral",
    value: "general",
  },
  {
    description: "Distribua valores entre as fases para comparar o gasto por etapa.",
    label: "Por fase",
    value: "byPhase",
  },
] as const;

type BudgetMode = (typeof budgetModes)[number]["value"];

type ProjectForm = {
  name: string;
  shortName: string;
  address: string;
  description: string;
  owner: string;
  investor: string;
  budget: string;
  budgetMode: BudgetMode;
  status: ProjectStatus;
  isActive: boolean;
  startDate: string;
  landValue: string;
  acquisitionDate: string;
  plannedCostPerSquareMeter: string;
  laborCostPerSquareMeter: string;
  constructionArea: string;
  taxRate: string;
  unitCount: string;
  units: ProjectUnitForm[];
  durationMonths: string;
  expectedDeliveryDate: string;
  phases: string;
  phaseBudgets: Record<string, string>;
};

type ProjectUnitForm = {
  key: string;
  identification: string;
  privateArea: string;
  commonArea: string;
  totalArea: string;
};

const emptyProjectForm: ProjectForm = {
  name: "",
  shortName: "",
  address: "",
  description: "",
  owner: "",
  investor: "",
  budget: "",
  budgetMode: "none",
  status: "Planejamento",
  isActive: true,
  startDate: new Date().toISOString().slice(0, 10),
  landValue: "",
  acquisitionDate: "",
  plannedCostPerSquareMeter: "",
  laborCostPerSquareMeter: "",
  constructionArea: "",
  taxRate: "4",
  unitCount: "1",
  units: [
    {
      key: "unit-1",
      identification: "Unidade 1",
      privateArea: "",
      commonArea: "",
      totalArea: "",
    },
  ],
  durationMonths: "",
  expectedDeliveryDate: "",
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
  const normalized = value
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();

  return Number(normalized);
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = parseCurrencyInput(value);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function formatOptionalNumber(value?: number) {
  return value && value > 0 ? String(value) : "";
}

function normalizeStatus(status: Project["status"] | string): ProjectStatus {
  if (status === "Em andamento") return "Obra";
  if (status === "Planejada") return "Planejamento";
  if (status === "Pausada") return "Planejamento";

  return projectStatuses.includes(status as ProjectStatus)
    ? (status as ProjectStatus)
    : "Planejamento";
}

function parsePhaseNames(phasesText: string) {
  const parsedPhases = phasesText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return parsedPhases.length
    ? parsedPhases
    : defaultPhases.split("\n").map((line) => line.trim());
}

function buildPhases(
  projectId: string,
  phasesText: string,
  phaseBudgets: Record<string, string>,
  budgetMode: BudgetMode,
): Phase[] {
  const phaseNames = parsePhaseNames(phasesText);

  return phaseNames.map((name, index) => {
    const rawBudget = budgetMode === "byPhase" ? phaseBudgets[name] ?? "" : "";
    const budget = parseCurrencyInput(rawBudget);

    return {
      id: `${projectId}-phase-${index + 1}`,
      name,
      budget: Number.isFinite(budget) && budget > 0 ? budget : 0,
    };
  });
}

function sumPhaseBudgets(phases: Phase[]) {
  return phases.reduce((total, phase) => total + phase.budget, 0);
}

function getBudgetMode(project: Project): BudgetMode {
  if (project.phases.some((phase) => phase.budget > 0)) {
    return "byPhase";
  }

  return project.budget > 0 ? "general" : "none";
}

function sumFormPhaseBudgets(phaseBudgets: Record<string, string>) {
  return Object.values(phaseBudgets).reduce((total, rawValue) => {
    const value = parseCurrencyInput(rawValue);

    return total + (Number.isFinite(value) && value > 0 ? value : 0);
  }, 0);
}

function createUnitRow(index: number): ProjectUnitForm {
  return {
    key: `unit-${Date.now()}-${index}`,
    identification: `Unidade ${index + 1}`,
    privateArea: "",
    commonArea: "",
    totalArea: "",
  };
}

function toUnitForm(unit: ProjectUnit, index: number): ProjectUnitForm {
  return {
    key: unit.id || `unit-${index + 1}`,
    identification: unit.identification,
    privateArea: formatOptionalNumber(unit.privateArea),
    commonArea: formatOptionalNumber(unit.commonArea),
    totalArea: formatOptionalNumber(unit.totalArea),
  };
}

function buildUnits(projectId: string, units: ProjectUnitForm[]): ProjectUnit[] {
  return units
    .filter((unit) => unit.identification.trim())
    .map((unit, index) => {
      const privateArea = parseOptionalNumber(unit.privateArea) ?? 0;
      const commonArea = parseOptionalNumber(unit.commonArea) ?? 0;
      const totalArea = parseOptionalNumber(unit.totalArea) ?? privateArea + commonArea;

      return {
        id: `${projectId}-unit-${index + 1}`,
        identification: unit.identification.trim(),
        privateArea,
        commonArea,
        totalArea,
      };
    });
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
  const formPhaseNames = useMemo(() => parsePhaseNames(form.phases), [form.phases]);
  const calculatedBudget = useMemo(() => {
    const cost = parseOptionalNumber(form.plannedCostPerSquareMeter) ?? 0;
    const area = parseOptionalNumber(form.constructionArea) ?? 0;

    return cost * area;
  }, [form.constructionArea, form.plannedCostPerSquareMeter]);
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

  function updateUnit(index: number, patch: Partial<ProjectUnitForm>) {
    setForm((current) => ({
      ...current,
      units: current.units.map((unit, unitIndex) =>
        unitIndex === index
          ? {
              ...unit,
              ...patch,
            }
          : unit,
      ),
    }));
  }

  function updateUnitCount(value: string) {
    const nextCount = Math.max(0, Math.min(30, Number(value) || 0));

    setForm((current) => {
      const units = [...current.units];

      while (units.length < nextCount) {
        units.push(createUnitRow(units.length));
      }

      return {
        ...current,
        unitCount: value,
        units: units.slice(0, nextCount),
      };
    });
  }

  function updateBudgetMode(budgetMode: BudgetMode) {
    setForm((current) => ({
      ...current,
      budget: budgetMode === "general" ? current.budget : "",
      budgetMode,
      phaseBudgets: budgetMode === "byPhase" ? current.phaseBudgets : {},
    }));
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
      description: project.description ?? "",
      owner: project.owner,
      investor: project.investor === "Nenhum" ? "" : project.investor,
      budget: project.budget ? String(project.budget) : "",
      budgetMode: getBudgetMode(project),
      status: normalizeStatus(project.status),
      isActive: project.isActive ?? true,
      startDate: project.startDate,
      landValue: formatOptionalNumber(project.landValue),
      acquisitionDate: project.acquisitionDate ?? "",
      plannedCostPerSquareMeter: formatOptionalNumber(project.plannedCostPerSquareMeter),
      laborCostPerSquareMeter: formatOptionalNumber(project.laborCostPerSquareMeter),
      constructionArea: formatOptionalNumber(project.constructionArea),
      taxRate: formatOptionalNumber(project.taxRate) || "4",
      unitCount: String(project.unitCount ?? project.units?.length ?? 1),
      units: project.units?.length
        ? project.units.map(toUnitForm)
        : [createUnitRow(0)],
      durationMonths: formatOptionalNumber(project.durationMonths),
      expectedDeliveryDate: project.expectedDeliveryDate ?? "",
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
      setFormError("O limite atual de testes é de 10 empreendimentos simultâneos.");
      return;
    }

    const name = form.name.trim();
    const explicitBudget = parseCurrencyInput(form.budget);
    const projectedBudget = calculatedBudget > 0 ? calculatedBudget : 0;

    if (!name || !form.shortName.trim() || !form.address.trim()) {
      setFormError("Informe nome, apelido e endereço do empreendimento.");
      return;
    }

    if (
      form.budgetMode === "general" &&
      (!form.budget.trim() || !Number.isFinite(explicitBudget) || explicitBudget < 0)
    ) {
      setFormError("Informe um orçamento geral válido ou escolha outro modo de controle.");
      return;
    }

    const investor = form.investor.trim() || "Nenhum";
    const projectDetails = {
      description: form.description.trim() || undefined,
      isActive: form.isActive,
      landValue: parseOptionalNumber(form.landValue),
      acquisitionDate: form.acquisitionDate || undefined,
      plannedCostPerSquareMeter: parseOptionalNumber(form.plannedCostPerSquareMeter),
      laborCostPerSquareMeter: parseOptionalNumber(form.laborCostPerSquareMeter),
      constructionArea: parseOptionalNumber(form.constructionArea),
      taxRate: parseOptionalNumber(form.taxRate),
      unitCount: Number(form.unitCount) || 0,
      durationMonths: parseOptionalNumber(form.durationMonths),
      expectedDeliveryDate: form.expectedDeliveryDate || undefined,
    };

    if (editingProjectId) {
      const currentProject = projects.find((project) => project.id === editingProjectId);
      const updatedPhases =
        currentProject?.phases.map((phase) => {
          const phaseBudget = parseCurrencyInput(form.phaseBudgets[phase.id] ?? "");

          return {
            ...phase,
            budget:
              form.budgetMode === "byPhase" && Number.isFinite(phaseBudget) && phaseBudget > 0
                ? phaseBudget
                : 0,
          };
        }) ?? [];
      const fallbackBudget = sumPhaseBudgets(updatedPhases);

      updateProject(editingProjectId, {
        name,
        shortName: form.shortName.trim(),
        address: form.address.trim(),
        owner: form.owner.trim() || "Responsável não informado",
        investor,
        budget:
          form.budgetMode === "general"
            ? explicitBudget
            : form.budgetMode === "byPhase"
              ? fallbackBudget
              : projectedBudget,
        phases: updatedPhases,
        units: buildUnits(editingProjectId, form.units),
        ...projectDetails,
        status: form.status,
        startDate: form.startDate || new Date().toISOString().slice(0, 10),
      });
      resetCreateForm();
      return;
    }

    const baseId = slugify(name) || "empreendimento";
    const projectId = `project-${baseId}-${Date.now()}`;
    const phases = buildPhases(projectId, form.phases, form.phaseBudgets, form.budgetMode);
    const fallbackBudget = sumPhaseBudgets(phases);
    const project: Project = {
      id: projectId,
      name,
      shortName: form.shortName.trim(),
      address: form.address.trim(),
      owner: form.owner.trim() || "Responsável não informado",
      investor,
      budget:
        form.budgetMode === "general"
          ? explicitBudget
          : form.budgetMode === "byPhase"
            ? fallbackBudget
            : projectedBudget,
      spent: 0,
      status: form.status,
      ...projectDetails,
      startDate: form.startDate || new Date().toISOString().slice(0, 10),
      units: buildUnits(projectId, form.units),
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
      <div className="blueprint-panel overflow-hidden rounded-lg p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="blueprint-kicker">Selecionar empreendimento</span>
            <h1 className="mt-3 text-3xl font-semibold text-blueprint-ink">
              Escolha qual empreendimento quer abrir
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blueprint-muted">
              Cada empreendimento funciona como um ambiente próprio: despesas, fases, unidades, fornecedores usados e dossiê mensal ficam focados nele.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <Badge tone={projectLimitReached ? "amber" : "gray"}>
              {projects.length}/10 empreendimentos
            </Badge>
            <Button
              type="button"
              onClick={startCreateProject}
              disabled={projectLimitReached}
              className="justify-start"
            >
              <Plus className="h-4 w-4" />
              Novo empreendimento
            </Button>
          </div>
        </div>
      </div>

      {isCreating ? (
        <form onSubmit={submitProject} className="blueprint-panel rounded-lg p-5 shadow-lift">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-blueprint-ink">
                {editingProjectId ? "Editar empreendimento" : "Criar empreendimento do zero"}
              </h2>
              <p className="mt-1 text-sm text-blueprint-muted">
                {editingProjectId
                  ? "Atualize os dados administrativos sem alterar os lançamentos existentes."
                  : "Cadastre os dados principais, custos, unidades e fases iniciais do empreendimento."}
              </p>
            </div>
            <Button type="button" variant="ghost" className="h-9 px-2" onClick={resetCreateForm}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <FieldLabel label="Nome do empreendimento">
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

          <div className="mt-3 grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr]">
            <FieldLabel label="Endereço">
              <Input value={form.address} onChange={(event) => updateForm({ address: event.target.value })} placeholder="Rua, bairro, cidade" />
            </FieldLabel>
            <FieldLabel label="Responsável">
              <Input value={form.owner} onChange={(event) => updateForm({ owner: event.target.value })} placeholder="Dona do empreendimento" />
            </FieldLabel>
            <FieldLabel label="Investidor">
              <Input value={form.investor} onChange={(event) => updateForm({ investor: event.target.value })} placeholder="Nome, grupo ou deixe em branco para Nenhum" />
            </FieldLabel>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]">
            <FieldLabel label="Descrição">
              <textarea
                value={form.description}
                onChange={(event) => updateForm({ description: event.target.value })}
                placeholder="Resumo do empreendimento, padrão das unidades, observações comerciais ou contexto importante."
                className="min-h-24 rounded-md border border-blueprint-line bg-white/95 px-3 py-2 text-sm text-blueprint-ink shadow-[inset_0_1px_0_rgba(6,28,61,0.03)] outline-none transition placeholder:text-slate-400 hover:border-[#b7cada] focus:border-blueprint-accent focus:ring-4 focus:ring-[#dceeff]"
              />
            </FieldLabel>
            <label className="flex min-w-[190px] items-center gap-3 rounded-lg border border-blueprint-line bg-white/80 px-4 py-3 text-sm font-medium text-blueprint-ink">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => updateForm({ isActive: event.target.checked })}
              />
              Empreendimento ativo
            </label>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            <section className="rounded-lg border border-blueprint-line bg-white/80 p-4">
              <h3 className="text-sm font-semibold text-blueprint-ink">Terreno</h3>
              <div className="mt-4 grid gap-3">
                <FieldLabel label="Valor do terreno">
                  <Input
                    inputMode="decimal"
                    type="text"
                    value={form.landValue}
                    onChange={(event) => updateForm({ landValue: event.target.value })}
                    placeholder="Ex: 150000"
                  />
                </FieldLabel>
                <FieldLabel label="Data da aquisição">
                  <Input
                    type="date"
                    value={form.acquisitionDate}
                    onChange={(event) => updateForm({ acquisitionDate: event.target.value })}
                  />
                </FieldLabel>
              </div>
            </section>

            <section className="rounded-lg border border-blueprint-line bg-white/80 p-4 xl:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-blueprint-ink">Custos e metragens</h3>
                  <p className="mt-1 text-xs text-blueprint-muted">
                    O orçamento calculado usa custo previsto por m² x metragem a construir.
                  </p>
                </div>
                <Badge tone={calculatedBudget > 0 ? "green" : "gray"}>
                  Calculado {formatCurrency(calculatedBudget)}
                </Badge>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <FieldLabel label="Custo previsto por m²">
                  <Input
                    inputMode="decimal"
                    type="text"
                    value={form.plannedCostPerSquareMeter}
                    onChange={(event) => updateForm({ plannedCostPerSquareMeter: event.target.value })}
                    placeholder="Ex: 2800"
                  />
                </FieldLabel>
                <FieldLabel label="Mão de obra por m²">
                  <Input
                    inputMode="decimal"
                    type="text"
                    value={form.laborCostPerSquareMeter}
                    onChange={(event) => updateForm({ laborCostPerSquareMeter: event.target.value })}
                    placeholder="Ex: 750"
                  />
                </FieldLabel>
                <FieldLabel label="Metragem a construir">
                  <Input
                    inputMode="decimal"
                    type="text"
                    value={form.constructionArea}
                    onChange={(event) => updateForm({ constructionArea: event.target.value })}
                    placeholder="m²"
                  />
                </FieldLabel>
                <FieldLabel label="Alíquota (%)">
                  <Select
                    value={form.taxRate}
                    onChange={(event) => updateForm({ taxRate: event.target.value })}
                  >
                    <option value="4">4%</option>
                    <option value="6">6%</option>
                  </Select>
                </FieldLabel>
              </div>
            </section>
          </div>

          <section className="mt-5 rounded-lg border border-blueprint-line bg-white/80 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-blueprint-ink">Unidades de venda</h3>
                <p className="mt-1 text-xs text-blueprint-muted">
                  Use para empreendimentos com apartamentos, casas ou sobrados vendidos separadamente.
                </p>
              </div>
              <FieldLabel label="Número de unidades">
                <Input
                  className="w-36"
                  min="0"
                  max="30"
                  type="number"
                  value={form.unitCount}
                  onChange={(event) => updateUnitCount(event.target.value)}
                />
              </FieldLabel>
            </div>
            {form.units.length ? (
              <div className="mt-4 grid gap-3">
                {form.units.map((unit, index) => (
                  <div
                    key={unit.key}
                    className="grid gap-3 rounded-md border border-blueprint-line bg-blueprint-surface/70 p-3 md:grid-cols-[1fr_150px_150px_150px]"
                  >
                    <FieldLabel label="Identificação">
                      <Input
                        value={unit.identification}
                        onChange={(event) => updateUnit(index, { identification: event.target.value })}
                        placeholder={`Unidade ${index + 1}`}
                      />
                    </FieldLabel>
                    <FieldLabel label="Área privativa">
                      <Input
                        inputMode="decimal"
                        type="text"
                        value={unit.privateArea}
                        onChange={(event) => updateUnit(index, { privateArea: event.target.value })}
                        placeholder="m²"
                      />
                    </FieldLabel>
                    <FieldLabel label="Área comum">
                      <Input
                        inputMode="decimal"
                        type="text"
                        value={unit.commonArea}
                        onChange={(event) => updateUnit(index, { commonArea: event.target.value })}
                        placeholder="m²"
                      />
                    </FieldLabel>
                    <FieldLabel label="Área total">
                      <Input
                        inputMode="decimal"
                        type="text"
                        value={unit.totalArea}
                        onChange={(event) => updateUnit(index, { totalArea: event.target.value })}
                        placeholder="m²"
                      />
                    </FieldLabel>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-md border border-blueprint-line bg-blueprint-surface px-3 py-2 text-sm text-blueprint-muted">
                Sem unidades cadastradas para este empreendimento.
              </p>
            )}
          </section>

          <section className="mt-5 rounded-lg border border-blueprint-line bg-white/80 p-4">
            <h3 className="text-sm font-semibold text-blueprint-ink">Prazo e cronograma</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <FieldLabel label="Data início da obra">
                <Input type="date" value={form.startDate} onChange={(event) => updateForm({ startDate: event.target.value })} />
              </FieldLabel>
              <FieldLabel label="Prazo da obra (meses)">
                <Input
                  inputMode="numeric"
                  type="text"
                  value={form.durationMonths}
                  onChange={(event) => updateForm({ durationMonths: event.target.value })}
                  placeholder="Ex: 12"
                />
              </FieldLabel>
              <FieldLabel label="Previsão de entrega">
                <Input
                  type="date"
                  value={form.expectedDeliveryDate}
                  onChange={(event) => updateForm({ expectedDeliveryDate: event.target.value })}
                />
              </FieldLabel>
            </div>
          </section>

          <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-lg border border-blueprint-line bg-blueprint-surface/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-blueprint-ink">Fases do empreendimento</h3>
                  <p className="mt-1 text-sm text-blueprint-muted">
                    Comece com as etapas principais. Cada linha vira uma fase para lançar despesas.
                  </p>
                </div>
              </div>

              {!editingProjectId ? (
                <textarea
                  value={form.phases}
                  onChange={(event) => updateForm({ phases: event.target.value })}
                  placeholder={"Fundação\nAlvenaria\nAcabamento"}
                  className="mt-4 min-h-36 w-full rounded-md border border-blueprint-line bg-white px-3 py-2 text-sm text-blueprint-ink outline-none transition placeholder:text-slate-400 focus:border-blueprint-accent focus:ring-4 focus:ring-[#dceeff]"
                />
              ) : (
                <div className="mt-4 grid gap-2">
                  {projects
                    .find((project) => project.id === editingProjectId)
                    ?.phases.map((phase) => (
                      <div
                        key={phase.id}
                        className="rounded-md border border-blueprint-line bg-white px-3 py-2 text-sm font-medium text-blueprint-ink"
                      >
                        {phase.name}
                      </div>
                    ))}
                </div>
              )}
            </section>

            <section className="rounded-lg border border-blueprint-line bg-white p-4">
              <h3 className="text-sm font-semibold text-blueprint-ink">Controle de orçamento</h3>
              <p className="mt-1 text-sm text-blueprint-muted">
                Escolha o nível de detalhe que a cliente tem hoje. Dá para mudar depois.
              </p>

              <div className="mt-4 grid gap-2">
                {budgetModes.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => updateBudgetMode(mode.value)}
                    className={cn(
                      "rounded-lg border px-4 py-3 text-left transition",
                      form.budgetMode === mode.value
                        ? "border-blueprint-accent bg-[#eef7ff] ring-2 ring-[#dceeff]"
                        : "border-blueprint-line bg-white hover:border-blueprint-accent",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-full border",
                          form.budgetMode === mode.value
                            ? "border-blueprint-accent bg-blueprint-accent"
                            : "border-slate-300 bg-white",
                        )}
                      >
                        {form.budgetMode === mode.value ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        ) : null}
                      </span>
                      <span className="text-sm font-semibold text-blueprint-ink">{mode.label}</span>
                    </span>
                    <span className="mt-1 block pl-7 text-sm text-blueprint-muted">
                      {mode.description}
                    </span>
                  </button>
                ))}
              </div>

              {form.budgetMode === "general" ? (
                <div className="mt-4 rounded-md border border-blueprint-line bg-blueprint-surface px-3 py-3">
                  <FieldLabel label="Valor total previsto">
                    <Input
                      inputMode="decimal"
                      type="text"
                      value={form.budget}
                      onChange={(event) => updateForm({ budget: event.target.value })}
                      placeholder="Ex: 250000"
                    />
                  </FieldLabel>
                </div>
              ) : null}

              {form.budgetMode === "byPhase" ? (
                <div className="mt-4 rounded-md border border-blueprint-line bg-blueprint-surface p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-blueprint-ink">
                        Distribuição por fase
                      </p>
                      <p className="mt-1 text-xs text-blueprint-muted">
                        Preencha apenas as fases que já têm previsão. Campos em branco ficam sem
                        orçamento.
                      </p>
                    </div>
                    <Badge tone="gray">
                      Total {formatCurrency(sumFormPhaseBudgets(form.phaseBudgets))}
                    </Badge>
                  </div>

                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {editingProjectId
                      ? projects
                          .find((project) => project.id === editingProjectId)
                          ?.phases.map((phase) => (
                            <FieldLabel key={phase.id} label={phase.name}>
                              <Input
                                inputMode="decimal"
                                type="text"
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
                          ))
                      : formPhaseNames.map((phaseName) => (
                          <FieldLabel key={phaseName} label={phaseName}>
                            <Input
                              inputMode="decimal"
                              type="text"
                              value={form.phaseBudgets[phaseName] ?? ""}
                              onChange={(event) =>
                                updateForm({
                                  phaseBudgets: {
                                    ...form.phaseBudgets,
                                    [phaseName]: event.target.value,
                                  },
                                })
                              }
                              placeholder="Sem orçamento"
                            />
                          </FieldLabel>
                        ))}
                  </div>
                </div>
              ) : null}
            </section>
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
              {editingProjectId ? "Salvar alterações" : "Criar e abrir empreendimento"}
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
                "group rounded-lg border bg-white/90 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lift",
                isActive
                  ? "border-blueprint-accent ring-4 ring-[#dceeff]"
                  : "border-blueprint-line hover:border-blueprint-accent",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blueprint-ink text-lg font-semibold text-white shadow-sm transition group-hover:bg-blueprint-accent">
                  {project.shortName.slice(0, 2).toUpperCase()}
                </div>
                {isActive ? (
                  <Badge tone="green">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    aberto
                  </Badge>
                ) : project.isActive === false ? (
                  <Badge tone="amber">inativo</Badge>
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
                <div>
                  <dt className="text-blueprint-muted">Unidades</dt>
                  <dd className="mt-1 font-medium text-blueprint-ink">{project.unitCount ?? project.units?.length ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-blueprint-muted">Entrega</dt>
                  <dd className="mt-1 font-medium text-blueprint-ink">{project.expectedDeliveryDate ?? "Não definida"}</dd>
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
                  {isActive ? "Empreendimento selecionado" : "Abrir empreendimento"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => startEditProject(project)}
                  title="Editar empreendimento"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-700 hover:bg-red-50 hover:text-red-800"
                  disabled={!canDelete}
                  onClick={() => openDelete(project)}
                  title={canDelete ? "Excluir empreendimento" : "Não é possível excluir o último empreendimento"}
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
        Ir para dashboard do empreendimento aberto
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
                  Esta ação remove o empreendimento e todos os lançamentos ligados a ele deste protótipo local. Para confirmar, digite o nome exato.
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
              <FieldLabel label="Digite o nome do empreendimento">
                <Input value={deleteName} onChange={(event) => setDeleteName(event.target.value)} />
              </FieldLabel>
              <label className="flex items-start gap-2 rounded-md border border-blueprint-line bg-blueprint-surface px-3 py-2 text-sm text-blueprint-ink">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={deleteAcknowledged}
                  onChange={(event) => setDeleteAcknowledged(event.target.checked)}
                />
                Entendo que as despesas deste empreendimento serão removidas do ambiente local de testes.
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
