export const fmtUsd = (n: number | undefined | null, opts: Intl.NumberFormatOptions = {}) => {
  if (n === undefined || n === null || Number.isNaN(n)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n >= 1 ? 2 : 6,
    ...opts,
  }).format(n);
};

export const fmtCompact = (n: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);

export const fmtPct = (n: number | undefined | null) => {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
};

export const shorten = (addr?: string, chars = 4) =>
  addr ? `${addr.slice(0, 2 + chars)}…${addr.slice(-chars)}` : "";
