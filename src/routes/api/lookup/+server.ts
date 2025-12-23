import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { calculateGrowthIndex, interpretGrowthIndex } from "$lib/growth-index";

const BASE = "https://www.alphavantage.co/query";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

let currentApiKey = "";

async function fetchAV(fn: string, ticker: string): Promise<any> {
  if (!currentApiKey) throw new Error("Alpha Vantage API key not provided");

  const url = `${BASE}?function=${fn}&symbol=${ticker}&apikey=${currentApiKey}`;
  console.log(`[AV] ${fn} ${ticker}`);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Alpha Vantage ${res.status}`);

  const data = await res.json();
  if (data["Error Message"]) throw new Error(data["Error Message"]);
  if (data["Note"] || data["Information"])
    throw new Error("Rate limit - wait 60s");

  return data;
}

function calcCAGR(start: number, end: number, years: number): number {
  if (years <= 0 || start === 0) return 0;
  if (start < 0 && end > 0)
    return (((end - start) / Math.abs(start)) * 100) / years;
  if (start > 0 && end < 0) return (((end - start) / start) * 100) / years;
  if (start < 0 && end < 0)
    return (
      (((Math.abs(start) - Math.abs(end)) / Math.abs(start)) * 100) / years
    );
  return (Math.pow(end / start, 1 / years) - 1) * 100;
}

function calcYoY(prev: number, curr: number): number {
  if (prev === 0) return 0;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

function estimateWACC(beta: number): number {
  const rf = 4.5,
    mrp = 5.5;
  return rf + Math.max(0.5, Math.min(2.5, beta || 1)) * mrp;
}

async function fetchCompanyData(ticker: string) {
  const incomeData = await fetchAV("INCOME_STATEMENT", ticker);
  await delay(1000);
  const cashFlowData = await fetchAV("CASH_FLOW", ticker);
  await delay(1000);
  const overview = await fetchAV("OVERVIEW", ticker);

  const income = incomeData.annualReports;
  const cashFlow = cashFlowData.annualReports;

  if (!income?.length) throw new Error(`No income data for ${ticker}`);
  if (income.length < 4)
    throw new Error(`Need 4yr data for ${ticker}, got ${income.length}`);
  if (!cashFlow?.length || cashFlow.length < 4)
    throw new Error(`Need 4yr cash flow for ${ticker}`);

  const y0 = income[0],
    y1 = income[1],
    y2 = income[2],
    y3 = income[3];
  const cf0 = cashFlow[0],
    cf3 = cashFlow[3];

  const rev = (y: any) => parseFloat(y.totalRevenue) || 0;
  const opInc = (y: any) => parseFloat(y.operatingIncome) || 0;
  const eps = (y: any) => parseFloat(y.reportedEPS) || 0;
  const fcf = (c: any) =>
    (parseFloat(c.operatingCashflow) || 0) -
    Math.abs(parseFloat(c.capitalExpenditures) || 0);

  const revenueCagr = calcCAGR(rev(y3), rev(y0), 3);
  const epsCagr = calcCAGR(eps(y3), eps(y0), 3);
  const fcfCagr = calcCAGR(fcf(cashFlow[3]), fcf(cashFlow[0]), 3);

  const margin0 = rev(y0) > 0 ? (opInc(y0) / rev(y0)) * 100 : 0;
  const margin3 = rev(y3) > 0 ? (opInc(y3) / rev(y3)) * 100 : 0;
  const marginDelta = margin0 - margin3;

  const annualRevenueGrowth = [
    calcYoY(rev(y3), rev(y2)),
    calcYoY(rev(y2), rev(y1)),
    calcYoY(rev(y1), rev(y0)),
  ];

  const roic = parseFloat(overview.ReturnOnEquityTTM) * 100 || 15;
  const wacc = estimateWACC(parseFloat(overview.Beta) || 1);

  console.log(`[GI] ${ticker}:`, {
    revenueCagr,
    epsCagr,
    fcfCagr,
    marginDelta,
    roic,
    wacc,
  });

  const gi = calculateGrowthIndex({
    revenueCagr,
    epsCagr,
    fcfCagr,
    marginDelta,
    annualRevenueGrowth,
    roic,
    wacc,
  });

  return {
    ticker: ticker.toUpperCase(),
    name: overview.Name || ticker,
    growthIndex: gi.growthIndex,
    baseScore: gi.baseScore,
    consistencyFactor: gi.consistencyFactor,
    qualityFactor: gi.qualityFactor,
    metrics: {
      revenueCagr: Math.round(revenueCagr * 10) / 10,
      epsCagr: Math.round(epsCagr * 10) / 10,
      fcfCagr: Math.round(fcfCagr * 10) / 10,
      marginDelta: Math.round(marginDelta * 10) / 10,
      roic: Math.round(roic * 10) / 10,
      wacc: Math.round(wacc * 10) / 10,
    },
    interpretation: interpretGrowthIndex(gi.growthIndex),
  };
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { tickers, apiKey } = await request.json();
    if (!tickers?.length)
      return json({ success: false, error: "No tickers" }, { status: 400 });
    if (!apiKey)
      return json({ success: false, error: "Alpha Vantage API key required" }, { status: 400 });

    currentApiKey = apiKey;

    const results = [];
    for (const t of tickers.slice(0, 5)) {
      try {
        const data = await fetchCompanyData(t.trim().toUpperCase());
        results.push(data);
      } catch (e: any) {
        console.error(`[GI] ${t}:`, e.message);
        results.push({ ticker: t.toUpperCase(), error: e.message });
      }
    }

    const ok = results.filter((r) => !("error" in r));
    if (!ok.length) {
      return json(
        { success: false, error: results.map((r: any) => r.error).join("; ") },
        { status: 400 },
      );
    }
    return json({ success: true, data: ok });
  } catch (e: any) {
    return json({ success: false, error: e.message }, { status: 500 });
  }
};
