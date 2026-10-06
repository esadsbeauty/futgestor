export const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
export const formatDate = (value: string | Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(value));
export const formatMonthYear = (value: string | Date) => { const result = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(value)); return result[0].toUpperCase() + result.slice(1); };
export const firstName = (name?: string | null) => name?.trim().split(/\s+/)[0] || "gestor";
export const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
