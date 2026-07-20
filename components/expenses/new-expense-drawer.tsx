"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { FileUp, ReceiptText, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/field";
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
import { cn } from "@/lib/utils";

type NewExpenseDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateExpense: (expense: Expense) => void;
};

const today = new Date().toISOString().slice(0, 10);
const typeOptions: ExpenseType[] = ["Material", "Mao de Obra", "Servico", "Equipamento"];
const commonUnits = ["un", "saco", "m3", "barra", "diaria", "semana", "servico", "dia"];

export function NewExpenseDrawer({
  open,
  onCreateExpense,
  onOpenChange,
}: NewExpenseDrawerProps) {
  const {
    activeProject,
    addCatalogItem,
    addSupplier,
    catalogItems,
    projectExpenses,
    suppliers,
  } = useProject();
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
  const [error, setError] = useState("");

  useEffect(() => {
    setPhaseId(activeProject.phases[0]?.id ?? "");
  }, [activeProject.id, activeProject.phases]);

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
    setError("");
  }

  function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const description = itemName.trim();

    if (!phaseId || !description) {
      setError("Informe fase, fornecedor e nome do item para salvar.");
      return;
    }

    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const shouldContinue = submitter?.value === "continue";
    let finalSupplierId = supplierId;

    if (supplierId === "new") {
      if (!newSupplierName.trim()) {
        setError("Informe o nome do novo fornecedor.");
        return;
      }

      const newSupplier: Supplier = {
        id: `supplier-${Date.now()}`,
        name: newSupplierName.trim(),
        document: newSupplierDocument.trim() || "Documento nao informado",
        category: itemType,
        contact: newSupplierContact.trim() || "Contato nao informado",
        bankInfo: newSupplierBankInfo.trim() || undefined,
      };

      addSupplier(newSupplier);
      finalSupplierId = newSupplier.id;
    }

    if (quantity <= 0 || unitValue <= 0) {
      setError("Quantidade e valor unitario precisam ser maiores que zero.");
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
      addCatalogItem(newItem);
      finalCatalogItemId = newItem.id;
    }

    onCreateExpense({
      id: `exp-${Date.now()}`,
      projectId: activeProject.id,
      phaseId,
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
      hasAttachment: Boolean(attachmentName),
      attachmentName: attachmentName || undefined,
      attachmentSize,
      attachmentType: attachmentType || undefined,
    });

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
          "absolute inset-0 bg-[#111827]/40 transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={() => onOpenChange(false)}
        aria-label="Fechar lancamento"
      />

      <aside
        className={cn(
          "absolute right-0 top-0 flex h-full w-full max-w-4xl flex-col border-l border-blueprint-line bg-[#f7fbff] shadow-soft transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!open}
      >
        <header className="border-b border-blueprint-line bg-blueprint-ink px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-[#B8D9F2]">{activeProject.name}</p>
              <h2 className="mt-1 text-xl font-semibold">Lancar compra</h2>
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
                <section className="rounded-lg border border-blueprint-line bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-blueprint-ink">
                    <Sparkles className="h-4 w-4 text-blueprint-accent" />
                    Item ou servico
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
                        placeholder="Ex: Tela soldada Q138, frete de areia, diaria de gesseiro..."
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
                              : "border-blueprint-line bg-[#f5f9fd] text-blueprint-muted hover:border-blueprint-accent hover:text-blueprint-ink",
                          )}
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>

                    {!catalogItemId && itemName.trim() ? (
                      <label className="flex items-center gap-2 rounded-md bg-[#f5f9fd] px-3 py-2 text-sm text-blueprint-ink">
                        <input
                          type="checkbox"
                          checked={saveToCatalog}
                          onChange={(event) => setSaveToCatalog(event.target.checked)}
                        />
                        Salvar este item no catalogo para proximas compras
                      </label>
                    ) : null}

                    {priceHistory.length ? (
                      <div className="rounded-md border border-blueprint-line bg-[#f8fbff] px-3 py-2 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium text-blueprint-ink">Historico deste item</span>
                          <span className={cn("text-xs font-medium", Math.abs(priceDelta) > 15 ? "text-amber-700" : "text-blueprint-muted")}>
                            ultimo preco {formatCurrency(lastPrice ?? 0)}
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
                  <section className="rounded-lg border border-blueprint-line bg-white p-4 shadow-sm">
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
                      <FieldLabel label="Contato">
                        <Input
                          value={newSupplierContact}
                          onChange={(event) => setNewSupplierContact(event.target.value)}
                          placeholder="WhatsApp ou email"
                        />
                      </FieldLabel>
                      <FieldLabel label="Dados bancarios">
                        <Input
                          value={newSupplierBankInfo}
                          onChange={(event) => setNewSupplierBankInfo(event.target.value)}
                          placeholder="Pix, banco ou agencia/conta"
                        />
                      </FieldLabel>
                    </div>
                  </section>
                ) : null}

                <section className="rounded-lg border border-blueprint-line bg-white p-4 shadow-sm">
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
                    <FieldLabel label="Valor unitario">
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

                <section className="rounded-lg border border-blueprint-line bg-white p-4 shadow-sm">
                  <div className="grid gap-3 md:grid-cols-3">
                    <FieldLabel label="Compra">
                      <Input type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} />
                    </FieldLabel>
                    <FieldLabel label="Pagto fatura">
                      <Input type="date" value={invoicePaymentDate} onChange={(event) => setInvoicePaymentDate(event.target.value)} />
                    </FieldLabel>
                    <FieldLabel label="Pagto loja">
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
                        <option>Cartao</option>
                        <option>A Prazo</option>
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
                <label className="flex items-center gap-3 rounded-lg border border-blueprint-line bg-white p-3 text-sm text-blueprint-ink shadow-sm">
                  <input
                    type="checkbox"
                    checked={sentToAccountant}
                    onChange={(event) => setSentToAccountant(event.target.checked)}
                  />
                  Enviado ao contador/investidor
                </label>

                <label className="flex cursor-pointer items-center justify-center gap-3 rounded-lg border border-dashed border-blueprint-line bg-white px-4 py-4 text-center shadow-sm transition hover:border-blueprint-accent hover:bg-[#eef6fd]">
                  <FileUp className="h-6 w-6 text-blueprint-accent" />
                  <span>
                    <span className="block text-sm font-medium text-blueprint-ink">
                      {attachmentName || "Anexar comprovante"}
                    </span>
                    <span className="block text-xs text-blueprint-muted">
                      {attachmentSize
                        ? `${(attachmentSize / 1024 / 1024).toFixed(2)} MB registrados no prototipo`
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

          <footer className="flex flex-col gap-3 border-t border-blueprint-line bg-white px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-normal text-blueprint-muted">Total do lancamento</p>
              <p className="text-2xl font-semibold text-blueprint-ink">{formatCurrency(total)}</p>
              <p className="text-xs text-blueprint-muted">
                {quantity || 0} {unit} x {formatCurrency(unitValue || 0)}
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="secondary" value="continue">
              <ReceiptText className="h-4 w-4" />
              Salvar e lancar outro
            </Button>
            <Button type="submit" value="close">
              <ReceiptText className="h-4 w-4" />
              Salvar lancamento
            </Button>
            </div>
          </footer>
        </form>
      </aside>
    </div>
  );
}
