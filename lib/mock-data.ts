export type ExpenseType = "Material" | "Mão de Obra" | "Serviço" | "Equipamento";
export type PaymentMethod = "PIX" | "Boleto" | "Cartão" | "A Prazo";
export type ExpenseStatus = "Pago" | "Pendente";
export type ProjectStatus = "Planejamento" | "Obra" | "Pronto" | "Entregue";
export type AgendaEntryType = "Lembrete" | "Anotação" | "Mudança de fase" | "Outro";

export type Phase = {
  id: string;
  name: string;
  budget: number;
};

export type ProjectUnit = {
  id: string;
  identification: string;
  privateArea: number;
  commonArea: number;
  totalArea: number;
};

export type Project = {
  id: string;
  name: string;
  shortName: string;
  address: string;
  description?: string;
  owner: string;
  investor: string;
  budget: number;
  spent: number;
  status: ProjectStatus;
  isActive?: boolean;
  startDate: string;
  landValue?: number;
  acquisitionDate?: string;
  plannedCostPerSquareMeter?: number;
  laborCostPerSquareMeter?: number;
  constructionArea?: number;
  taxRate?: number;
  unitCount?: number;
  units?: ProjectUnit[];
  durationMonths?: number;
  expectedDeliveryDate?: string;
  phases: Phase[];
};

export type Supplier = {
  id: string;
  name: string;
  document: string;
  category: ExpenseType;
  contact: string;
  bankInfo?: string;
};

export type CatalogItem = {
  id: string;
  name: string;
  type: ExpenseType;
  unit: string;
  referencePrice: number;
};

export type Expense = {
  id: string;
  projectId: string;
  phaseId: string;
  date: string;
  purchaseDate: string;
  invoicePaymentDate?: string;
  storePaymentDate?: string;
  invoiceNumber?: string;
  supplierId: string;
  catalogItemId: string;
  description: string;
  type: ExpenseType;
  quantity: number;
  unitValue: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: ExpenseStatus;
  sentToAccountant: boolean;
  hasAttachment: boolean;
  attachmentName?: string;
  attachmentSize?: number;
  attachmentType?: string;
};

export type AgendaEntry = {
  id: string;
  projectId: string;
  date: string;
  type: AgendaEntryType;
  title: string;
  description?: string;
  phaseId?: string;
  createdAt: string;
};

export const projects: Project[] = [
  {
    id: "project-vivaldino",
    name: "Vivaldino Mendes",
    shortName: "Vivaldino",
    address: "Obra residencial - Vivaldino Mendes",
    description: "Empreendimento residencial usado como base para organizar despesas, comprovantes e fechamento mensal.",
    owner: "Dona da obra",
    investor: "Delmar",
    budget: 411332.4,
    spent: 141005.29,
    status: "Obra",
    isActive: true,
    startDate: "2026-03-02",
    landValue: 135000,
    acquisitionDate: "2026-02-20",
    plannedCostPerSquareMeter: 2450,
    laborCostPerSquareMeter: 680,
    constructionArea: 167.89,
    taxRate: 4,
    unitCount: 1,
    units: [
      {
        id: "vivaldino-unidade-1",
        identification: "Casa principal",
        privateArea: 145,
        commonArea: 22.89,
        totalArea: 167.89,
      },
    ],
    durationMonths: 10,
    expectedDeliveryDate: "2026-12-20",
    phases: [
      { id: "vivaldino-terreno", name: "Terreno e terraplanagem", budget: 18000 },
      { id: "vivaldino-fundação", name: "Fundação", budget: 92000 },
      { id: "vivaldino-estrutura", name: "Estrutura", budget: 136000 },
      { id: "vivaldino-alvenaria", name: "Alvenaria", budget: 86500 },
      { id: "vivaldino-administrativo", name: "Administrativo", budget: 12000 },
      { id: "vivaldino-mao-obra", name: "Mão de obra contratada", budget: 393332.4 },
    ],
  },
  {
    id: "project-alpha",
    name: "Edificio Alpha",
    shortName: "Alpha",
    address: "Rua das Palmeiras, 184 - Belo Horizonte",
    description: "Empreendimento multifamiliar em fase de execução estrutural.",
    owner: "Marina Duarte",
    investor: "Grupo MD",
    budget: 720000,
    spent: 284600,
    status: "Obra",
    isActive: true,
    startDate: "2026-02-12",
    landValue: 260000,
    acquisitionDate: "2026-01-10",
    plannedCostPerSquareMeter: 3200,
    laborCostPerSquareMeter: 920,
    constructionArea: 225,
    taxRate: 6,
    unitCount: 6,
    units: Array.from({ length: 6 }, (_, index) => ({
      id: `alpha-unidade-${index + 1}`,
      identification: `Apto ${index + 1}`,
      privateArea: 58,
      commonArea: 8,
      totalArea: 66,
    })),
    durationMonths: 14,
    expectedDeliveryDate: "2027-04-12",
    phases: [
      { id: "alpha-fundação", name: "Fundação", budget: 180000 },
      { id: "alpha-alvenaria", name: "Alvenaria", budget: 240000 },
      { id: "alpha-acabamento", name: "Acabamento", budget: 300000 },
    ],
  },
  {
    id: "project-serena",
    name: "Residencial Vila Serena",
    shortName: "Serena",
    address: "Av. Central, 902 - Contagem",
    description: "Conjunto de sobrados planejado para venda por unidade.",
    owner: "Carolina Reis",
    investor: "Familia Reis",
    budget: 485000,
    spent: 191240,
    status: "Planejamento",
    isActive: true,
    startDate: "2026-06-01",
    landValue: 190000,
    acquisitionDate: "2026-05-08",
    plannedCostPerSquareMeter: 2850,
    laborCostPerSquareMeter: 760,
    constructionArea: 170.18,
    taxRate: 4,
    unitCount: 4,
    units: Array.from({ length: 4 }, (_, index) => ({
      id: `serena-sobrado-${index + 1}`,
      identification: `Sobrado ${index + 1}`,
      privateArea: 82,
      commonArea: 5,
      totalArea: 87,
    })),
    durationMonths: 12,
    expectedDeliveryDate: "2027-06-01",
    phases: [
      { id: "serena-terraplanagem", name: "Terraplanagem", budget: 42000 },
      { id: "serena-estrutura", name: "Estrutura", budget: 210000 },
      { id: "serena-instalacoes", name: "Instalações", budget: 128000 },
    ],
  },
];

export const agendaEntries: AgendaEntry[] = [
  {
    id: "agenda-viv-reuniao-contador",
    projectId: "project-vivaldino",
    date: "2026-03-28",
    type: "Lembrete",
    title: "Separar comprovantes do fechamento",
    description: "Conferir despesas sem anexo antes de exportar o dossiê mensal.",
    createdAt: "2026-03-20T12:00:00.000Z",
  },
  {
    id: "agenda-viv-fase-estrutura",
    projectId: "project-vivaldino",
    date: "2026-03-04",
    type: "Mudança de fase",
    title: "Início da fase de Estrutura",
    description: "Equipe iniciou preparação de ferragens e formas.",
    phaseId: "vivaldino-estrutura",
    createdAt: "2026-03-04T12:00:00.000Z",
  },
];

export const suppliers: Supplier[] = [
  { id: "supplier-armelio", name: "Armelio Ribeiro", document: "CPF não informado", category: "Serviço", contact: "(51) 99900-1122" },
  { id: "supplier-marcelo", name: "Marcelo Terraplanagem", document: "CNPJ não informado", category: "Serviço", contact: "(51) 99821-3300" },
  { id: "supplier-taqi", name: "Taqi", document: "92.012.467/0001-70", category: "Material", contact: "loja@taqi.com.br" },
  { id: "supplier-minuano", name: "Minuano", document: "CNPJ não informado", category: "Material", contact: "vendas@minuano.com.br" },
  { id: "supplier-pedreira", name: "Pedreira Lindenmeier", document: "CNPJ não informado", category: "Material", contact: "(51) 3333-1000" },
  { id: "supplier-nathan", name: "Nathan", document: "CPF não informado", category: "Mão de Obra", contact: "(51) 99920-0303" },
  { id: "supplier-duarte", name: "Madeireira Duarte", document: "CNPJ não informado", category: "Material", contact: "(51) 3339-8800" },
  { id: "supplier-contabilidade", name: "Contabilidade.imob", document: "CNPJ não informado", category: "Serviço", contact: "financeiro@contabilidade.imob" },
  { id: "supplier-lacerda", name: "Lacerda", document: "CNPJ não informado", category: "Material", contact: "(51) 3300-4500" },
  { id: "supplier-joao", name: "Empreiteiro Joao Santos", document: "087.214.456-92", category: "Mão de Obra", contact: "(31) 98824-1102", bankInfo: "Pix CPF 087.214.456-92" },
  { id: "supplier-hidrovale", name: "Hidrovale Instalações", document: "28.551.740/0001-39", category: "Serviço", contact: "notas@hidrovale.com.br" },
];

export const catalogItems: CatalogItem[] = [
  { id: "item-limpeza-terreno", name: "Limpeza de terreno", type: "Serviço", unit: "serviço", referencePrice: 500 },
  { id: "item-terraplanagem", name: "Terraplanagem", type: "Serviço", unit: "hora", referencePrice: 250 },
  { id: "item-pedra-gress", name: "Pedras Gress", type: "Material", unit: "un", referencePrice: 4.5 },
  { id: "item-cimento", name: "Cimento CP II", type: "Material", unit: "saco", referencePrice: 39.9 },
  { id: "item-cimento-cpiv", name: "Cimento CP IV 50kg", type: "Material", unit: "saco", referencePrice: 42.5 },
  { id: "item-argamassa-aciii", name: "Argamassa ACIII 20kg", type: "Material", unit: "saco", referencePrice: 34.9 },
  { id: "item-tijolo-baiano", name: "Tijolo Baiano 9x14x19", type: "Material", unit: "milheiro", referencePrice: 890 },
  { id: "item-bloco-concreto", name: "Bloco de concreto 14x19x39", type: "Material", unit: "un", referencePrice: 4.8 },
  { id: "item-ferro-10", name: "Ferro GG50 10mm 12m Gerdau", type: "Material", unit: "barra", referencePrice: 45.52 },
  { id: "item-ferro-8", name: "Ferro GG50 8mm 12m Gerdau", type: "Material", unit: "barra", referencePrice: 30.43 },
  { id: "item-ferro-5", name: "Ferro CA60 5mm 12m Gerdau", type: "Material", unit: "barra", referencePrice: 13.67 },
  { id: "item-tabua", name: "Tabua Eucalipto 2,5x20x2,75", type: "Material", unit: "un", referencePrice: 12 },
  { id: "item-compensado", name: "Chapa compensada resinada 12mm", type: "Material", unit: "chapa", referencePrice: 118 },
  { id: "item-telha", name: "Telha Eternit 4mm 2,44x0,50", type: "Material", unit: "un", referencePrice: 17.4 },
  { id: "item-brita", name: "Brita", type: "Material", unit: "m3", referencePrice: 210 },
  { id: "item-areia", name: "Areia Bruta", type: "Material", unit: "m3", referencePrice: 105 },
  { id: "item-areia-media", name: "Areia media lavada", type: "Material", unit: "m3", referencePrice: 128 },
  { id: "item-tubo-pvc-100", name: "Tubo PVC esgoto 100mm", type: "Material", unit: "barra", referencePrice: 72.5 },
  { id: "item-conduite", name: "Conduite corrugado 3/4", type: "Material", unit: "rolo", referencePrice: 96 },
  { id: "item-fio-25", name: "Cabo flexivel 2,5mm", type: "Material", unit: "rolo", referencePrice: 229 },
  { id: "item-mao-obra-semanal", name: "Pagamento semanal mão de obra", type: "Mão de Obra", unit: "semana", referencePrice: 4500 },
  { id: "item-diaria-pedreiro", name: "Diária de pedreiro", type: "Mão de Obra", unit: "diária", referencePrice: 260 },
  { id: "item-diaria-servente", name: "Diária de servente", type: "Mão de Obra", unit: "diária", referencePrice: 160 },
  { id: "item-eletricista", name: "Diária de eletricista", type: "Mão de Obra", unit: "diária", referencePrice: 320 },
  { id: "item-instalacao-hidraulica", name: "Serviço de instalação hidráulica", type: "Serviço", unit: "serviço", referencePrice: 2320 },
  { id: "item-instalacao-eletrica", name: "Serviço de instalação elétrica", type: "Serviço", unit: "serviço", referencePrice: 1850 },
  { id: "item-locação-betoneira", name: "Locação de betoneira 400L", type: "Equipamento", unit: "dia", referencePrice: 95 },
  { id: "item-locação-andaime", name: "Locação de andaime", type: "Equipamento", unit: "semana", referencePrice: 380 },
  { id: "item-cacamba", name: "Cacamba de entulho", type: "Equipamento", unit: "un", referencePrice: 420 },
];

export const expenses: Expense[] = [
  {
    id: "exp-viv-001",
    projectId: "project-vivaldino",
    phaseId: "vivaldino-terreno",
    date: "2026-01-26",
    purchaseDate: "2026-01-26",
    invoicePaymentDate: "2026-01-26",
    supplierId: "supplier-armelio",
    catalogItemId: "item-limpeza-terreno",
    description: "Limpeza terreno",
    type: "Serviço",
    quantity: 1,
    unitValue: 500,
    total: 500,
    paymentMethod: "PIX",
    status: "Pago",
    sentToAccountant: true,
    hasAttachment: true,
    attachmentName: "recibo-limpeza-terreno.pdf",
  },
  {
    id: "exp-viv-002",
    projectId: "project-vivaldino",
    phaseId: "vivaldino-terreno",
    date: "2026-01-30",
    purchaseDate: "2026-01-30",
    invoicePaymentDate: "2026-01-30",
    supplierId: "supplier-marcelo",
    catalogItemId: "item-terraplanagem",
    description: "Terraplanagem",
    type: "Serviço",
    quantity: 10,
    unitValue: 250,
    total: 2500,
    paymentMethod: "PIX",
    status: "Pago",
    sentToAccountant: true,
    hasAttachment: true,
    attachmentName: "recibo-terraplanagem.pdf",
  },
  {
    id: "exp-viv-003",
    projectId: "project-vivaldino",
    phaseId: "vivaldino-fundação",
    date: "2026-02-20",
    purchaseDate: "2026-02-20",
    invoicePaymentDate: "2026-02-20",
    supplierId: "supplier-pedreira",
    catalogItemId: "item-pedra-gress",
    description: "Pedras Gress",
    type: "Material",
    quantity: 800,
    unitValue: 4.5,
    total: 3600,
    paymentMethod: "PIX",
    status: "Pago",
    sentToAccountant: true,
    hasAttachment: true,
    attachmentName: "nf-pedras-gress.pdf",
  },
  {
    id: "exp-viv-004",
    projectId: "project-vivaldino",
    phaseId: "vivaldino-fundação",
    date: "2026-02-25",
    purchaseDate: "2026-02-25",
    invoicePaymentDate: "2026-02-25",
    supplierId: "supplier-taqi",
    catalogItemId: "item-cimento",
    description: "Cimento",
    type: "Material",
    quantity: 100,
    unitValue: 39.9,
    total: 3990,
    paymentMethod: "PIX",
    status: "Pago",
    sentToAccountant: true,
    hasAttachment: false,
  },
  {
    id: "exp-viv-005",
    projectId: "project-vivaldino",
    phaseId: "vivaldino-estrutura",
    date: "2026-03-05",
    purchaseDate: "2026-03-05",
    invoicePaymentDate: "2026-04-25",
    storePaymentDate: "2026-03-31",
    invoiceNumber: "18932",
    supplierId: "supplier-minuano",
    catalogItemId: "item-ferro-10",
    description: "Ferro GG50 10mm 12m Gerdau",
    type: "Material",
    quantity: 20,
    unitValue: 45.52,
    total: 910.4,
    paymentMethod: "Cartão",
    status: "Pendente",
    sentToAccountant: true,
    hasAttachment: true,
    attachmentName: "nf-18932-minuano.pdf",
  },
  {
    id: "exp-viv-006",
    projectId: "project-vivaldino",
    phaseId: "vivaldino-estrutura",
    date: "2026-03-05",
    purchaseDate: "2026-03-05",
    invoiceNumber: "18932",
    supplierId: "supplier-minuano",
    catalogItemId: "item-ferro-8",
    description: "Ferro GG50 8mm 12m Gerdau",
    type: "Material",
    quantity: 10,
    unitValue: 30.43,
    total: 304.3,
    paymentMethod: "Cartão",
    status: "Pendente",
    sentToAccountant: false,
    hasAttachment: true,
    attachmentName: "nf-18932-minuano.pdf",
  },
  {
    id: "exp-viv-007",
    projectId: "project-vivaldino",
    phaseId: "vivaldino-estrutura",
    date: "2026-03-06",
    purchaseDate: "2026-03-06",
    invoicePaymentDate: "2026-03-06",
    supplierId: "supplier-duarte",
    catalogItemId: "item-tabua",
    description: "Tabua Eucalipto 2,5x20x2,75",
    type: "Material",
    quantity: 50,
    unitValue: 12,
    total: 600,
    paymentMethod: "PIX",
    status: "Pago",
    sentToAccountant: true,
    hasAttachment: true,
    attachmentName: "nf-madeireira-duarte.jpg",
  },
  {
    id: "exp-viv-008",
    projectId: "project-vivaldino",
    phaseId: "vivaldino-administrativo",
    date: "2026-03-10",
    purchaseDate: "2026-03-10",
    invoicePaymentDate: "2026-03-10",
    supplierId: "supplier-contabilidade",
    catalogItemId: "item-manual",
    description: "Abertura CNPJ",
    type: "Serviço",
    quantity: 1,
    unitValue: 1350,
    total: 1350,
    paymentMethod: "PIX",
    status: "Pago",
    sentToAccountant: true,
    hasAttachment: false,
  },
  {
    id: "exp-viv-009",
    projectId: "project-vivaldino",
    phaseId: "vivaldino-fundação",
    date: "2026-03-13",
    purchaseDate: "2026-03-13",
    invoicePaymentDate: "2026-03-13",
    supplierId: "supplier-lacerda",
    catalogItemId: "item-brita",
    description: "Brita",
    type: "Material",
    quantity: 3,
    unitValue: 210,
    total: 630,
    paymentMethod: "PIX",
    status: "Pago",
    sentToAccountant: true,
    hasAttachment: true,
    attachmentName: "nf-lacerda-brita.pdf",
  },
  {
    id: "exp-viv-010",
    projectId: "project-vivaldino",
    phaseId: "vivaldino-mao-obra",
    date: "2026-03-13",
    purchaseDate: "2026-03-13",
    invoicePaymentDate: "2026-03-13",
    supplierId: "supplier-joao",
    catalogItemId: "item-mao-obra-semanal",
    description: "Pagamento semanal mão de obra",
    type: "Mão de Obra",
    quantity: 1,
    unitValue: 4500,
    total: 4500,
    paymentMethod: "PIX",
    status: "Pago",
    sentToAccountant: true,
    hasAttachment: true,
    attachmentName: "recibo-mao-obra-2026-03-13.pdf",
  },
  {
    id: "exp-viv-011",
    projectId: "project-vivaldino",
    phaseId: "vivaldino-mao-obra",
    date: "2026-03-20",
    purchaseDate: "2026-03-20",
    invoicePaymentDate: "2026-03-20",
    supplierId: "supplier-joao",
    catalogItemId: "item-mao-obra-semanal",
    description: "Pagamento semanal mão de obra",
    type: "Mão de Obra",
    quantity: 1,
    unitValue: 4500,
    total: 4500,
    paymentMethod: "PIX",
    status: "Pago",
    sentToAccountant: true,
    hasAttachment: false,
  },
  {
    id: "exp-alpha-001",
    projectId: "project-alpha",
    phaseId: "alpha-fundação",
    date: "2026-07-03",
    purchaseDate: "2026-07-03",
    invoicePaymentDate: "2026-07-03",
    supplierId: "supplier-taqi",
    catalogItemId: "item-cimento",
    description: "Cimento CP II",
    type: "Material",
    quantity: 120,
    unitValue: 39.9,
    total: 4788,
    paymentMethod: "PIX",
    status: "Pago",
    sentToAccountant: false,
    hasAttachment: true,
    attachmentName: "nf-cimento-alpha.pdf",
  },
  {
    id: "exp-serena-001",
    projectId: "project-serena",
    phaseId: "serena-instalacoes",
    date: "2026-07-16",
    purchaseDate: "2026-07-16",
    supplierId: "supplier-hidrovale",
    catalogItemId: "item-instalacao-hidraulica",
    description: "Serviço de instalação hidráulica",
    type: "Serviço",
    quantity: 1,
    unitValue: 2320,
    total: 2320,
    paymentMethod: "A Prazo",
    status: "Pendente",
    sentToAccountant: false,
    hasAttachment: false,
  },
];
