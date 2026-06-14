import type { AgriculturalCategory } from "../domain/enums.js";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

const categoryLabels: Record<AgriculturalCategory, string> = {
  seeds: "sementes",
  fertilizers: "fertilizantes",
  defensives: "defensivos",
  fuel: "combustível",
  machinery: "máquinas",
  maintenance: "manutenção",
  labor: "mão de obra",
  freight: "frete",
  lease: "arrendamento",
  irrigation: "irrigação",
  energy: "energia",
  insurance: "seguro",
  outsourced_services: "serviços terceirizados",
  food: "alimentação",
  other: "outra"
};

export function formatMoneyBRL(cents: number): string {
  return currencyFormatter.format(Math.round(cents) / 100).replace(/\u00a0/g, " ");
}

export function formatPercentBR(value: number): string {
  return `${percentFormatter.format(value)}%`;
}

export function formatAgriculturalCategory(category: AgriculturalCategory): string {
  return categoryLabels[category];
}
