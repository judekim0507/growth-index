import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export const GET: RequestHandler = async ({ url }) => {
  const query = url.searchParams.get("q");
  if (!query || query.length < 1) {
    return json({ results: [] });
  }

  try {
    const results = await yahooFinance.search(query, { quotesCount: 8 });
    const quotes = results.quotes
      .filter((q: any) => q.quoteType === "EQUITY" && q.symbol)
      .map((q: any) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        exchange: q.exchange,
      }));
    return json({ results: quotes });
  } catch (e: any) {
    return json({ results: [], error: e.message });
  }
};
