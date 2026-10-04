/* INR formatting. en-IN grouping, optional sign. No invented precision:
   callers pass decimals explicitly (0 for whole rupees, 2 for prices). */

const inr = (d: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

export const fmtINR = (n: number, d: 0 | 2 = 0): string => inr(d).format(n);

export const fmtSigned = (n: number, d: 0 | 2 = 0): string =>
  `${n > 0 ? "+" : n < 0 ? "−" : ""}${inr(d).format(Math.abs(n))}`;
