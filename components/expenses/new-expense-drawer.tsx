"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileText, FileUp, Layers3, ReceiptText, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/field";
import { useAuth } from "@/components/auth-context";
import { useProject } from "@/components/project-context";
import { formatCurrency } from "@/lib/format";
import {
  CatalogItem,
  Expense,
  ExpenseStatus,
  ExpenseType,
  PaymentMethod,
  Supplier,
} from "@/lib/mock-data";
import { ImportedNfe, parseNfeXml } from "@/lib/nfe-xml";
import { uploadAttachment } from "@/lib/services/attachment-service";
import { cn } from "@/lib/utils";

type NewExpenseDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateExpense?: (expense: Expense) => Promise<string> | string | void;
  onUpdateExpense?: (expenseId: string, patch: Partial<Expense>) => Promise<void> | void;
  editingExpense?: Expense | null;
};

const today = new Date().toISOString().slice(0, 10);
const typeOptions: ExpenseType[] = ["Material", "Mão de Obra", "Serviço", "Equipamento"];
const commonUnits = ["un", "saco", "m3", "barra", "diária", "semana", "serviço", "dia"];
const maxXmlSize = 5 * 1024 * 1024;
type XmlImportMode = "summary" | "items";

function normalizeDocument(value: string) {
  return value.replace(/\D/g, "");
}

function createClientId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function NewExpenseDrawer({
  editingExpense,
  open,
  onCreateExpense,
  onUpdateExpense,
  onOpenChange,
}: NewExpenseDrawerProps) {
  const {
    activeProject,
    addCatalogItem,
    addSupplier,
    catalogItems,
    isCloudMode,
    projectExpenses,
    suppliers,
  } = useProject();
  const { activeOrganizationId } = useAuth();
  const [phaseId, setPhaseId] = useState(activeProject.phases[0]?.id ?? "");
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierDocument, setNewSupplierDocument] = useState("");
  const [newSupplierContact, setNewSupplierContact] = useState("");
  const [newSupplierBankInfo, setNewSupplierBankInfo] = useState("");
  const [catalogItemId, setCatalogItemId] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemType, setItemType] = useState<ExpenseType>("Material");
  const [unit, setUnit] = useState("un");
  const [quantity, setQuantity] = useState(1);
  const [unitValue, setUnitValue] = useState(0);
  const [saveToCatalog, setSaveToCatalog] = useState(true);
  const [purchaseDate, setPurchaseDate] = useState(today);
  const [invoicePaymentDate, setInvoicePaymentDate] = useState("");
  const [storePaymentDate, setStorePaymentDate] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("PIX");
  const [status, setStatus] = useState<ExpenseStatus>("Pago");
  const [sentToAccountant, setSentToAccountant] = useState(false);
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentSize, setAttachmentSize] = useState<number | undefined>();
  const [attachmentType, setAttachmentType] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [importedNfe, setImportedNfe] = useState<ImportedNfe | null>(null);
  const [xmlImportMode, setXmlImportMode] = useState<XmlImportMode>("summary");
  const [xmlError, setXmlError] = useState("");
  const [error, setError] = useState("");
  const isEditing = Boolean(editingExpense);

  useEffect(() => {
    setPhaseId(activeProject.phases[0]?.id ?? "");
  }, [activeProject.id, activeProject.phases]);

  useEffect(() => {
    if (!open || !editingExpense) {
      return;
    }

    setPhaseId(editingExpense.phaseId);
    setSupplierId(editingExpense.supplierId);
    setNewSupplierName("");
    setNewSupplierDocument("");
    setNewSupplierContact("");
    setNewSupplierBankInfo("");
    setCatalogItemId(editingExpense.catalogItemId === "item-manual" ? "" : editingExpense.catalogItemId);
    setItemName(editingExpense.description);
    setItemType(editingExpense.type);
    setUnit(
      catalogItems.find((item) => item.id === editingExpense.catalogItemId)?.unit ?? "un",
    );
    setQuantity(editingExpense.quantity);
    setUnitValue(editingExpense.unitValue);
    setSaveToCatalog(false);
    setPurchaseDate(editingExpense.purchaseDate);
    setInvoicePaymentDate(editingExpense.invoicePaymentDate ?? "");
    setStorePaymentDate(editingExpense.storePaymentDate ?? "");
    setInvoiceNumber(editingExpense.invoiceNumber ?? "");
    setPaymentMethod(editingExpense.paymentMethod);
    setStatus(editingExpense.status);
    setSentToAccountant(editingExpense.sentToAccountant);
    setAttachmentName(editingExpense.attachmentName ?? "");
    setAttachmentSize(editingExpense.attachmentSize);
    setAttachmentType(editingExpense.attachmentType ?? "");
    setAttachmentFile(null);
    setImportedNfe(null);
    setXmlImportMode("summary");
    setXmlError("");
    setError("");
  }, [catalogItems, editingExpense, open]);

  const suggestions = useMemo(() => {
    const normalized = itemName.trim().toLowerCase();
    const sorted = [...catalogItems].sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(normalized) ? -1 : 0;
      const bStarts = b.name.toLowerCase().startsWith(normalized) ? -1 : 0;
      return aStarts - bStarts || a.name.localeCompare(b.name);
    });

    if (!normalized) {
      return sorted.slice(0, 8);
    }

    return sorted
      .filter((item) => item.name.toLowerCase().includes(normalized))
      .slice(0, 8);
  }, [catalogItems, itemName]);

  const hasExactCatalogMatch = catalogItems.some(
    (item) => item.name.toLowerCase() === itemName.trim().toLowerCase(),
  );
  const total = Number(quantity || 0) * Number(unitValue || 0);
  const displayedTotal = importedNfe && xmlImportMode === "items" ? importedNfe.total : total;
  const priceHistory = useMemo(() => {
    const normalized = itemName.trim().toLowerCase();

    if (!normalized) {
      return [];
    }

    return projectExpenses
      .filter((expense) => expense.description.toLowerCase().includes(normalized))
      .slice(0, 4);
  }, [itemName, projectExpenses]);
  const lastPrice = priceHistory[0]?.unitValue;
  const priceDelta = lastPrice ? ((unitValue - lastPrice) / lastPrice) * 100 : 0;

  function pickCatalogItem(item: CatalogItem) {
    setCatalogItemId(item.id);
    setItemName(item.name);
    setItemType(item.type);
    setUnit(item.unit);
    setUnitValue(item.referencePrice);
    setSaveToCatalog(false);
  }

  function resetForm() {
    setPhaseId(activeProject.phases[0]?.id ?? "");
    setSupplierId(suppliers[0]?.id ?? "");
    setNewSupplierName("");
    setNewSupplierDocument("");
    setNewSupplierContact("");
    setNewSupplierBankInfo("");
    setCatalogItemId("");
    setItemName("");
    setItemType("Material");
    setUnit("un");
    setQuantity(1);
    setUnitValue(0);
    setSaveToCatalog(true);
    setPurchaseDate(today);
    setInvoicePaymentDate("");
    setStorePaymentDate("");
    setInvoiceNumber("");
    setPaymentMethod("PIX");
    setStatus("Pago");
    setSentToAccountant(false);
    setAttachmentName("");
    setAttachmentSize(undefined);
    setAttachmentType("");
    setAttachmentFile(null);
    setImportedNfe(null);
    setXmlImportMode("summary");
    setXmlError("");
    setError("");
  }

  function applyImportedNfe(imported: ImportedNfe, mode: XmlImportMode) {
    const firstItem = imported.items[0];
    const existingSupplier = suppliers.find((supplier) => {
      const sameDocument =
        imported.supplierDocument &&
        normalizeDocument(supplier.document) === imported.supplierDocument;
      const sameName = supplier.name.toLowerCase() === imported.supplierName.toLowerCase();
      return sameDocument || sameName;
    });

    setImportedNfe(imported);
    setXmlImportMode(mode);
    setPurchaseDate(imported.emittedAt);
    setInvoiceNumber(imported.invoiceNumber);
    setPaymentMethod(imported.paymentMethod);
    setStatus("Pago");
    setSentToAccountant(false);
    setAttachmentName(imported.invoiceNumber ? `nfe-${imported.invoiceNumber}.xml` : "nota-fiscal.xml");
    setAttachmentType("application/xml");
    setAttachmentSize(undefined);
    setAttachmentFile(null);

    if (existingSupplier) {
      setSupplierId(existingSupplier.id);
      setNewSupplierName("");
      setNewSupplierDocument("");
      setNewSupplierContact("");
      setNewSupplierBankInfo("");
    } else {
      setSupplierId("new");
      setNewSupplierName(imported.supplierName);
      setNewSupplierDocument(imported.supplierDocument || "Documento não informado");
      setNewSupplierContact("Contato não informado");
      setNewSupplierBankInfo("");
    }

    if (mode === "items" && firstItem) {
      setItemName(firstItem.name);
      setUnit(firstItem.unit);
      setQuantity(firstItem.quantity);
      setUnitValue(firstItem.unitValue);
    } else {
      setItemName(
        imported.items.length > 1
          ? `NF ${imported.invoiceNumber || "sem número"} - ${imported.supplierName} (${imported.items.length} itens)`
          : firstItem?.name ?? `NF ${imported.invoiceNumber || "sem número"}`,
      );
      setUnit("nota");
      setQuantity(1);
      setUnitValue(imported.total);
    }

    setCatalogItemId("");
    setItemType(imported.type);
    setSaveToCatalog(mode === "items");
    setXmlError("");
    setError("");
  }

  async function handleXmlFile(file?: File) {
    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".xml")) {
      setXmlError("Envie um arquivo XML de NF-e.");
      return;
    }

    if (file.size > maxXmlSize) {
      setXmlError("O XML deve ter no máximo 5 MB.");
      return;
    }

    try {
      const imported = parseNfeXml(await file.text());
      applyImportedNfe(imported, imported.items.length > 1 ? "summary" : "items");
      setAttachmentName(file.name);
      setAttachmentSize(file.size);
      setAttachmentType(file.type || "application/xml");
      setAttachmentFile(file);
    } catch (caughtError) {
      setXmlError(caughtError instanceof Error ? caughtError.message : "Não foi possível importar o XML.");
    }
  }

  async function resolveSupplierId() {
    if (supplierId !== "new") {
      return supplierId;
    }

    if (!newSupplierName.trim()) {
      setError("Informe o nome do novo fornecedor.");
      return "";
    }

    const newSupplier: Supplier = {
      id: `supplier-${Date.now()}`,
      name: newSupplierName.trim(),
      document: newSupplierDocument.trim() || "Documento não informado",
      category: itemType,
      contact: newSupplierContact.trim() || "Contato não informado",
      bankInfo: newSupplierBankInfo.trim() || undefined,
    };

    return addSupplier(newSupplier);
  }

  async function persistAttachmentForExpense(expenseId: string) {
    if (!attachmentFile || !isCloudMode || !activeOrganizationId) {
      return;
    }

    await uploadAttachment({
      file: attachmentFile,
      organizationId: activeOrganizationId,
      ownerId: expenseId,
      ownerType: "expense",
    });

    await onUpdateExpense?.(expenseId, {
      hasAttachment: true,
      attachmentName: attachmentFile.name,
      attachmentSize: attachmentFile.size,
      attachmentType: attachmentFile.type || undefined,
    });
  }

  async function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const description = itemName.trim();

    if (!phaseId || !description) {
      setError("Informe fase, fornecedor e nome do item para salvar.");
      return;
    }

    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const shouldContinue = submitter?.value === "continue";
    const finalSupplierId = await resolveSupplierId();

    if (!finalSupplierId) {
      return;
    }

    if (quantity <= 0 || unitValue <= 0) {
      setError("Quantidade e valor unitário precisam ser maiores que zero.");
      return;
    }

    if (!editingExpense && importedNfe && xmlImportMode === "items") {
      const catalogIdsByName = new Map<string, string>();
      const fiscalDocumentId = createClientId("fiscal-doc");
      const attachmentId = attachmentName ? createClientId("attachment") : undefined;

      for (const [index, item] of importedNfe.items.entries()) {
        const normalizedItemName = item.name.trim().toLowerCase();
        let finalCatalogItemId = "item-manual";

        if (saveToCatalog) {
          const existingItem = catalogItems.find(
            (catalogItem) => catalogItem.name.toLowerCase() === normalizedItemName,
          );

          finalCatalogItemId = existingItem?.id ?? catalogIdsByName.get(normalizedItemName) ?? "";

          if (!finalCatalogItemId) {
            const newItem: CatalogItem = {
              id: `item-${Date.now()}-${index}`,
              name: item.name.trim(),
              type: itemType,
              unit: item.unit,
              referencePrice: item.unitValue,
            };

            await addCatalogItem(newItem);
            catalogIdsByName.set(normalizedItemName, newItem.id);
            finalCatalogItemId = newItem.id;
          }
        }

        const expenseId = `exp-${Date.now()}-${index}`;
        const createdExpenseId = await onCreateExpense?.({
          id: expenseId,
          projectId: activeProject.id,
          phaseId,
          fiscalDocumentId,
          fiscalDocumentType: "NFE",
          fiscalDocumentAccessKey: importedNfe.accessKey,
          fiscalDocumentStatus: "Importado",
          fiscalLineItemId: `${fiscalDocumentId}-line-${index + 1}`,
          fiscalLineItemCode: item.id,
          date: importedNfe.emittedAt,
          purchaseDate: importedNfe.emittedAt,
          invoicePaymentDate: invoicePaymentDate || undefined,
          storePaymentDate: storePaymentDate || undefined,
          invoiceNumber: importedNfe.invoiceNumber || undefined,
          supplierId: finalSupplierId,
          catalogItemId: finalCatalogItemId,
          description: item.name,
          type: itemType,
          quantity: item.quantity,
          unitValue: item.unitValue,
          total: item.total,
          paymentMethod,
          status,
          sentToAccountant,
          hasAttachment: Boolean(attachmentName) && (!isCloudMode || !attachmentFile),
          attachmentId,
          attachmentName: attachmentName || undefined,
          attachmentSize,
          attachmentType: attachmentType || undefined,
        });
        await persistAttachmentForExpense(createdExpenseId || expenseId);
      }

      resetForm();
      if (!shouldContinue) {
        onOpenChange(false);
      }
      return;
    }

    let finalCatalogItemId = catalogItemId || "item-manual";

    if (!catalogItemId && saveToCatalog && !hasExactCatalogMatch) {
      const newItem: CatalogItem = {
        id: `item-${Date.now()}`,
        name: description,
        type: itemType,
        unit,
        referencePrice: unitValue,
      };
      finalCatalogItemId = await addCatalogItem(newItem);
    }

    const fiscalDocumentId = importedNfe ? createClientId("fiscal-doc") : undefined;
    const attachmentId = attachmentName ? createClientId("attachment") : undefined;

    const expensePayload: Expense = {
      id: `exp-${Date.now()}`,
      projectId: activeProject.id,
      phaseId,
      fiscalDocumentId,
      fiscalDocumentType: importedNfe ? "NFE" : undefined,
      fiscalDocumentAccessKey: importedNfe?.accessKey,
      fiscalDocumentStatus: importedNfe ? "Importado" : undefined,
      fiscalLineItemId: fiscalDocumentId ? `${fiscalDocumentId}-summary` : undefined,
      fiscalLineItemCode: importedNfe?.items[0]?.id,
      date: purchaseDate,
      purchaseDate,
      invoicePaymentDate: invoicePaymentDate || undefined,
      storePaymentDate: storePaymentDate || undefined,
      invoiceNumber: invoiceNumber || undefined,
      supplierId: finalSupplierId,
      catalogItemId: finalCatalogItemId,
      description,
      type: itemType,
      quantity,
      unitValue,
      total,
      paymentMethod,
      status,
      sentToAccountant,
      hasAttachment: Boolean(attachmentName) && (!isCloudMode || !attachmentFile),
      attachmentId,
      attachmentName: attachmentName || undefined,
      attachmentSize,
      attachmentType: attachmentType || undefined,
    };

    if (editingExpense) {
      await onUpdateExpense?.(editingExpense.id, {
        ...expensePayload,
        id: editingExpense.id,
        projectId: editingExpense.projectId,
      });
      await persistAttachmentForExpense(editingExpense.id);
      resetForm();
      onOpenChange(false);
      return;
    }

    const createdExpenseId = await onCreateExpense?.(expensePayload);
    await persistAttachmentForExpense(createdExpenseId || expensePayload.id);

    resetForm();
    if (!shouldContinue) {
      onOpenChange(false);
    }
  }

  return (
    <div className={cn("fixed inset-0 z-50", open ? "pointer-events-auto" : "pointer-events-none")}>
      <button
        type="button"
        className={cn(
          "absolute inset-0 bg-[#061c3d]/38 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={() => onOpenChange(false)}
        aria-label="Fechar lançamento"
      />

      <aside
        className={cn(
          "absolute right-0 top-0 flex h-full w-full max-w-4xl flex-col border-l border-blueprint-line bg-blueprint-surface shadow-lift transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!open}
      >
        <header className="border-b border-blueprint-line bg-blueprint-ink px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#B8D9F2]">{activeProject.name}</p>
              <h2 className="mt-1 text-xl font-semibold">
                {isEditing ? "Editar despesa" : "Lançar compra"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-9 w-9 items-center justify-center rounded-md text-[#dfe7dc] transition hover:bg-white/10"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={submitExpense}>
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <div className="space-y-4">
                {!isEditing ? (
                  <section className="rounded-lg border border-blueprint-line bg-white/92 p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-blueprint-ink">
                          <FileText className="h-4 w-4 text-blueprint-accent" />
                          Importar XML da NF-e
                          <span className="rounded-full bg-blueprint-surface px-2 py-0.5 text-[11px] font-medium text-blueprint-muted">
                            opcional
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-blueprint-muted">
                          Use o XML para preencher fornecedor, nota, data, itens, quantidades e valores. Depois revise antes de salvar.
                        </p>
                      </div>
                      <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-blueprint-line bg-white/90 px-4 text-sm font-medium text-blueprint-ink shadow-sm transition hover:border-blueprint-accent hover:bg-[#eef7ff]">
                        <FileUp className="h-4 w-4" />
                        Selecionar XML
                        <input
                          type="file"
                          accept=".xml,text/xml,application/xml"
                          className="sr-only"
                          onChange={(event) => {
                            void handleXmlFile(event.target.files?.[0]);
                            event.target.value = "";
                          }}
                        />
                      </label>
                    </div>

                    {xmlError ? (
                      <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        {xmlError}
                      </p>
                    ) : null}

                    {importedNfe ? (
                      <div className="mt-4 rounded-lg border border-[#c8dbea] bg-[#f5fbff] p-3">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-sm font-semibold text-blueprint-ink">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              NF-e importada
                            </div>
                            <p className="mt-1 truncate text-sm text-blueprint-muted">
                              {importedNfe.supplierName} · NF {importedNfe.invoiceNumber || "sem número"} · {formatCurrency(importedNfe.total)}
                            </p>
                            <p className="mt-1 text-xs text-blueprint-muted">
                              {importedNfe.items.length} {importedNfe.items.length === 1 ? "item encontrado" : "itens encontrados"} no XML.
                            </p>
                          </div>
                          {importedNfe.items.length > 1 ? (
                            <div className="grid gap-2 sm:grid-cols-2">
                              <button
                                type="button"
                                onClick={() => applyImportedNfe(importedNfe, "summary")}
                                className={cn(
                                  "rounded-md border px-3 py-2 text-left text-xs transition",
                                  xmlImportMode === "summary"
                                    ? "border-blueprint-accent bg-white text-blueprint-ink shadow-sm"
                                    : "border-blueprint-line bg-white/70 text-blueprint-muted hover:border-blueprint-accent",
                                )}
                              >
                                <span className="block font-semibold">Despesa única</span>
                                <span>Um lançamento com o total da nota.</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => applyImportedNfe(importedNfe, "items")}
                                className={cn(
                                  "rounded-md border px-3 py-2 text-left text-xs transition",
                                  xmlImportMode === "items"
                                    ? "border-blueprint-accent bg-white text-blueprint-ink shadow-sm"
                                    : "border-blueprint-line bg-white/70 text-blueprint-muted hover:border-blueprint-accent",
                                )}
                              >
                                <span className="flex items-center gap-1 font-semibold">
                                  <Layers3 className="h-3.5 w-3.5" />
                                  Itens separados
                                </span>
                                <span>Cria uma despesa por produto.</span>
                              </button>
                            </div>
                          ) : null}
                        </div>

                        {xmlImportMode === "items" ? (
                          <div className="mt-3 max-h-32 overflow-y-auto rounded-md border border-blueprint-line bg-white">
                            {importedNfe.items.slice(0, 8).map((item) => (
                              <div key={item.id} className="grid grid-cols-[1fr_auto] gap-3 border-b border-blueprint-line px-3 py-2 text-xs last:border-b-0">
                                <span className="truncate text-blueprint-ink">{item.name}</span>
                                <span className="font-medium text-blueprint-muted">
                                  {item.quantity} {item.unit} · {formatCurrency(item.total)}
                                </span>
                              </div>
                            ))}
                            {importedNfe.items.length > 8 ? (
                              <div className="px-3 py-2 text-xs text-blueprint-muted">
                                + {importedNfe.items.length - 8} itens adicionais serão lançados ao salvar.
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </section>
                ) : null}

                <section className="rounded-lg border border-blueprint-line bg-white/92 p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-blueprint-ink">
                    <Sparkles className="h-4 w-4 text-blueprint-accent" />
                    Item ou serviço
                  </div>
                  <div className="mt-4 grid gap-3">
                    <FieldLabel label="Nome do item">
                      <Input
                        value={itemName}
                        onChange={(event) => {
                          setItemName(event.target.value);
                          setCatalogItemId("");
                          setSaveToCatalog(true);
                        }}
                        placeholder="Ex: Tela soldada Q138, frete de areia, diária de gesseiro..."
                      />
                    </FieldLabel>

                    <div className="grid gap-3 md:grid-cols-[160px_140px_1fr]">
                      <FieldLabel label="Tipo">
                        <Select
                          value={itemType}
                          onChange={(event) => setItemType(event.target.value as ExpenseType)}
                        >
                          {typeOptions.map((type) => (
                            <option key={type}>{type}</option>
                          ))}
                        </Select>
                      </FieldLabel>
                      <FieldLabel label="Unidade">
                        <Input
                          value={unit}
                          onChange={(event) => setUnit(event.target.value)}
                          list="blueprint-units"
                        />
                      </FieldLabel>
                      <FieldLabel label="Fornecedor">
                        <Select value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
                          {suppliers.map((supplier) => (
                            <option key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </option>
                          ))}
                          <option value="new">+ Novo fornecedor</option>
                        </Select>
                      </FieldLabel>
                    </div>
                    <datalist id="blueprint-units">
                      {commonUnits.map((itemUnit) => (
                        <option key={itemUnit} value={itemUnit} />
                      ))}
                    </datalist>

                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => pickCatalogItem(item)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                            catalogItemId === item.id
                              ? "border-blueprint-accent bg-[#e7f4fd] text-blueprint-ink"
                              : "border-blueprint-line bg-blueprint-surface text-blueprint-muted hover:border-blueprint-accent hover:bg-white hover:text-blueprint-ink",
                          )}
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>

                    {!catalogItemId && itemName.trim() ? (
                      <label className="flex items-center gap-2 rounded-md border border-blueprint-line bg-blueprint-surface px-3 py-2 text-sm text-blueprint-ink">
                        <input
                          type="checkbox"
                          checked={saveToCatalog}
                          onChange={(event) => setSaveToCatalog(event.target.checked)}
                        />
                        Salvar este item no catálogo para próximas compras
                      </label>
                    ) : null}

                    {priceHistory.length ? (
                      <div className="rounded-md border border-blueprint-line bg-blueprint-mist/60 px-3 py-2 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium text-blueprint-ink">Histórico deste item</span>
                          <span className={cn("text-xs font-medium", Math.abs(priceDelta) > 15 ? "text-amber-700" : "text-blueprint-muted")}>
                            último preço {formatCurrency(lastPrice ?? 0)}
                          </span>
                        </div>
                        <div className="mt-2 grid gap-1 text-xs text-blueprint-muted">
                          {priceHistory.map((expense) => (
                            <span key={expense.id}>
                              {expense.purchaseDate}: {formatCurrency(expense.unitValue)} por {expense.quantity} {unit}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>

                {supplierId === "new" ? (
                  <section className="rounded-lg border border-blueprint-line bg-white/92 p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold text-blueprint-ink">
                      Novo fornecedor
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <FieldLabel label="Nome">
                        <Input
                          value={newSupplierName}
                          onChange={(event) => setNewSupplierName(event.target.value)}
                          placeholder="Ex: Ferragem Central"
                        />
                      </FieldLabel>
                      <FieldLabel label="CNPJ/CPF">
                        <Input
                          value={newSupplierDocument}
                          onChange={(event) => setNewSupplierDocument(event.target.value)}
                          placeholder="Opcional"
                        />
                      </FieldLabel>
                      <FieldLabel label="Contato responsável">
                        <Input
                          value={newSupplierContact}
                          onChange={(event) => setNewSupplierContact(event.target.value)}
                          placeholder="Ex: João - (51) 99999-0000"
                        />
                      </FieldLabel>
                      <FieldLabel label="Dados bancários">
                        <Input
                          value={newSupplierBankInfo}
                          onChange={(event) => setNewSupplierBankInfo(event.target.value)}
                          placeholder="Pix, banco ou agência/conta"
                        />
                      </FieldLabel>
                    </div>
                  </section>
                ) : null}

                <section className="rounded-lg border border-blueprint-line bg-white/92 p-4 shadow-sm">
                  <div className="grid gap-3 md:grid-cols-[1fr_140px_180px]">
                    <FieldLabel label="Fase">
                      <Select value={phaseId} onChange={(event) => setPhaseId(event.target.value)}>
                        {activeProject.phases.map((phase) => (
                          <option key={phase.id} value={phase.id}>
                            {phase.name}
                          </option>
                        ))}
                      </Select>
                    </FieldLabel>
                    <FieldLabel label="Quantidade">
                      <Input
                        min="0"
                        step="0.01"
                        type="number"
                        value={quantity}
                        onChange={(event) => setQuantity(Number(event.target.value))}
                      />
                    </FieldLabel>
                    <FieldLabel label="Valor unitário">
                      <Input
                        min="0"
                        step="0.01"
                        type="number"
                        value={unitValue}
                        onChange={(event) => setUnitValue(Number(event.target.value))}
                      />
                    </FieldLabel>
                  </div>
                </section>

                <section className="rounded-lg border border-blueprint-line bg-white/92 p-4 shadow-sm">
                  <div className="grid gap-3 md:grid-cols-3">
                    <FieldLabel label="Compra">
                      <Input type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} />
                    </FieldLabel>
                    <FieldLabel label="Pgto fatura">
                      <Input type="date" value={invoicePaymentDate} onChange={(event) => setInvoicePaymentDate(event.target.value)} />
                    </FieldLabel>
                    <FieldLabel label="Pgto loja">
                      <Input type="date" value={storePaymentDate} onChange={(event) => setStorePaymentDate(event.target.value)} />
                    </FieldLabel>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <FieldLabel label="Nota fiscal">
                      <Input value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} placeholder="ex: 18932" />
                    </FieldLabel>
                    <FieldLabel label="Pagamento">
                      <Select
                        value={paymentMethod}
                        onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                      >
                        <option>PIX</option>
                        <option>Boleto</option>
                        <option>Cartão</option>
                        <option>A Prazo</option>
                        <option>Espécie</option>
                      </Select>
                    </FieldLabel>
                    <FieldLabel label="Status">
                      <Select
                        value={status}
                        onChange={(event) => setStatus(event.target.value as ExpenseStatus)}
                      >
                        <option>Pago</option>
                        <option>Pendente</option>
                      </Select>
                    </FieldLabel>
                  </div>
                </section>
                <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                <label className="flex items-center gap-3 rounded-lg border border-blueprint-line bg-white/92 p-3 text-sm text-blueprint-ink shadow-sm">
                  <input
                    type="checkbox"
                    checked={sentToAccountant}
                    onChange={(event) => setSentToAccountant(event.target.checked)}
                  />
                  Enviado ao contador/investidor
                </label>

                <label className="flex cursor-pointer items-center justify-center gap-3 rounded-lg border border-dashed border-blueprint-line bg-white/92 px-4 py-4 text-center shadow-sm transition hover:border-blueprint-accent hover:bg-[#eef6fd]">
                  <FileUp className="h-6 w-6 text-blueprint-accent" />
                  <span>
                    <span className="block text-sm font-medium text-blueprint-ink">
                      {attachmentName || "Anexar comprovante"}
                    </span>
                    <span className="block text-xs text-blueprint-muted">
                      {attachmentSize
                        ? `${(attachmentSize / 1024 / 1024).toFixed(2)} MB selecionados`
                        : "PDF, imagem ou foto da nota"}
                    </span>
                  </span>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      setAttachmentName(file?.name ?? "");
                      setAttachmentSize(file?.size);
                      setAttachmentType(file?.type ?? "");
                      setAttachmentFile(file ?? null);
                    }}
                  />
                </label>
                </div>

                {error ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {error}
                  </div>
                ) : null}
            </div>
          </div>

          <footer className="flex flex-col gap-3 border-t border-blueprint-line bg-white/92 px-5 py-4 shadow-[0_-12px_28px_rgba(6,28,61,0.05)] md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-normal text-blueprint-muted">Total do lançamento</p>
              <p className="text-2xl font-semibold text-blueprint-ink">{formatCurrency(displayedTotal)}</p>
              <p className="text-xs text-blueprint-muted">
                {importedNfe && xmlImportMode === "items"
                  ? `${importedNfe.items.length} itens importados da NF-e`
                  : `${quantity || 0} ${unit} x ${formatCurrency(unitValue || 0)}`}
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            {!isEditing ? (
              <Button type="submit" variant="secondary" value="continue">
                <ReceiptText className="h-4 w-4" />
                Salvar e lançar outro
              </Button>
            ) : null}
            <Button type="submit" value="close">
              <ReceiptText className="h-4 w-4" />
              {isEditing ? "Salvar alterações" : "Salvar lançamento"}
            </Button>
            </div>
          </footer>
        </form>
      </aside>
    </div>
  );
}
