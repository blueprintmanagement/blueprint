"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AgendaEntry,
  CatalogItem,
  Expense,
  Supplier,
  agendaEntries as initialAgendaEntries,
  expenses as initialExpenses,
  catalogItems as initialCatalogItems,
  suppliers as initialSuppliers,
  projects as initialProjects,
  Project,
} from "@/lib/mock-data";

type ProjectContextValue = {
  activeProject: Project;
  activeProjectId: string;
  projects: Project[];
  expenses: Expense[];
  projectExpenses: Expense[];
  agendaEntries: AgendaEntry[];
  catalogItems: CatalogItem[];
  suppliers: Supplier[];
  addAgendaEntry: (entry: AgendaEntry) => void;
  deleteAgendaEntry: (entryId: string) => void;
  addProject: (project: Project) => void;
  updateProject: (projectId: string, patch: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  addExpense: (expense: Expense) => void;
  updateExpense: (expenseId: string, patch: Partial<Expense>) => void;
  deleteExpense: (expenseId: string) => void;
  addCatalogItem: (item: CatalogItem) => void;
  updateCatalogItem: (itemId: string, patch: Partial<CatalogItem>) => void;
  deleteCatalogItem: (itemId: string) => void;
  addSupplier: (supplier: Supplier) => void;
  updateSupplier: (supplierId: string, patch: Partial<Supplier>) => void;
  setActiveProjectId: (projectId: string) => void;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [activeProjectId, setActiveProjectIdState] = useState(initialProjects[0].id);
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [agendaEntries, setAgendaEntries] = useState<AgendaEntry[]>(initialAgendaEntries);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>(initialCatalogItems);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    window.localStorage.setItem("blueprint.activeProjectId", activeProjectId);
  }, [activeProjectId]);

  useEffect(() => {
    window.localStorage.setItem("blueprint.projects", JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    window.localStorage.setItem("blueprint.expenses", JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    window.localStorage.setItem("blueprint.agendaEntries", JSON.stringify(agendaEntries));
  }, [agendaEntries]);

  useEffect(() => {
    window.localStorage.setItem("blueprint.catalogItems", JSON.stringify(catalogItems));
  }, [catalogItems]);

  useEffect(() => {
    window.localStorage.setItem("blueprint.suppliers", JSON.stringify(suppliers));
  }, [suppliers]);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? projects[0],
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

  function addProject(project: Project) {
    setProjects((currentProjects) => {
      if (currentProjects.length >= 10) {
        return currentProjects;
      }

      return [project, ...currentProjects];
    });
    setActiveProjectIdState(project.id);
  }

  function updateProject(projectId: string, patch: Partial<Project>) {
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              ...patch,
            }
          : project,
      ),
    );
  }

  function deleteProject(projectId: string) {
    setProjects((currentProjects) => {
      if (currentProjects.length <= 1) {
        return currentProjects;
      }

      const nextProjects = currentProjects.filter((project) => project.id !== projectId);

      if (activeProjectId === projectId && nextProjects[0]) {
        setActiveProjectIdState(nextProjects[0].id);
      }

      return nextProjects;
    });
    setExpenses((currentExpenses) =>
      currentExpenses.filter((expense) => expense.projectId !== projectId),
    );
  }

  function addExpense(expense: Expense) {
    setExpenses((currentExpenses) => [expense, ...currentExpenses]);
  }

  function updateExpense(expenseId: string, patch: Partial<Expense>) {
    setExpenses((currentExpenses) =>
      currentExpenses.map((expense) =>
        expense.id === expenseId
          ? {
              ...expense,
              ...patch,
            }
          : expense,
      ),
    );
  }

  function deleteExpense(expenseId: string) {
    setExpenses((currentExpenses) =>
      currentExpenses.filter((expense) => expense.id !== expenseId),
    );
  }

  function addAgendaEntry(entry: AgendaEntry) {
    setAgendaEntries((currentEntries) => [entry, ...currentEntries]);
  }

  function deleteAgendaEntry(entryId: string) {
    setAgendaEntries((currentEntries) =>
      currentEntries.filter((entry) => entry.id !== entryId),
    );
  }

  function addCatalogItem(item: CatalogItem) {
    setCatalogItems((currentItems) => {
      const exists = currentItems.some(
        (currentItem) => currentItem.name.toLowerCase() === item.name.toLowerCase(),
      );

      return exists ? currentItems : [item, ...currentItems];
    });
  }

  function updateCatalogItem(itemId: string, patch: Partial<CatalogItem>) {
    setCatalogItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );
  }

  function deleteCatalogItem(itemId: string) {
    setCatalogItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
  }

  function addSupplier(supplier: Supplier) {
    setSuppliers((currentSuppliers) => {
      const exists = currentSuppliers.some(
        (currentSupplier) => currentSupplier.name.toLowerCase() === supplier.name.toLowerCase(),
      );

      return exists ? currentSuppliers : [supplier, ...currentSuppliers];
    });
  }

  function updateSupplier(supplierId: string, patch: Partial<Supplier>) {
    setSuppliers((currentSuppliers) =>
      currentSuppliers.map((supplier) =>
        supplier.id === supplierId
          ? {
              ...supplier,
              ...patch,
            }
          : supplier,
      ),
    );
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
        projects,
        projectExpenses,
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
