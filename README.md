# Growth Index

A quantitative metric for evaluating company growth quality. The Growth Index (GI) combines revenue, earnings, and free cash flow growth with consistency and quality factors to produce a single comparable score.

## The Formula

```
GI = (w1·Rg + w2·Eg + w3·FCFg + w4·MΔ) × Cf × Qf
```

Where:
- **Rg** — 3-year revenue CAGR (w1 = 0.30)
- **Eg** — 3-year EPS CAGR (w2 = 0.25)
- **FCFg** — 3-year free cash flow CAGR (w3 = 0.25)
- **MΔ** — Operating margin delta (w4 = 0.20)
- **Cf** — Consistency factor (penalizes volatile growth)
- **Qf** — Quality factor (rewards ROIC > WACC)

### Consistency Factor

Measures the coefficient of variation in year-over-year revenue growth:

```
Cf = 1 - min(CV/2, 0.5)
```

Stable growers score higher. Erratic growth patterns are penalized.

### Quality Factor

Compares return on invested capital to weighted average cost of capital:

```
Qf = 0.8 + 0.4 × min(max((ROIC - WACC) / 10, -0.5), 0.5)
```

Companies generating returns above their cost of capital score higher.

## Research Basis

The Growth Index draws from established financial research:

- **Free Cash Flow Weighting** — Jensen (1986) demonstrated that FCF is a more reliable indicator of firm value than accounting earnings, as it's harder to manipulate and represents actual cash generation.

- **ROIC-WACC Spread** — The quality factor builds on Economic Value Added (EVA) research by Stern Stewart & Co., which shows that sustained value creation requires returns exceeding the cost of capital. See also Ohlson (1995) on residual income valuation.

- **Earnings Consistency** — Dechow & Dichev (2002) found that earnings volatility correlates with lower earnings quality. The consistency factor penalizes coefficient of variation in growth rates, similar to approaches in earnings quality literature.

- **Multi-Factor Growth Models** — The weighted composite approach follows Piotroski (2000) F-Score methodology, combining multiple financial signals into a single metric for improved predictive power over individual indicators.

## Interpretation

| Score | Label | Meaning |
|-------|-------|---------|
| 40+ | Exceptional | Rare, sustained high-quality growth |
| 20-40 | Strong | Above-average growth with good fundamentals |
| 10-20 | Moderate | Decent growth, may have inconsistencies |
| 0-10 | Weak | Below-average or declining metrics |
| <0 | Declining | Negative growth trend |

## Data Sources

- **Alpha Vantage** — Official API, rate limited to 1 req/sec on free tier + 25 requests per day cap
- **Yahoo Finance** — Unofficial API via yahoo-finance2, no rate limits

## Setup

```bash
npm install
```

Create `.env` with your Alpha Vantage key (optional if using Yahoo Finance):

```
ALPHA_VANTAGE_KEY=your_key_here
```

## Development

```bash
npm run dev
```

## Tech Stack

- SvelteKit
- Tailwind CSS
- TypeScript
