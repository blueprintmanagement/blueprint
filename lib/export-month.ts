import {
  Expense,
  Project,
  Supplier,
  suppliers as initialSuppliers,
} from "@/lib/mock-data";
import { displayMonthLabel, displayText } from "@/lib/display";

type CellValue = string | number | Date;

type Cell = {
  value: CellValue;
  style?: number;
  type?: "number" | "date" | "string";
};

type ZipFile = {
  name: string;
  content: string | Uint8Array;
};

const style = {
  title: 1,
  subtitle: 2,
  label: 3,
  header: 4,
  body: 5,
  money: 6,
  date: 7,
  good: 8,
  attention: 9,
  numeric: 10,
};

const encoder = new TextEncoder();

function getSupplier(supplierId: string, suppliers: Supplier[]) {
  return suppliers.find((supplier) => supplier.id === supplierId);
}

function parseDate(date?: string) {
  return date ? new Date(`${date}T12:00:00`) : "";
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function escapeXml(value: CellValue) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function columnName(index: number) {
  let name = "";
  let current = index + 1;

  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }

  return name;
}

function excelDate(date: Date) {
  const epoch = Date.UTC(1899, 11, 30);
  return (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - epoch) / 86400000;
}

function cellXml(cell: Cell, rowIndex: number, colIndex: number) {
  const ref = `${columnName(colIndex)}${rowIndex + 1}`;
  const styleAttribute = cell.style ? ` s="${cell.style}"` : "";

  if (cell.value instanceof Date || cell.type === "date") {
    const value = cell.value instanceof Date ? excelDate(cell.value) : "";
    return `<c r="${ref}"${styleAttribute}><v>${value}</v></c>`;
  }

  if (cell.type === "number" || typeof cell.value === "number") {
    return `<c r="${ref}"${styleAttribute}><v>${cell.value}</v></c>`;
  }

  return `<c r="${ref}" t="inlineStr"${styleAttribute}><is><t>${escapeXml(cell.value)}</t></is></c>`;
}

function rowXml(row: Cell[], rowIndex: number) {
  const cells = row.map((cell, colIndex) => cellXml(cell, rowIndex, colIndex)).join("");
  return `<row r="${rowIndex + 1}">${cells}</row>`;
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function dateToDos(date = new Date()) {
  const time =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const day =
    ((date.getFullYear() - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();

  return { day, time };
}

function writeUint16(target: number[], value: number) {
  target.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeUint32(target: number[], value: number) {
  target.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function createZip(files: ZipFile[]) {
  const output: number[] = [];
  const central: number[] = [];
  const { day, time } = dateToDos();

  files.forEach((file) => {
    const content = typeof file.content === "string" ? encoder.encode(file.content) : file.content;
    const name = encoder.encode(file.name);
    const offset = output.length;
    const crc = crc32(content);

    writeUint32(output, 0x04034b50);
    writeUint16(output, 20);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint16(output, time);
    writeUint16(output, day);
    writeUint32(output, crc);
    writeUint32(output, content.length);
    writeUint32(output, content.length);
    writeUint16(output, name.length);
    writeUint16(output, 0);
    output.push(...name, ...content);

    writeUint32(central, 0x02014b50);
    writeUint16(central, 20);
    writeUint16(central, 20);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, time);
    writeUint16(central, day);
    writeUint32(central, crc);
    writeUint32(central, content.length);
    writeUint32(central, content.length);
    writeUint16(central, name.length);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint32(central, 0);
    writeUint32(central, offset);
    central.push(...name);
  });

  const centralOffset = output.length;
  output.push(...central);

  writeUint32(output, 0x06054b50);
  writeUint16(output, 0);
  writeUint16(output, 0);
  writeUint16(output, files.length);
  writeUint16(output, files.length);
  writeUint32(output, central.length);
  writeUint32(output, centralOffset);
  writeUint16(output, 0);

  return new Uint8Array(output);
}

function downloadFile(fileName: string, bytes: Uint8Array) {
  const fileBytes = new Uint8Array(bytes);
  const arrayBuffer = fileBytes.buffer.slice(
    fileBytes.byteOffset,
    fileBytes.byteOffset + fileBytes.byteLength,
  );
  const url = URL.createObjectURL(
    new Blob([arrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();

  window.setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 1000);
}

function buildCompleteRows({
  expenses,
  suppliers,
}: {
  expenses: Expense[];
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
      expense.sentToAccountant ? "" : "não enviado",
    ].filter(Boolean);

    return [
      { value: index + 1, style: style.numeric, type: "number" },
      { value: parseDate(expense.purchaseDate), style: style.date, type: "date" },
      { value: parseDate(expense.invoicePaymentDate), style: style.date, type: "date" },
      { value: parseDate(expense.storePaymentDate), style: style.date, type: "date" },
      { value: expense.invoiceNumber ?? "", style: style.body },
      { value: displayText(expense.description), style: style.body },
      { value: supplier?.name ?? "", style: style.body },
      { value: displayText(expense.type), style: style.body },
      { value: expense.quantity, style: style.numeric, type: "number" },
      { value: expense.unitValue, style: style.money, type: "number" },
      { value: expense.total, style: style.money, type: "number" },
      { value: displayText(expense.paymentMethod), style: style.body },
      { value: expense.status, style: expense.status === "Pago" ? style.good : style.attention },
      { value: expense.sentToAccountant ? "OK" : "Pendente", style: expense.sentToAccountant ? style.good : style.attention },
      { value: expense.hasAttachment ? "Anexado" : "Faltando", style: expense.hasAttachment ? style.good : style.attention },
      { value: expectedAttachment, style: style.body },
      { value: expense.attachmentName ?? "", style: style.body },
      {
        value: expense.attachmentSize ? `${(expense.attachmentSize / 1024 / 1024).toFixed(2)} MB` : "",
        style: style.body,
      },
      { value: expense.attachmentType ?? "", style: style.body },
      { value: pendingItems.length ? pendingItems.join("; ") : "OK", style: pendingItems.length ? style.attention : style.good },
    ] satisfies Cell[];
  });
}

function createSheetXml(rows: Cell[][], rowCount: number, colCount: number) {
  const lastCell = `${columnName(colCount - 1)}${rows.length}`;
  const cols = [6, 15, 18, 16, 12, 34, 28, 14, 12, 12, 12, 14, 12, 18, 14, 24, 30, 14, 18, 30]
    .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
    .join("");
  const merges = [
    '<mergeCell ref="A1:T1"/>',
    '<mergeCell ref="A2:T2"/>',
    '<mergeCell ref="B8:T8"/>',
  ].join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:${lastCell}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="10" topLeftCell="A11" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>${cols}</cols>
  <sheetData>${rows.map(rowXml).join("")}</sheetData>
  <mergeCells count="3">${merges}</mergeCells>
  <autoFilter ref="A10:T${10 + rowCount}"/>
</worksheet>`;
}

function workbookFiles(sheetXml: string, title: string) {
  const createdAt = new Date().toISOString();

  return [
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`,
    },
    {
      name: "docProps/core.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(title)}</dc:title>
  <dc:creator>Blueprint</dc:creator>
  <cp:lastModifiedBy>Blueprint</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:modified>
</cp:coreProperties>`,
    },
    {
      name: "docProps/app.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Blueprint</Application>
</Properties>`,
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Dossiê Completo" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    {
      name: "xl/styles.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;R$&quot; #,##0.00"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/></numFmts>
  <fonts count="6"><font><color rgb="253027"/></font><font><b/><sz val="18"/><color rgb="FFFFFF"/></font><font><b/><sz val="12"/><color rgb="FFFFFF"/></font><font><b/><color rgb="253027"/></font><font><b/><color rgb="FFFFFF"/></font><font><b/><color rgb="1E4037"/></font></fonts>
  <fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="253027"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="F7F5EF"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="2F5D50"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF0D8"/></patternFill></fill></fills>
  <borders count="3"><border/><border><left style="thin"><color rgb="D7DED2"/></left><right style="thin"><color rgb="D7DED2"/></right><top style="thin"><color rgb="D7DED2"/></top><bottom style="thin"><color rgb="D7DED2"/></bottom></border><border><bottom style="thin"><color rgb="D7DED2"/></bottom></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="11">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="4" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="2" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="5" fillId="3" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="5" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="2" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
  </cellXfs>
</styleSheet>`,
    },
    {
      name: "xl/worksheets/sheet1.xml",
      content: sheetXml,
    },
  ] satisfies ZipFile[];
}

function exportDossierWorkbook({
  expenses,
  periodLabel,
  project,
  suppliers = initialSuppliers,
  fileSuffix,
}: {
  expenses: Expense[];
  periodLabel: string;
  project: Project;
  suppliers?: Supplier[];
  fileSuffix: string;
}) {
  const filteredExpenses = expenses
    .filter((expense) => expense.projectId === project.id)
    .sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate));

  if (filteredExpenses.length === 0) {
    throw new Error("Nenhum lançamento encontrado para exportar neste período.");
  }

  const paid = sum(filteredExpenses.filter((expense) => expense.status === "Pago").map((expense) => expense.total));
  const pending = sum(
    filteredExpenses.filter((expense) => expense.status === "Pendente").map((expense) => expense.total),
  );
  const missingAttachments = filteredExpenses.filter((expense) => !expense.hasAttachment).length;
  const notSent = filteredExpenses.filter((expense) => !expense.sentToAccountant).length;
  const total = paid + pending;
  const columns = [
    "#",
    "Data da Compra",
    "Data Pgto Fatura",
    "Data Pgto Loja",
    "Nota Fiscal",
    "Ref / Insumo / Serviço",
    "Fornecedor",
    "Tipo",
    "Quantidade",
    "Valor Uni",
    "Valor",
    "Tipo de Pgto",
    "Status",
    "Enviado Contador",
    "Comprovante",
    "Comprovante Esperado",
    "Arquivo Anexo",
    "Tamanho Anexo",
    "Tipo Anexo",
    "Pendência",
  ];
  const rows: Cell[][] = [
    [{ value: "Blueprint", style: style.title }, ...Array(columns.length - 1).fill({ value: "", style: style.title })],
    [{ value: "Dossiê completo de despesas", style: style.subtitle }, ...Array(columns.length - 1).fill({ value: "", style: style.subtitle })],
    [],
    [
      { value: "Empreendimento", style: style.label },
      { value: project.name, style: style.body },
      { value: "Período", style: style.label },
      { value: periodLabel, style: style.body },
      { value: "Investidor", style: style.label },
      { value: project.investor, style: style.body },
      { value: "Responsável", style: style.label },
      { value: project.owner, style: style.body },
    ],
    [
      { value: "Total Lançado", style: style.label },
      { value: total, style: style.money, type: "number" },
      { value: "Pago", style: style.label },
      { value: paid, style: style.money, type: "number" },
      { value: "Pendente", style: style.label },
      { value: pending, style: style.money, type: "number" },
      { value: "Lançamentos", style: style.label },
      { value: filteredExpenses.length, style: style.numeric, type: "number" },
    ],
    [
      { value: "Sem Comprovante", style: style.label },
      { value: missingAttachments, style: style.numeric, type: "number" },
      { value: "Não Enviado", style: style.label },
      { value: notSent, style: style.numeric, type: "number" },
      { value: "Gerado em", style: style.label },
      { value: new Date(), style: style.date, type: "date" },
      { value: "Status Empreendimento", style: style.label },
      { value: project.status, style: style.body },
    ],
    [],
    [
      { value: "Observação", style: style.label },
      {
        value: "Esta aba consolida todos os lançamentos do período, um por linha, com todos os dados necessários para contador e investidor.",
        style: style.body,
      },
    ],
    [],
    columns.map((column) => ({ value: column, style: style.header })),
    ...buildCompleteRows({ expenses: filteredExpenses, suppliers }),
  ];
  const sheetXml = createSheetXml(rows, filteredExpenses.length, columns.length);
  const title = `Blueprint - Dossiê Completo ${project.name} ${periodLabel}`;

  downloadFile(
    `Blueprint - Dossiê Completo ${project.shortName} - ${fileSuffix}.xlsx`,
    createZip(workbookFiles(sheetXml, title)),
  );
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
  exportDossierWorkbook({
    expenses: expenses.filter((expense) => expense.purchaseDate.startsWith(month)),
    fileSuffix: month,
    periodLabel: displayMonthLabel(month),
    project,
    suppliers,
  });
}

export function exportCompleteWorkbook({
  expenses,
  project,
  suppliers = initialSuppliers,
}: {
  expenses: Expense[];
  project: Project;
  suppliers?: Supplier[];
}) {
  exportDossierWorkbook({
    expenses,
    fileSuffix: "Todos os meses",
    periodLabel: "Todos os meses",
    project,
    suppliers,
  });
}
