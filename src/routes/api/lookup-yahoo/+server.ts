import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { calculateGrowthIndex, interpretGrowthIndex } from "$lib/growth-index";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

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

function formatMarketCap(value: number): string {
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  return value.toFixed(0);
}

async function fetchCompanyData(ticker: string) {
  console.log(`[YF] Fetching ${ticker}`);

  // Fetch summary data and historical prices in parallel
  const [summary, historical] = await Promise.all([
    yahooFinance.quoteSummary(ticker, {
      modules: [
        "incomeStatementHistory",
        "cashflowStatementHistory",
        "defaultKeyStatistics",
        "financialData",
        "price",
        "summaryProfile",
        "summaryDetail",
      ],
    }),
    yahooFinance.chart(ticker, {
      period1: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      period2: new Date().toISOString().split('T')[0],
      interval: "1d",
    }).catch(() => null),
  ]);

  const income = summary.incomeStatementHistory?.incomeStatementHistory;
  const cashFlow = summary.cashflowStatementHistory?.cashflowStatements;
  const stats = summary.defaultKeyStatistics;
  const financials = summary.financialData;
  const price = summary.price;
  const profile = summary.summaryProfile;
  const detail = summary.summaryDetail;

  if (!income?.length) throw new Error(`No income data for ${ticker}`);
  if (income.length < 4)
    throw new Error(`Need 4yr data for ${ticker}, got ${income.length}`);
  if (!cashFlow?.length || cashFlow.length < 4)
    throw new Error(`Need 4yr cash flow for ${ticker}`);

  const y0 = income[0],
    y1 = income[1],
    y2 = income[2],
    y3 = income[3];

  const rev = (y: any) => y.totalRevenue || 0;
  const opInc = (y: any) => y.operatingIncome || 0;
  const eps = (y: any) => {
    if (y.netIncome && y.netIncome !== 0) {
      return y.netIncome;
    }
    return 0;
  };
  const fcf = (c: any) =>
    (c.totalCashFromOperatingActivities || 0) -
    Math.abs(c.capitalExpenditures || 0);

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

  // Historical revenue data for chart
  const revenueHistory = income.slice(0, 4).reverse().map((y: any, i: number) => ({
    year: new Date(y.endDate).getFullYear(),
    revenue: rev(y),
    operatingIncome: opInc(y),
    netIncome: eps(y),
  }));

  const beta = stats?.beta || 1;
  const roic = (financials?.returnOnEquity || 0.15) * 100;
  const wacc = estimateWACC(beta);

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

  // Process price history for chart
  const priceHistory: { time: string; value: number }[] = [];
  if (historical?.quotes) {
    for (const q of historical.quotes) {
      if (q.date && q.close) {
        priceHistory.push({
          time: new Date(q.date).toISOString().split('T')[0],
          value: q.close,
        });
      }
    }
  }

  // Calculate price change
  const currentPrice = price?.regularMarketPrice || 0;
  const previousClose = price?.regularMarketPreviousClose || currentPrice;
  const priceChange = currentPrice - previousClose;
  const priceChangePercent = previousClose > 0 ? (priceChange / previousClose) * 100 : 0;

  // 52-week performance
  const fiftyTwoWeekHigh = detail?.fiftyTwoWeekHigh || 0;
  const fiftyTwoWeekLow = detail?.fiftyTwoWeekLow || 0;
  const fromHigh = fiftyTwoWeekHigh > 0 ? ((currentPrice - fiftyTwoWeekHigh) / fiftyTwoWeekHigh) * 100 : 0;
  const fromLow = fiftyTwoWeekLow > 0 ? ((currentPrice - fiftyTwoWeekLow) / fiftyTwoWeekLow) * 100 : 0;

  return {
    ticker: ticker.toUpperCase(),
    name: price?.longName || price?.shortName || ticker,
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
    // New extended data
    company: {
      sector: profile?.sector || "N/A",
      industry: profile?.industry || "N/A",
      employees: profile?.fullTimeEmployees || 0,
      website: profile?.website || "",
      description: profile?.longBusinessSummary?.slice(0, 300) || "",
    },
    market: {
      price: currentPrice,
      change: Math.round(priceChange * 100) / 100,
      changePercent: Math.round(priceChangePercent * 100) / 100,
      marketCap: formatMarketCap(price?.marketCap || 0),
      volume: price?.regularMarketVolume || 0,
      avgVolume: detail?.averageVolume || 0,
      fiftyTwoWeekHigh,
      fiftyTwoWeekLow,
      fromHigh: Math.round(fromHigh * 10) / 10,
      fromLow: Math.round(fromLow * 10) / 10,
      pe: Math.round((detail?.trailingPE || 0) * 10) / 10,
      forwardPe: Math.round((detail?.forwardPE || 0) * 10) / 10,
      dividendYield: Math.round((detail?.dividendYield || 0) * 10000) / 100,
      beta: Math.round(beta * 100) / 100,
    },
    priceHistory,
    revenueHistory,
    weights: {
      revenue: 0.30,
      eps: 0.25,
      fcf: 0.25,
      margin: 0.20,
    },
  };
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { tickers } = await request.json();
    if (!tickers?.length)
      return json({ success: false, error: "No tickers" }, { status: 400 });

    const results = [];
    for (const t of tickers.slice(0, 10)) {
      try {
        const data = await fetchCompanyData(t.trim().toUpperCase());
        results.push(data);
      } catch (e: any) {
        console.error(`[YF] ${t}:`, e.message);
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
