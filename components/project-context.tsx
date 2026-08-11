"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/components/auth-context";
import {
  AgendaEntry,
  CatalogItem,
  Expense,
  Project,
  ProjectUnit,
  Supplier,
  agendaEntries as initialAgendaEntries,
  catalogItems as initialCatalogItems,
  expenses as initialExpenses,
  projects as initialProjects,
  suppliers as initialSuppliers,
} from "@/lib/mock-data";
import { assertSupabaseConfigured, isSupabaseConfigured } from "@/lib/supabase/client";

type ProjectContextValue = {
  activeProject: Project;
  activeProjectId: string;
  agendaEntries: AgendaEntry[];
  catalogItems: CatalogItem[];
  expenses: Expense[];
  isCloudMode: boolean;
  isSyncing: boolean;
  projects: Project[];
  projectExpenses: Expense[];
  suppliers: Supplier[];
  addAgendaEntry: (entry: AgendaEntry) => Promise<string>;
  deleteAgendaEntry: (entryId: string) => Promise<void>;
  addProject: (project: Project) => Promise<string>;
  updateProject: (projectId: string, patch: Partial<Project>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  addExpense: (expense: Expense) => Promise<string>;
  updateExpense: (expenseId: string, patch: Partial<Expense>) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  addCatalogItem: (item: CatalogItem) => Promise<string>;
  updateCatalogItem: (itemId: string, patch: Partial<CatalogItem>) => Promise<void>;
  deleteCatalogItem: (itemId: string) => Promise<void>;
  addSupplier: (supplier: Supplier) => Promise<string>;
  updateSupplier: (supplierId: string, patch: Partial<Supplier>) => Promise<void>;
  refreshCloudData: () => Promise<void>;
  setActiveProjectId: (projectId: string) => void;
};

type PhaseRow = {
  id: string;
  name: string;
  budget: number | null;
  sort_order?: number | null;
};

type UnitRow = {
  id: string;
  identification: string;
  description: string | null;
  sale_value: number | null;
  private_area: number | null;
  common_area: number | null;
  total_area: number | null;
};

type ProjectRow = {
  id: string;
  name: string;
  short_name: string;
  address: string;
  description: string | null;
  owner: string;
  investor: string;
  budget: number | null;
  status: Project["status"];
  is_active: boolean;
  start_date: string;
  land_value: number | null;
  acquisition_date: string | null;
  planned_cost_per_square_meter: number | null;
  labor_cost_per_square_meter: number | null;
  construction_area: number | null;
  tax_rate: number | null;
  duration_months: number | null;
  expected_delivery_date: string | null;
  phases?: PhaseRow[];
  project_units?: UnitRow[];
};

type SupplierRow = {
  id: string;
  name: string;
  document: string;
  category: Supplier["category"];
  contact: string;
  bank_info: string | null;
};

type CatalogItemRow = {
  id: string;
  name: string;
  type: CatalogItem["type"];
  unit: string;
  reference_price: number;
};

type ExpenseRow = {
  id: string;
  project_id: string;
  phase_id: string;
  supplier_id: string | null;
  catalog_item_id: string | null;
  description: string;
  type: Expense["type"];
  quantity: number;
  unit_value: number;
  total: number;
  purchase_date: string;
  invoice_payment_date: string | null;
  store_payment_date: string | null;
  invoice_number: string | null;
  payment_method: Expense["paymentMethod"];
  status: Expense["status"];
  sent_to_accountant: boolean;
  has_attachment: boolean;
};

type AgendaEntryRow = {
  id: string;
  project_id: string | null;
  phase_id: string | null;
  date: string;
  type: AgendaEntry["type"];
  title: string;
  description: string | null;
  created_at: string;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

function toNumber(value: number | null | undefined) {
  return typeof value === "number" ? value : 0;
}

function mapProject(row: ProjectRow, expenses: Expense[] = []): Project {
  const spent = expenses
    .filter((expense) => expense.projectId === row.id)
    .reduce((total, expense) => total + expense.total, 0);

  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    address: row.address,
    description: row.description ?? undefined,
    owner: row.owner,
    investor: row.investor,
    budget: toNumber(row.budget),
    spent,
    status: row.status,
    isActive: row.is_active,
    startDate: row.start_date,
    landValue: row.land_value ?? undefined,
    acquisitionDate: row.acquisition_date ?? undefined,
    plannedCostPerSquareMeter: row.planned_cost_per_square_meter ?? undefined,
    laborCostPerSquareMeter: row.labor_cost_per_square_meter ?? undefined,
    constructionArea: row.construction_area ?? undefined,
    taxRate: row.tax_rate ?? undefined,
    unitCount: row.project_units?.length ?? 0,
    units: (row.project_units ?? []).map<ProjectUnit>((unit) => ({
      id: unit.id,
      identification: unit.identification,
      description: unit.description ?? undefined,
      saleValue: unit.sale_value ?? undefined,
      privateArea: toNumber(unit.private_area),
      commonArea: toNumber(unit.common_area),
      totalArea: toNumber(unit.total_area),
    })),
    durationMonths: row.duration_months ?? undefined,
    expectedDeliveryDate: row.expected_delivery_date ?? undefined,
    phases: (row.phases ?? [])
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((phase) => ({
        id: phase.id,
        name: phase.name,
        budget: toNumber(phase.budget),
      })),
  };
}

function mapSupplier(row: SupplierRow): Supplier {
  return {
    id: row.id,
    name: row.name,
    document: row.document,
    category: row.category,
    contact: row.contact,
    bankInfo: row.bank_info ?? undefined,
  };
}

function mapCatalogItem(row: CatalogItemRow): CatalogItem {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    unit: row.unit,
    referencePrice: row.reference_price,
  };
}

function mapExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    projectId: row.project_id,
    phaseId: row.phase_id,
    date: row.purchase_date,
    purchaseDate: row.purchase_date,
    invoicePaymentDate: row.invoice_payment_date ?? undefined,
    storePaymentDate: row.store_payment_date ?? undefined,
    invoiceNumber: row.invoice_number ?? undefined,
    supplierId: row.supplier_id ?? "supplier-missing",
    catalogItemId: row.catalog_item_id ?? "item-manual",
    description: row.description,
    type: row.type,
    quantity: row.quantity,
    unitValue: row.unit_value,
    total: row.total,
    paymentMethod: row.payment_method,
    status: row.status,
    sentToAccountant: row.sent_to_accountant,
    hasAttachment: row.has_attachment,
  };
}

function mapAgendaEntry(row: AgendaEntryRow): AgendaEntry {
  return {
    id: row.id,
    projectId: row.project_id ?? "",
    phaseId: row.phase_id ?? undefined,
    date: row.date,
    type: row.type,
    title: row.title,
    description: row.description ?? undefined,
    createdAt: row.created_at,
  };
}

function projectPatchToRow(patch: Partial<Project>) {
  return {
    name: patch.name,
    short_name: patch.shortName,
    address: patch.address,
    description: patch.description ?? null,
    owner: patch.owner,
    investor: patch.investor,
    budget: patch.budget,
    status: patch.status,
    is_active: patch.isActive,
    start_date: patch.startDate,
    land_value: patch.landValue ?? null,
    acquisition_date: patch.acquisitionDate ?? null,
    planned_cost_per_square_meter: patch.plannedCostPerSquareMeter ?? null,
    labor_cost_per_square_meter: patch.laborCostPerSquareMeter ?? null,
    construction_area: patch.constructionArea ?? null,
    tax_rate: patch.taxRate ?? null,
    duration_months: patch.durationMonths ?? null,
    expected_delivery_date: patch.expectedDeliveryDate ?? null,
  };
}

function cleanPatch<T extends Record<string, unknown>>(patch: T) {
  return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
}

function nullablePatch<T extends object, K extends keyof T>(patch: T, key: K) {
  return key in patch ? patch[key] ?? null : undefined;
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { activeOrganizationId, session } = useAuth();
  const isCloudMode = Boolean(isSupabaseConfigured && session && activeOrganizationId);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [activeProjectId, setActiveProjectIdState] = useState(initialProjects[0].id);
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [agendaEntries, setAgendaEntries] = useState<AgendaEntry[]>(initialAgendaEntries);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>(initialCatalogItems);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [isSyncing, setIsSyncing] = useState(false);

  async function refreshCloudData() {
    if (!activeOrganizationId || !session) {
      return;
    }

    setIsSyncing(true);
    try {
      const supabase = assertSupabaseConfigured();
      const [
        projectsResult,
        suppliersResult,
        catalogResult,
        expensesResult,
        agendaResult,
      ] = await Promise.all([
        supabase
          .from("projects")
          .select("*,phases(*),project_units(*)")
          .eq("organization_id", activeOrganizationId)
          .order("created_at", { ascending: false }),
        supabase
          .from("suppliers")
          .select("*")
          .eq("organization_id", activeOrganizationId)
          .order("name", { ascending: true }),
        supabase
          .from("catalog_items")
          .select("*")
          .eq("organization_id", activeOrganizationId)
          .eq("is_archived", false)
          .order("name", { ascending: true }),
        supabase
          .from("expenses")
          .select("*")
          .eq("organization_id", activeOrganizationId)
          .order("purchase_date", { ascending: false }),
        supabase
          .from("agenda_entries")
          .select("*")
          .eq("organization_id", activeOrganizationId)
          .order("date", { ascending: true }),
      ]);

      const error =
        projectsResult.error ??
        suppliersResult.error ??
        catalogResult.error ??
        expensesResult.error ??
        agendaResult.error;

      if (error) {
        throw error;
      }

      const nextExpenses = ((expensesResult.data ?? []) as ExpenseRow[]).map(mapExpense);
      const nextProjects = ((projectsResult.data ?? []) as ProjectRow[]).map((project) =>
        mapProject(project, nextExpenses),
      );

      setExpenses(nextExpenses);
      setProjects(nextProjects);
      setSuppliers(((suppliersResult.data ?? []) as SupplierRow[]).map(mapSupplier));
      setCatalogItems(((catalogResult.data ?? []) as CatalogItemRow[]).map(mapCatalogItem));
      setAgendaEntries(((agendaResult.data ?? []) as AgendaEntryRow[]).map(mapAgendaEntry));
      setActiveProjectIdState((current) =>
        nextProjects.some((project) => project.id === current)
          ? current
          : nextProjects[0]?.id ?? "",
      );
    } finally {
      setIsSyncing(false);
    }
  }

  useEffect(() => {
    if (isCloudMode) {
      setIsSyncing(true);
      setProjects([]);
      setExpenses([]);
      setAgendaEntries([]);
      setCatalogItems([]);
      setSuppliers([]);
      setActiveProjectIdState("");
      void refreshCloudData();
      return;
    }

    const savedProject = window.localStorage.getItem("blueprint.activeProjectId");
    const savedProjects = window.localStorage.getItem("blueprint.projects");
    const savedExpenses = window.localStorage.getItem("blueprint.expenses");
    const savedAgendaEntries = window.localStorage.getItem("blueprint.agendaEntries");
    const savedCatalogItems = window.localStorage.getItem("blueprint.catalogItems");
    const savedSuppliers = window.localStorage.getItem("blueprint.suppliers");
    let hydratedProjects = initialProjects;

    if (savedProjects) {
      try {
        hydratedProjects = JSON.parse(savedProjects) as Project[];
        setProjects(hydratedProjects.length ? hydratedProjects : initialProjects);
      } catch {
        hydratedProjects = initialProjects;
        setProjects(initialProjects);
      }
    }

    if (savedProject && hydratedProjects.some((project) => project.id === savedProject)) {
      setActiveProjectIdState(savedProject);
    }

    if (savedExpenses) {
      try {
        setExpenses(JSON.parse(savedExpenses) as Expense[]);
      } catch {
        setExpenses(initialExpenses);
      }
    }

    if (savedAgendaEntries) {
      try {
        setAgendaEntries(JSON.parse(savedAgendaEntries) as AgendaEntry[]);
      } catch {
        setAgendaEntries(initialAgendaEntries);
      }
    }

    if (savedCatalogItems) {
      try {
        setCatalogItems(JSON.parse(savedCatalogItems) as CatalogItem[]);
      } catch {
        setCatalogItems(initialCatalogItems);
      }
    }

    if (savedSuppliers) {
      try {
        setSuppliers(JSON.parse(savedSuppliers) as Supplier[]);
      } catch {
        setSuppliers(initialSuppliers);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrganizationId, isCloudMode, session?.access_token]);

  useEffect(() => {
    if (isCloudMode) return;
    window.localStorage.setItem("blueprint.activeProjectId", activeProjectId);
  }, [activeProjectId, isCloudMode]);

  useEffect(() => {
    if (isCloudMode) return;
    window.localStorage.setItem("blueprint.projects", JSON.stringify(projects));
  }, [isCloudMode, projects]);

  useEffect(() => {
    if (isCloudMode) return;
    window.localStorage.setItem("blueprint.expenses", JSON.stringify(expenses));
  }, [expenses, isCloudMode]);

  useEffect(() => {
    if (isCloudMode) return;
    window.localStorage.setItem("blueprint.agendaEntries", JSON.stringify(agendaEntries));
  }, [agendaEntries, isCloudMode]);

  useEffect(() => {
    if (isCloudMode) return;
    window.localStorage.setItem("blueprint.catalogItems", JSON.stringify(catalogItems));
  }, [catalogItems, isCloudMode]);

  useEffect(() => {
    if (isCloudMode) return;
    window.localStorage.setItem("blueprint.suppliers", JSON.stringify(suppliers));
  }, [isCloudMode, suppliers]);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? projects[0] ?? initialProjects[0],
    [activeProjectId, projects],
  );

  const projectExpenses = useMemo(
    () => expenses.filter((expense) => expense.projectId === activeProject.id),
    [activeProject.id, expenses],
  );

  function setActiveProjectId(projectId: string) {
    if (projects.some((project) => project.id === projectId)) {
      setActiveProjectIdState(projectId);
    }
  }

  async function addProject(project: Project) {
    if (!isCloudMode || !activeOrganizationId) {
      setProjects((currentProjects) => [project, ...currentProjects].slice(0, 10));
      setActiveProjectIdState(project.id);
      return project.id;
    }

    const supabase = assertSupabaseConfigured();
    const { data: createdProject, error: projectError } = await supabase
      .from("projects")
      .insert({
        organization_id: activeOrganizationId,
        name: project.name,
        short_name: project.shortName,
        address: project.address,
        description: project.description ?? null,
        owner: project.owner,
        investor: project.investor,
        budget: project.budget || null,
        status: project.status,
        is_active: project.isActive ?? true,
        start_date: project.startDate,
        land_value: project.landValue ?? null,
        acquisition_date: project.acquisitionDate ?? null,
        planned_cost_per_square_meter: project.plannedCostPerSquareMeter ?? null,
        labor_cost_per_square_meter: project.laborCostPerSquareMeter ?? null,
        construction_area: project.constructionArea ?? null,
        tax_rate: project.taxRate ?? null,
        duration_months: project.durationMonths ?? null,
        expected_delivery_date: project.expectedDeliveryDate ?? null,
      })
      .select("id")
      .single();

    if (projectError) throw projectError;

    if (project.phases.length) {
      const { error: phaseError } = await supabase.from("phases").insert(
        project.phases.map((phase, index) => ({
          organization_id: activeOrganizationId,
          project_id: createdProject.id,
          name: phase.name,
          budget: phase.budget || null,
          sort_order: index,
        })),
      );
      if (phaseError) throw phaseError;
    }

    if (project.units?.length) {
      const { error: unitsError } = await supabase.from("project_units").insert(
        project.units.map((unit) => ({
          organization_id: activeOrganizationId,
          project_id: createdProject.id,
          identification: unit.identification,
          description: unit.description ?? null,
          sale_value: unit.saleValue ?? null,
          private_area: unit.privateArea,
          common_area: unit.commonArea,
          total_area: unit.totalArea,
        })),
      );
      if (unitsError) throw unitsError;
    }

    await refreshCloudData();
    setActiveProjectIdState(createdProject.id);
    return createdProject.id;
  }

  async function updateProject(projectId: string, patch: Partial<Project>) {
    if (!isCloudMode || !activeOrganizationId) {
      setProjects((currentProjects) =>
        currentProjects.map((project) => (project.id === projectId ? { ...project, ...patch } : project)),
      );
      return;
    }

    const supabase = assertSupabaseConfigured();
    const { error: projectError } = await supabase
      .from("projects")
      .update(cleanPatch(projectPatchToRow(patch)))
      .eq("id", projectId)
      .eq("organization_id", activeOrganizationId);
    if (projectError) throw projectError;

    if (patch.phases) {
      const phaseResults = await Promise.all(
        patch.phases.map((phase, index) =>
          supabase
            .from("phases")
            .update({ name: phase.name, budget: phase.budget || null, sort_order: index })
            .eq("id", phase.id)
            .eq("organization_id", activeOrganizationId),
        ),
      );

      const phaseError = phaseResults.find((result) => result.error)?.error;
      if (phaseError) throw phaseError;
    }

    if (patch.units) {
      const { error: deleteUnitsError } = await supabase
        .from("project_units")
        .delete()
        .eq("project_id", projectId)
        .eq("organization_id", activeOrganizationId);
      if (deleteUnitsError) throw deleteUnitsError;

      if (patch.units.length) {
        const { error: insertUnitsError } = await supabase.from("project_units").insert(
          patch.units.map((unit) => ({
            organization_id: activeOrganizationId,
            project_id: projectId,
            identification: unit.identification,
            description: unit.description ?? null,
            sale_value: unit.saleValue ?? null,
            private_area: unit.privateArea,
            common_area: unit.commonArea,
            total_area: unit.totalArea,
          })),
        );
        if (insertUnitsError) throw insertUnitsError;
      }
    }

    await refreshCloudData();
  }

  async function deleteProject(projectId: string) {
    if (!isCloudMode || !activeOrganizationId) {
      setProjects((currentProjects) => currentProjects.filter((project) => project.id !== projectId));
      setExpenses((currentExpenses) => currentExpenses.filter((expense) => expense.projectId !== projectId));
      return;
    }

    const supabase = assertSupabaseConfigured();
    const { error: expensesError } = await supabase
      .from("expenses")
      .delete()
      .eq("project_id", projectId)
      .eq("organization_id", activeOrganizationId);
    if (expensesError) throw expensesError;

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId)
      .eq("organization_id", activeOrganizationId);
    if (error) throw error;
    await refreshCloudData();
  }

  async function addSupplier(supplier: Supplier) {
    if (!isCloudMode || !activeOrganizationId) {
      setSuppliers((currentSuppliers) => [supplier, ...currentSuppliers]);
      return supplier.id;
    }

    const supabase = assertSupabaseConfigured();
    const { data, error } = await supabase
      .from("suppliers")
      .insert({
        organization_id: activeOrganizationId,
        name: supplier.name,
        document: supplier.document,
        category: supplier.category,
        contact: supplier.contact,
        bank_info: supplier.bankInfo ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;
    await refreshCloudData();
    return data.id;
  }

  async function updateSupplier(supplierId: string, patch: Partial<Supplier>) {
    if (!isCloudMode || !activeOrganizationId) {
      setSuppliers((currentSuppliers) =>
        currentSuppliers.map((supplier) => (supplier.id === supplierId ? { ...supplier, ...patch } : supplier)),
      );
      return;
    }

    const supabase = assertSupabaseConfigured();
    const { error } = await supabase
      .from("suppliers")
      .update(
        cleanPatch({
          name: patch.name,
          document: patch.document,
          category: patch.category,
          contact: patch.contact,
          bank_info: nullablePatch(patch, "bankInfo"),
        }),
      )
      .eq("id", supplierId)
      .eq("organization_id", activeOrganizationId);
    if (error) throw error;
    await refreshCloudData();
  }

  async function addCatalogItem(item: CatalogItem) {
    if (!isCloudMode || !activeOrganizationId) {
      setCatalogItems((currentItems) => {
        const exists = currentItems.some((currentItem) => currentItem.name.toLowerCase() === item.name.toLowerCase());
        return exists ? currentItems : [item, ...currentItems];
      });
      return item.id;
    }

    const existingItem = catalogItems.find((catalogItem) => catalogItem.name.toLowerCase() === item.name.toLowerCase());
    if (existingItem) return existingItem.id;

    const supabase = assertSupabaseConfigured();
    const { data, error } = await supabase
      .from("catalog_items")
      .insert({
        organization_id: activeOrganizationId,
        name: item.name,
        type: item.type,
        unit: item.unit,
        reference_price: item.referencePrice,
      })
      .select("id")
      .single();
    if (error) throw error;
    await refreshCloudData();
    return data.id;
  }

  async function updateCatalogItem(itemId: string, patch: Partial<CatalogItem>) {
    if (!isCloudMode || !activeOrganizationId) {
      setCatalogItems((currentItems) =>
        currentItems.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
      );
      return;
    }

    const supabase = assertSupabaseConfigured();
    const { error } = await supabase
      .from("catalog_items")
      .update(
        cleanPatch({
          name: patch.name,
          type: patch.type,
          unit: patch.unit,
          reference_price: patch.referencePrice,
        }),
      )
      .eq("id", itemId)
      .eq("organization_id", activeOrganizationId);
    if (error) throw error;
    await refreshCloudData();
  }

  async function deleteCatalogItem(itemId: string) {
    if (!isCloudMode || !activeOrganizationId) {
      setCatalogItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
      return;
    }

    const supabase = assertSupabaseConfigured();
    const { error } = await supabase
      .from("catalog_items")
      .update({ is_archived: true })
      .eq("id", itemId)
      .eq("organization_id", activeOrganizationId);
    if (error) throw error;
    await refreshCloudData();
  }

  async function addExpense(expense: Expense) {
    if (!isCloudMode || !activeOrganizationId) {
      setExpenses((currentExpenses) => [expense, ...currentExpenses]);
      return expense.id;
    }

    const supabase = assertSupabaseConfigured();
    const { data, error } = await supabase
      .from("expenses")
      .insert({
        organization_id: activeOrganizationId,
        project_id: expense.projectId,
        phase_id: expense.phaseId,
        supplier_id: expense.supplierId === "supplier-missing" ? null : expense.supplierId,
        catalog_item_id: expense.catalogItemId === "item-manual" ? null : expense.catalogItemId,
        description: expense.description,
        type: expense.type,
        quantity: expense.quantity,
        unit_value: expense.unitValue,
        total: expense.total,
        purchase_date: expense.purchaseDate,
        invoice_payment_date: expense.invoicePaymentDate ?? null,
        store_payment_date: expense.storePaymentDate ?? null,
        invoice_number: expense.invoiceNumber ?? null,
        payment_method: expense.paymentMethod,
        status: expense.status,
        sent_to_accountant: expense.sentToAccountant,
        has_attachment: expense.hasAttachment,
      })
      .select("id")
      .single();
    if (error) throw error;
    await refreshCloudData();
    return data.id;
  }

  async function updateExpense(expenseId: string, patch: Partial<Expense>) {
    if (!isCloudMode || !activeOrganizationId) {
      setExpenses((currentExpenses) =>
        currentExpenses.map((expense) => (expense.id === expenseId ? { ...expense, ...patch } : expense)),
      );
      return;
    }

    const supabase = assertSupabaseConfigured();
    const { error } = await supabase
      .from("expenses")
      .update(
        cleanPatch({
          phase_id: patch.phaseId,
          supplier_id: patch.supplierId,
          catalog_item_id: patch.catalogItemId === "item-manual" ? null : patch.catalogItemId,
          description: patch.description,
          type: patch.type,
          quantity: patch.quantity,
          unit_value: patch.unitValue,
          total: patch.total,
          purchase_date: patch.purchaseDate,
          invoice_payment_date: nullablePatch(patch, "invoicePaymentDate"),
          store_payment_date: nullablePatch(patch, "storePaymentDate"),
          invoice_number: nullablePatch(patch, "invoiceNumber"),
          payment_method: patch.paymentMethod,
          status: patch.status,
          sent_to_accountant: patch.sentToAccountant,
          has_attachment: patch.hasAttachment,
        }),
      )
      .eq("id", expenseId)
      .eq("organization_id", activeOrganizationId);
    if (error) throw error;
    await refreshCloudData();
  }

  async function deleteExpense(expenseId: string) {
    if (!isCloudMode || !activeOrganizationId) {
      setExpenses((currentExpenses) => currentExpenses.filter((expense) => expense.id !== expenseId));
      return;
    }

    const supabase = assertSupabaseConfigured();
    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expenseId)
      .eq("organization_id", activeOrganizationId);
    if (error) throw error;
    await refreshCloudData();
  }

  async function addAgendaEntry(entry: AgendaEntry) {
    if (!isCloudMode || !activeOrganizationId) {
      setAgendaEntries((currentEntries) => [entry, ...currentEntries]);
      return entry.id;
    }

    const supabase = assertSupabaseConfigured();
    const { data, error } = await supabase
      .from("agenda_entries")
      .insert({
        organization_id: activeOrganizationId,
        project_id: entry.projectId || null,
        phase_id: entry.phaseId ?? null,
        date: entry.date,
        type: entry.type,
        title: entry.title,
        description: entry.description ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;
    await refreshCloudData();
    return data.id;
  }

  async function deleteAgendaEntry(entryId: string) {
    if (!isCloudMode || !activeOrganizationId) {
      setAgendaEntries((currentEntries) => currentEntries.filter((entry) => entry.id !== entryId));
      return;
    }

    const supabase = assertSupabaseConfigured();
    const { error } = await supabase
      .from("agenda_entries")
      .delete()
      .eq("id", entryId)
      .eq("organization_id", activeOrganizationId);
    if (error) throw error;
    await refreshCloudData();
  }

  return (
    <ProjectContext.Provider
      value={{
        activeProject,
        activeProjectId,
        addAgendaEntry,
        addProject,
        updateProject,
        deleteProject,
        addExpense,
        updateExpense,
        deleteExpense,
        deleteAgendaEntry,
        addCatalogItem,
        updateCatalogItem,
        deleteCatalogItem,
        addSupplier,
        updateSupplier,
        agendaEntries,
        catalogItems,
        expenses,
        isCloudMode,
        isSyncing,
        projects,
        projectExpenses,
        refreshCloudData,
        suppliers,
        setActiveProjectId,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const value = useContext(ProjectContext);

  if (!value) {
    throw new Error("useProject must be used inside ProjectProvider");
  }

  return value;
}
