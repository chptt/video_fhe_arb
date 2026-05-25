/**
 * lib/pricing.ts
 * BTC/USD conversion utilities for revenue cap enforcement.
 */

import { BTC_USD_FALLBACK, REVENUE_CAP_USD, PLATFORM_FEE_PERCENTAGE } from "./constants";

/** Fetch live BTC/USD price from CoinGecko (server-side only). Falls back to env var. */
export async function getBtcUsdPrice(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      { next: { revalidate: 300 } } // cache 5 min in Next.js
    );
    if (!res.ok) throw new Error("CoinGecko fetch failed");
    const data = await res.json();
    return data?.bitcoin?.usd ?? BTC_USD_FALLBACK;
  } catch {
    return BTC_USD_FALLBACK;
  }
}

/** Convert wei to USD using provided BTC price */
export function weiToUsd(weiAmount: bigint, btcUsdPrice: number): number {
  const btc = Number(weiAmount) / 1e18;
  return btc * btcUsdPrice;
}

/** Convert USD to wei using provided BTC price */
export function usdToWei(usdAmount: number, btcUsdPrice: number): bigint {
  const btc = usdAmount / btcUsdPrice;
  return BigInt(Math.floor(btc * 1e18));
}

/** Revenue cap in wei given current BTC price */
export function revenueCapWei(btcUsdPrice: number): bigint {
  return usdToWei(REVENUE_CAP_USD, btcUsdPrice);
}

/** Calculate creator earnings and platform fee from gross revenue */
export function splitRevenue(grossWei: bigint): { creatorWei: bigint; platformWei: bigint } {
  const platformWei = (grossWei * BigInt(PLATFORM_FEE_PERCENTAGE)) / 100n;
  const creatorWei  = grossWei - platformWei;
  return { creatorWei, platformWei };
}

/** Format wei as BTC string with 8 decimal places */
export function formatBtc(weiAmount: bigint): string {
  const btc = Number(weiAmount) / 1e18;
  return btc.toFixed(8);
}

/** Format wei as USD string */
export function formatUsd(weiAmount: bigint, btcUsdPrice: number): string {
  return weiToUsd(weiAmount, btcUsdPrice).toFixed(2);
}

/** Percentage of revenue cap consumed (0–100) */
export function revenueCapPercent(totalRevenueWei: bigint, capWei: bigint): number {
  if (capWei === 0n) return 100;
  const pct = (Number(totalRevenueWei) / Number(capWei)) * 100;
  return Math.min(100, pct);
}
