import { ExpenseType, PaymentMethod } from "@/lib/mock-data";

export type ImportedNfeItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitValue: number;
  total: number;
};

export type ImportedNfe = {
  accessKey?: string;
  emittedAt: string;
  invoiceNumber: string;
  paymentMethod: PaymentMethod;
  supplierDocument: string;
  supplierName: string;
  total: number;
  type: ExpenseType;
  items: ImportedNfeItem[];
};

function byLocalName(parent: Element | Document, name: string) {
  return Array.from(parent.getElementsByTagName("*")).filter((element) => element.localName === name);
}

function firstText(parent: Element | Document, name: string) {
  return byLocalName(parent, name)[0]?.textContent?.trim() ?? "";
}

function numberFromXml(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateFromXml(value: string) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  return value.slice(0, 10);
}

function mapPaymentMethod(code: string): PaymentMethod {
  const normalized = code.trim();

  if (["03", "04"].includes(normalized)) {
    return "Cartão";
  }

  if (normalized === "15") {
    return "Boleto";
  }

  if (normalized === "17") {
    return "PIX";
  }

  return "A Prazo";
}

function cleanDocument(value: string) {
  return value.replace(/\D/g, "");
}

export function parseNfeXml(xmlText: string): ImportedNfe {
  if (/<!doctype|<!entity/i.test(xmlText)) {
    throw new Error("XML com declarações não permitidas.");
  }

  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, "application/xml");
  const parserError = xml.getElementsByTagName("parsererror")[0];

  if (parserError) {
    throw new Error("Não foi possível ler o XML. Confira se o arquivo é uma NF-e válida.");
  }

  const infNfe = byLocalName(xml, "infNFe")[0];
  const emit = byLocalName(xml, "emit")[0];
  const ide = byLocalName(xml, "ide")[0];
  const total = byLocalName(xml, "ICMSTot")[0];

  if (!infNfe || !emit || !ide) {
    throw new Error("XML sem estrutura de NF-e reconhecida.");
  }

  const items = byLocalName(xml, "det").map((det, index) => {
    const prod = byLocalName(det, "prod")[0] ?? det;
    const totalValue = numberFromXml(firstText(prod, "vProd"));
    const quantity = numberFromXml(firstText(prod, "qCom")) || 1;

    return {
      id: firstText(prod, "cProd") || `xml-item-${index + 1}`,
      name: firstText(prod, "xProd") || `Item ${index + 1}`,
      quantity,
      unit: firstText(prod, "uCom") || "un",
      unitValue: numberFromXml(firstText(prod, "vUnCom")) || totalValue / quantity,
      total: totalValue,
    };
  });

  const invoiceTotal = numberFromXml(firstText(total ?? xml, "vNF")) || items.reduce((sum, item) => sum + item.total, 0);
  const supplierDocument = cleanDocument(firstText(emit, "CNPJ") || firstText(emit, "CPF"));
  const accessKey = infNfe.getAttribute("Id")?.replace(/^NFe/, "");

  return {
    accessKey,
    emittedAt: dateFromXml(firstText(ide, "dhEmi") || firstText(ide, "dEmi")),
    invoiceNumber: firstText(ide, "nNF"),
    paymentMethod: mapPaymentMethod(firstText(xml, "tPag")),
    supplierDocument,
    supplierName: firstText(emit, "xNome") || "Fornecedor da NF-e",
    total: invoiceTotal,
    type: "Material",
    items,
  };
}
