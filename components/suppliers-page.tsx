"use client";

import { FormEvent, useMemo, useState } from "react";
import { Pencil, Plus, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/field";
import { useProject } from "@/components/project-context";
import { ExpenseType, Supplier } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/format";
import { displayText } from "@/lib/display";

const supplierTypes: ExpenseType[] = ["Material", "Mão de Obra", "Serviço", "Equipamento"];

type SupplierForm = {
  name: string;
  document: string;
  category: ExpenseType;
  contact: string;
  bankInfo: string;
};

const emptyForm: SupplierForm = {
  name: "",
  document: "",
  category: "Material",
  contact: "",
  bankInfo: "",
};

function toForm(supplier: Supplier): SupplierForm {
  return {
    name: supplier.name,
    document: supplier.document,
    category: supplier.category,
    contact: supplier.contact,
    bankInfo: supplier.bankInfo ?? "",
  };
}

export function SuppliersPage() {
  const { activeProject, addSupplier, projectExpenses, suppliers, updateSupplier } = useProject();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierForm>(emptyForm);
  const [error, setError] = useState("");

  const usedSupplierIds = new Set(projectExpenses.map((expense) => expense.supplierId));
  const supplierRows = useMemo(
    () =>
      suppliers
        .map((supplier) => {
          const supplierExpenses = projectExpenses.filter((expense) => expense.supplierId === supplier.id);
          const total = supplierExpenses.reduce((sum, expense) => sum + expense.total, 0);
          const missingAttachments = supplierExpenses.filter((expense) => !expense.hasAttachment).length;

          return {
            ...supplier,
            expenseCount: supplierExpenses.length,
            isUsedInProject: usedSupplierIds.has(supplier.id),
            missingAttachments,
            total,
          };
        })
        .sort((a, b) => Number(b.isUsedInProject) - Number(a.isUsedInProject) || b.total - a.total),
    [projectExpenses, suppliers, usedSupplierIds],
  );

  function startCreate() {
    setIsCreating(true);
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  function startEdit(supplier: Supplier) {
    setIsCreating(false);
    setEditingId(supplier.id);
    setForm(toForm(supplier));
    setError("");
  }

  function cancelForm() {
    setIsCreating(false);
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  function submitSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Informe o nome do fornecedor.");
      return;
    }

    const supplierPatch = {
      name: form.name.trim(),
      document: form.document.trim() || "Documento não informado",
      category: form.category,
      contact: form.contact.trim() || "Contato não informado",
      bankInfo: form.bankInfo.trim() || undefined,
    };

    if (editingId) {
      updateSupplier(editingId, supplierPatch);
    } else {
      addSupplier({
        id: `supplier-${Date.now()}`,
        ...supplierPatch,
      });
    }

    cancelForm();
  }

  return (
    <main className="space-y-5">
      <div className="blueprint-panel rounded-lg p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="text-sm font-medium text-blueprint-accent">Cadastro financeiro</span>
            <h1 className="mt-2 text-2xl font-semibold text-blueprint-ink">
              Fornecedores - {activeProject.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-blueprint-muted">
              Cadastre lojas, empreiteiros e prestadores com contato, documento e dados bancarios para acelerar os lançamentos.
            </p>
          </div>
          <Button onClick={startCreate} className="justify-start">
            <Plus className="h-4 w-4" />
            Novo fornecedor
          </Button>
        </div>
      </div>

      {isCreating || editingId ? (
        <form onSubmit={submitSupplier} className="blueprint-panel rounded-lg p-5">
          <div className="grid gap-3 lg:grid-cols-[1.3fr_180px_180px_1fr_1fr]">
            <FieldLabel label="Nome">
              <Input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Ex: Ferragem Central"
              />
            </FieldLabel>
            <FieldLabel label="Tipo">
              <Select
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as ExpenseType }))}
              >
                {supplierTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </Select>
            </FieldLabel>
            <FieldLabel label="CNPJ/CPF">
              <Input
                value={form.document}
                onChange={(event) => setForm((current) => ({ ...current, document: event.target.value }))}
                placeholder="Opcional"
              />
            </FieldLabel>
            <FieldLabel label="Contato">
              <Input
                value={form.contact}
                onChange={(event) => setForm((current) => ({ ...current, contact: event.target.value }))}
                placeholder="WhatsApp ou email"
              />
            </FieldLabel>
            <FieldLabel label="Dados bancários">
              <Input
                value={form.bankInfo}
                onChange={(event) => setForm((current) => ({ ...current, bankInfo: event.target.value }))}
                placeholder="Pix, banco ou agencia/conta"
              />
            </FieldLabel>
          </div>

          {error ? (
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={cancelForm}>
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4" />
              Salvar fornecedor
            </Button>
          </div>
        </form>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-blueprint-line bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1020px] text-left text-sm">
            <thead className="bg-blueprint-surface text-xs uppercase tracking-normal text-blueprint-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Fornecedor</th>
                <th className="px-4 py-3 font-semibold">Documento</th>
                <th className="px-4 py-3 font-semibold">Categoria</th>
                <th className="px-4 py-3 font-semibold">Contato</th>
                <th className="px-4 py-3 font-semibold">Dados bancários</th>
                <th className="px-4 py-3 text-right font-semibold">Lançamentos</th>
                <th className="px-4 py-3 text-right font-semibold">Pendências</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
                <th className="px-4 py-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blueprint-line">
              {supplierRows.map((supplier) => (
                <tr key={supplier.id} className={supplier.isUsedInProject ? "bg-white hover:bg-[#f5f9fd]" : "bg-slate-50/70 hover:bg-slate-50"}>
                  <td className="px-4 py-4">
                    <div className="font-medium text-blueprint-ink">{supplier.name}</div>
                    {!supplier.isUsedInProject ? (
                      <div className="text-xs text-blueprint-muted">Ainda não usado nesta obra</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 text-blueprint-muted">{supplier.document}</td>
                  <td className="px-4 py-4">
                    <Badge tone="gray">{displayText(supplier.category)}</Badge>
                  </td>
                  <td className="px-4 py-4 text-blueprint-muted">{supplier.contact}</td>
                  <td className="px-4 py-4 text-blueprint-muted">{supplier.bankInfo ?? "-"}</td>
                  <td className="px-4 py-4 text-right text-blueprint-muted">{supplier.expenseCount}</td>
                  <td className="px-4 py-4 text-right">
                    <Badge tone={supplier.missingAttachments ? "amber" : "green"}>
                      {supplier.missingAttachments}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-right font-semibold text-blueprint-ink">
                    {formatCurrency(supplier.total)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Button type="button" variant="ghost" className="h-8 px-2" onClick={() => startEdit(supplier)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
