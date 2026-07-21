"use client";

import { FormEvent, useMemo, useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/field";
import { useProject } from "@/components/project-context";
import { CatalogItem, ExpenseType } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/format";
import { displayText } from "@/lib/display";

const itemTypes: ExpenseType[] = ["Material", "Mão de Obra", "Serviço", "Equipamento"];

type CatalogForm = {
  name: string;
  type: ExpenseType;
  unit: string;
  referencePrice: string;
};

const emptyForm: CatalogForm = {
  name: "",
  type: "Material",
  unit: "un",
  referencePrice: "",
};

function toForm(item: CatalogItem): CatalogForm {
  return {
    name: item.name,
    type: item.type,
    unit: item.unit,
    referencePrice: String(item.referencePrice),
  };
}

export function CatalogPage() {
  const {
    addCatalogItem,
    catalogItems,
    deleteCatalogItem,
    expenses,
    updateCatalogItem,
  } = useProject();
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CatalogForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [error, setError] = useState("");

  const usageByItem = useMemo(() => {
    return expenses.reduce<Record<string, number>>((acc, expense) => {
      acc[expense.catalogItemId] = (acc[expense.catalogItemId] ?? 0) + 1;
      return acc;
    }, {});
  }, [expenses]);

  const rows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return catalogItems
      .filter((item) => typeFilter === "all" || item.type === typeFilter)
      .filter((item) => !normalizedSearch || `${item.name} ${item.type} ${item.unit}`.toLowerCase().includes(normalizedSearch))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [catalogItems, search, typeFilter]);

  function resetForm() {
    setIsEditing(false);
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  function startCreate() {
    setIsEditing(true);
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  function startEdit(item: CatalogItem) {
    setIsEditing(true);
    setEditingId(item.id);
    setForm(toForm(item));
    setError("");
  }

  function submitItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();
    const referencePrice = Number(form.referencePrice);

    if (!name || !form.unit.trim()) {
      setError("Informe nome e unidade do item.");
      return;
    }

    if (!referencePrice || referencePrice <= 0) {
      setError("Informe um preço de referência válido.");
      return;
    }

    const itemPatch = {
      name,
      type: form.type,
      unit: form.unit.trim(),
      referencePrice,
    };

    if (editingId) {
      updateCatalogItem(editingId, itemPatch);
    } else {
      addCatalogItem({
        id: `item-${Date.now()}`,
        ...itemPatch,
      });
    }

    resetForm();
  }

  function handleDelete(item: CatalogItem) {
    const usageCount = usageByItem[item.id] ?? 0;

    if (usageCount > 0) {
      setError("Este item já foi usado em despesas. Edite o item ou mantenha-o para preservar o histórico.");
      return;
    }

    if (window.confirm(`Excluir "${item.name}" do catálogo?`)) {
      deleteCatalogItem(item.id);
    }
  }

  return (
    <main className="space-y-5">
      <div className="blueprint-panel rounded-lg p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="text-sm font-medium text-blueprint-accent">Catálogo base</span>
            <h1 className="mt-2 text-2xl font-semibold text-blueprint-ink">
              Insumos e serviços
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-blueprint-muted">
              Organize itens recorrentes para acelerar lançamentos e reduzir erros de digitação.
            </p>
          </div>
          <Button type="button" onClick={startCreate} className="justify-start">
            <Plus className="h-4 w-4" />
            Novo item
          </Button>
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={submitItem} className="blueprint-panel rounded-lg p-5">
          <div className="grid gap-3 lg:grid-cols-[1.4fr_180px_140px_180px]">
            <FieldLabel label="Nome">
              <Input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Ex: Cimento CP II 50kg"
              />
            </FieldLabel>
            <FieldLabel label="Tipo">
              <Select
                value={form.type}
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as ExpenseType }))}
              >
                {itemTypes.map((type) => (
                  <option key={type}>{displayText(type)}</option>
                ))}
              </Select>
            </FieldLabel>
            <FieldLabel label="Unidade">
              <Input
                value={form.unit}
                onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))}
              />
            </FieldLabel>
            <FieldLabel label="Preço referência">
              <Input
                min="0"
                step="0.01"
                type="number"
                value={form.referencePrice}
                onChange={(event) => setForm((current) => ({ ...current, referencePrice: event.target.value }))}
              />
            </FieldLabel>
          </div>

          {error ? (
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={resetForm}>
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4" />
              Salvar item
            </Button>
          </div>
        </form>
      ) : null}

      <section className="blueprint-panel overflow-hidden rounded-lg">
        <div className="grid gap-3 border-b border-blueprint-line p-4 md:grid-cols-[220px_1fr]">
          <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filtrar por tipo">
            <option value="all">Todos os tipos</option>
            {itemTypes.map((type) => (
              <option key={type} value={type}>
                {displayText(type)}
              </option>
            ))}
          </Select>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, tipo ou unidade"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-blueprint-surface text-xs uppercase tracking-normal text-blueprint-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Item</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Unidade</th>
                <th className="px-4 py-3 text-right font-semibold">Referência</th>
                <th className="px-4 py-3 text-right font-semibold">Uso</th>
                <th className="px-4 py-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blueprint-line">
              {rows.map((item) => {
                const usageCount = usageByItem[item.id] ?? 0;

                return (
                  <tr key={item.id} className="bg-white hover:bg-[#f5f9fd]">
                    <td className="px-4 py-4 font-medium text-blueprint-ink">{item.name}</td>
                    <td className="px-4 py-4">
                      <Badge tone="gray">{displayText(item.type)}</Badge>
                    </td>
                    <td className="px-4 py-4 text-blueprint-muted">{item.unit}</td>
                    <td className="px-4 py-4 text-right font-semibold text-blueprint-ink">
                      {formatCurrency(item.referencePrice)}
                    </td>
                    <td className="px-4 py-4 text-right text-blueprint-muted">{usageCount}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-1">
                        <Button type="button" variant="ghost" className="h-8 px-2" onClick={() => startEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 px-2 text-red-700 hover:bg-red-50 hover:text-red-800"
                          disabled={usageCount > 0}
                          onClick={() => handleDelete(item)}
                          title={usageCount > 0 ? "Item usado em despesas" : "Excluir item"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
