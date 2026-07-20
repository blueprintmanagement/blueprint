import * as XLSX from "xlsx-js-style";
import {
  Expense,
  Project,
  projects,
  Supplier,
  suppliers as initialSuppliers,
} from "@/lib/mock-data";

type Worksheet = XLSX.WorkSheet;
type CellStyle = NonNullable<XLSX.CellObject["s"]>;

const colors = {
  ink: "253027",
  accent: "2F5D50",
  clay: "C97B45",
  cream: "F7F5EF",
  line: "D7DED2",
  green: "E2EEE9",
  greenText: "1E4037",
  amber: "FFF0D8",
  amberText: "8A4B15",
  white: "FFFFFF",
  muted: "6D766D",
};

const moneyFormat = '"R$" #,##0.00';
const dateFormat = "dd/mm/yyyy";

function getProjectName(project: Project, projectId: string) {
  if (project.id === projectId) {
    return project.name;
  }

  return projects.find((item) => item.id === projectId)?.name ?? "";
}

function getPhaseName(project: Project, phaseId: string) {
  return project.phases.find((phase) => phase.id === phaseId)?.name ?? "";
}

function getSupplier(supplierId: string, suppliers: Supplier[]) {
  return suppliers.find((supplier) => supplier.id === supplierId);
}

function parseDate(date?: string) {
  return date ? new Date(`${date}T12:00:00`) : "";
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function border(color = colors.line) {
  return {
    top: { style: "thin", color: { rgb: color } },
    bottom: { style: "thin", color: { rgb: color } },
    left: { style: "thin", color: { rgb: color } },
    right: { style: "thin", color: { rgb: color } },
  };
}

const titleStyle: CellStyle = {
  font: { bold: true, sz: 18, color: { rgb: colors.white } },
  fill: { fgColor: { rgb: colors.ink } },
  alignment: { horizontal: "left", vertical: "center" },
};

const subtitleStyle: CellStyle = {
  font: { bold: true, sz: 12, color: { rgb: colors.white } },
  fill: { fgColor: { rgb: colors.ink } },
  alignment: { horizontal: "left", vertical: "center" },
};

const labelStyle: CellStyle = {
  font: { bold: true, color: { rgb: colors.ink } },
  fill: { fgColor: { rgb: colors.cream } },
  alignment: { horizontal: "left", vertical: "center" },
  border: border(),
};

const headerStyle: CellStyle = {
  font: { bold: true, color: { rgb: colors.white } },
  fill: { fgColor: { rgb: colors.accent } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: border(colors.accent),
};

const bodyStyle: CellStyle = {
  font: { color: { rgb: colors.ink } },
  alignment: { vertical: "center", wrapText: true },
  border: {
    bottom: { style: "thin", color: { rgb: colors.line } },
  },
};

const mutedStyle: CellStyle = {
  ...bodyStyle,
  font: { color: { rgb: colors.muted } },
};

const moneyStyle: CellStyle = {
  ...bodyStyle,
  numFmt: moneyFormat,
  alignment: { horizontal: "right", vertical: "center" },
};

const dateStyle: CellStyle = {
  ...bodyStyle,
  numFmt: dateFormat,
  alignment: { horizontal: "center", vertical: "center" },
};

function statusStyle(value: string): CellStyle {
  const isGood = value === "Pago" || value === "OK" || value === "Anexado";
  const isAttention = value === "Pendente" || value === "Faltando";

  return {
    ...bodyStyle,
    font: {
      bold: true,
      color: { rgb: isGood ? colors.greenText : isAttention ? colors.amberText : colors.ink },
    },
    fill: {
      fgColor: { rgb: isGood ? colors.green : isAttention ? colors.amber : colors.cream },
    },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
  };
}

function setCellStyle(sheet: Worksheet, address: string, style: CellStyle) {
  if (!sheet[address]) {
    sheet[address] = { t: "s", v: "" };
  }

  sheet[address].s = style;
}

function getCellAddress(row: number, col: number) {
  return XLSX.utils.encode_cell({ r: row, c: col });
}

function buildCompleteRows({
  expenses,
  project,
  suppliers,
}: {
  expenses: Expense[];
  project: Project;
  suppliers: Supplier[];
}) {
  return expenses.map((expense, index) => {
    const supplier = getSupplier(expense.supplierId, suppliers);
    const expectedAttachment = expense.invoiceNumber
      ? `NF ${expense.invoiceNumber}`
      : `Comprovante ${expense.paymentMethod}`;
    const pendingItems = [
      expense.status === "Pendente" ? "pagamento pendente" : "",
      expense.hasAttachment ? "" : "sem comprovante",
      expense.sentToAccountant ? "" : "nao enviado",
    ].filter(Boolean);

    return [
      index + 1,
      expense.id,
      parseDate(expense.purchaseDate),
      parseDate(expense.invoicePaymentDate),
      parseDate(expense.storePaymentDate),
      expense.invoiceNumber ?? "",
      getProjectName(project, expense.projectId),
      getPhaseName(project, expense.phaseId),
      expense.description,
      expense.catalogItemId,
      supplier?.name ?? "",
      supplier?.document ?? "",
      supplier?.contact ?? "",
      supplier?.bankInfo ?? "",
      expense.type,
      expense.quantity,
      expense.unitValue,
      expense.total,
      expense.paymentMethod,
      expense.status,
      expense.sentToAccountant ? "OK" : "Pendente",
      expense.hasAttachment ? "Anexado" : "Faltando",
      expectedAttachment,
      expense.attachmentName ?? "",
      expense.attachmentSize ? `${(expense.attachmentSize / 1024 / 1024).toFixed(2)} MB` : "",
      expense.attachmentType ?? "",
      pendingItems.length ? pendingItems.join("; ") : "OK",
    ];
  });
}

function styleDossierSheet({
  sheet,
  headerRowIndex,
  rowCount,
  colCount,
}: {
  sheet: Worksheet;
  headerRowIndex: number;
  rowCount: number;
  colCount: number;
}) {
  for (let col = 0; col < colCount; col += 1) {
    setCellStyle(sheet, getCellAddress(headerRowIndex, col), headerStyle);
  }

  const dateCols = [2, 3, 4];
  const moneyCols = [16, 17];
  const numericCols = [0, 15];
  const statusCols = [19, 20, 21, 26];

  for (let row = headerRowIndex + 1; row < headerRowIndex + rowCount + 1; row += 1) {
    for (let col = 0; col < colCount; col += 1) {
      const address = getCellAddress(row, col);
      const cell = sheet[address];

      if (!cell) {
        continue;
      }

      if (dateCols.includes(col)) {
        cell.s = dateStyle;
      } else if (moneyCols.includes(col)) {
        cell.s = moneyStyle;
      } else if (statusCols.includes(col)) {
        cell.s = statusStyle(String(cell.v ?? ""));
      } else if (numericCols.includes(col)) {
        cell.s = {
          ...bodyStyle,
          alignment: { horizontal: "right", vertical: "center" },
        };
      } else {
        cell.s = col === 1 || col === 9 ? mutedStyle : bodyStyle;
      }
    }
  }

  sheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: headerRowIndex, c: 0 },
      e: { r: headerRowIndex + rowCount, c: colCount - 1 },
    }),
  };
}

export function exportMonthlyWorkbook({
  expenses,
  month,
  project,
  suppliers = initialSuppliers,
}: {
  expenses: Expense[];
  month: string;
  project: Project;
  suppliers?: Supplier[];
}) {
  const filteredExpenses = expenses
    .filter((expense) => expense.projectId === project.id && expense.purchaseDate.startsWith(month))
    .sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate));
  const paid = sum(filteredExpenses.filter((expense) => expense.status === "Pago").map((expense) => expense.total));
  const pending = sum(
    filteredExpenses.filter((expense) => expense.status === "Pendente").map((expense) => expense.total),
  );
  const missingAttachments = filteredExpenses.filter((expense) => !expense.hasAttachment).length;
  const notSent = filteredExpenses.filter((expense) => !expense.sentToAccountant).length;
  const total = paid + pending;
  const headerRowIndex = 9;

  const columns = [
    "#",
    "ID Lancamento",
    "Data da Compra",
    "Data Pagto Fatura",
    "Data Pagto Loja",
    "Nota Fiscal",
    "Obra",
    "Fase",
    "Ref / Insumo / Servico",
    "ID Catalogo",
    "Fornecedor",
    "CNPJ/CPF",
    "Contato Fornecedor",
    "Dados Bancarios",
    "Tipo",
    "Quantidade",
    "Valor Uni",
    "Valor",
    "Tipo de Pagto",
    "Status",
    "Enviado Contador",
    "Comprovante",
    "Comprovante Esperado",
    "Arquivo Anexo",
    "Tamanho Anexo",
    "Tipo Anexo",
    "Pendencia",
  ];
  const data = [
    ["Blueprint", ...Array(columns.length - 1).fill("")],
    ["Dossie completo de despesas", ...Array(columns.length - 1).fill("")],
    [],
    ["Obra", project.name, "Mes", month, "Investidor", project.investor, "Responsavel", project.owner],
    ["Total Lancado", total, "Pago", paid, "Pendente", pending, "Lancamentos", filteredExpenses.length],
    ["Sem Comprovante", missingAttachments, "Nao Enviado", notSent, "Gerado em", new Date(), "Status Obra", project.status],
    [],
    ["Observacao", "Esta aba consolida todos os lancamentos do mes, um por linha, com todos os dados necessarios para contador e investidor."],
    [],
    columns,
    ...buildCompleteRows({ expenses: filteredExpenses, project, suppliers }),
  ];

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(data);

  workbook.Props = {
    Title: `Blueprint - Dossie Completo ${project.name} ${month}`,
    Subject: "Dossie mensal completo de despesas de obra",
    Author: "Blueprint",
    CreatedDate: new Date(),
  };

  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: columns.length - 1 } },
    { s: { r: 7, c: 1 }, e: { r: 7, c: columns.length - 1 } },
  ];
  sheet["!cols"] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 15 },
    { wch: 18 },
    { wch: 16 },
    { wch: 12 },
    { wch: 24 },
    { wch: 26 },
    { wch: 34 },
    { wch: 18 },
    { wch: 28 },
    { wch: 18 },
    { wch: 22 },
    { wch: 22 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 18 },
    { wch: 14 },
    { wch: 24 },
    { wch: 30 },
    { wch: 14 },
    { wch: 18 },
    { wch: 30 },
  ];
  sheet["!rows"] = [
    { hpt: 30 },
    { hpt: 22 },
    { hpt: 8 },
    { hpt: 24 },
    { hpt: 24 },
    { hpt: 24 },
    { hpt: 8 },
    { hpt: 28 },
    { hpt: 8 },
    { hpt: 42 },
  ];

  setCellStyle(sheet, "A1", titleStyle);
  setCellStyle(sheet, "A2", subtitleStyle);
  ["A4", "C4", "E4", "G4", "A5", "C5", "E5", "G5", "A6", "C6", "E6", "G6", "A8"].forEach((cell) =>
    setCellStyle(sheet, cell, labelStyle),
  );
  ["B5", "D5", "F5"].forEach((cell) => {
    if (sheet[cell]) sheet[cell].s = moneyStyle;
  });
  ["F6"].forEach((cell) => {
    if (sheet[cell]) sheet[cell].s = dateStyle;
  });
  ["B6", "D6", "H5"].forEach((cell) => {
    if (sheet[cell]) {
      sheet[cell].s = {
        ...bodyStyle,
        alignment: { horizontal: "right", vertical: "center" },
      };
    }
  });

  styleDossierSheet({
    sheet,
    headerRowIndex,
    rowCount: filteredExpenses.length,
    colCount: columns.length,
  });

  XLSX.utils.book_append_sheet(workbook, sheet, "Dossie Completo");
  XLSX.writeFile(workbook, `Blueprint - Dossie Completo ${project.shortName} - ${month}.xlsx`, {
    compression: true,
  });
}
