export function displayText(value: string) {
  const dictionary: Record<string, string> = {
    "Mão de Obra": "Mão de Obra",
    Serviço: "Serviço",
    Cartão: "Cartão",
    Fundação: "Fundação",
    "Mão de obra contratada": "Mão de obra contratada",
    "CNPJ não informado": "CNPJ não informado",
    "CPF não informado": "CPF não informado",
    "Documento não informado": "Documento não informado",
    "Contato não informado": "Contato não informado",
  };

  return dictionary[value] ?? value;
}

export function displayMonthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthNumber - 1, 1, 12));

  return label.charAt(0).toUpperCase() + label.slice(1);
}
