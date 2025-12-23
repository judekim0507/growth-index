/**
 * Growth Index (GI) Calculator
 * A composite metric to evaluate and compare company growth rates.
 *
 * Formula:
 * GI = (w1·Rg + w2·Eg + w3·FCFg + w4·MΔ) × Cf × Qf
 *
 * Where:
 * - Rg: Revenue CAGR (3-year)
 * - Eg: Earnings/EPS CAGR (3-year)
 * - FCFg: Free Cash Flow CAGR (3-year)
 * - MΔ: Operating Margin change
 * - Cf: Consistency Factor (penalizes erratic growth)
 * - Qf: Quality Factor (rewards value creation via ROIC > WACC)
 */

export interface GrowthMetrics {
	revenueCagr: number; // 3-year revenue CAGR (as percentage, e.g., 25 for 25%)
	epsCagr: number; // 3-year EPS CAGR
	fcfCagr: number; // 3-year Free Cash Flow CAGR
	marginDelta: number; // Change in operating margin (percentage points)
	annualRevenueGrowth: number[]; // List of annual revenue growth rates (for consistency calc)
	roic: number; // Return on Invested Capital (as percentage)
	wacc: number; // Weighted Average Cost of Capital (as percentage)
}

export interface Weights {
	revenue: number;
	eps: number;
	fcf: number;
	margin: number;
}

export interface GrowthIndexResult {
	growthIndex: number;
	baseScore: number;
	consistencyFactor: number;
	qualityFactor: number;
	components: {
		revenue: number;
		eps: number;
		fcf: number;
		margin: number;
	};
}

export interface CompanyResult {
	name: string;
	ticker?: string;
	result: GrowthIndexResult;
	metrics: GrowthMetrics;
}

export const DEFAULT_WEIGHTS: Weights = {
	revenue: 0.35,
	eps: 0.30,
	fcf: 0.20,
	margin: 0.15
};

/**
 * Calculate the standard deviation of an array of numbers
 */
function stdev(values: number[]): number {
	const n = values.length;
	if (n < 2) return 0;
	const mean = values.reduce((a, b) => a + b, 0) / n;
	const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
	const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (n - 1);
	return Math.sqrt(variance);
}

/**
 * Calculate the mean of an array of numbers
 */
function mean(values: number[]): number {
	if (values.length === 0) return 0;
	return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Calculate the consistency factor (Cf).
 *
 * Cf = 1 - (σ / μ), capped between minCf and maxCf.
 *
 * Penalizes companies with volatile/erratic growth patterns.
 * A company with steady 20% growth scores higher than one
 * alternating between -10% and 50%.
 */
export function calculateConsistencyFactor(
	annualGrowthRates: number[],
	minCf: number = 0.5,
	maxCf: number = 1.0
): number {
	if (annualGrowthRates.length < 2) {
		return maxCf; // Not enough data to assess consistency
	}

	const meanGrowth = mean(annualGrowthRates);

	// Handle edge case where mean is zero or negative
	if (meanGrowth <= 0) {
		return minCf;
	}

	const stdGrowth = stdev(annualGrowthRates);
	const coefficientOfVariation = stdGrowth / meanGrowth;

	const cf = 1 - coefficientOfVariation;
	return Math.max(minCf, Math.min(maxCf, cf));
}

/**
 * Calculate the quality factor (Qf).
 *
 * Qf = 0.7 + 0.3 × min(1, ROIC/WACC)
 *
 * Rewards companies that generate returns above their cost of capital.
 * ROIC > WACC means the company is creating shareholder value.
 */
export function calculateQualityFactor(
	roic: number,
	wacc: number,
	minQf: number = 0.7,
	maxQf: number = 1.0
): number {
	if (wacc <= 0) {
		return maxQf; // Avoid division by zero
	}

	const roicWaccRatio = Math.min(1.0, roic / wacc);
	const qf = minQf + (maxQf - minQf) * roicWaccRatio;

	return qf;
}

/**
 * Calculate the composite Growth Index (GI) for a company.
 */
export function calculateGrowthIndex(
	metrics: GrowthMetrics,
	weights: Weights = DEFAULT_WEIGHTS
): GrowthIndexResult {
	// Calculate weighted components
	const components = {
		revenue: weights.revenue * metrics.revenueCagr,
		eps: weights.eps * metrics.epsCagr,
		fcf: weights.fcf * metrics.fcfCagr,
		margin: weights.margin * metrics.marginDelta
	};

	const baseScore = components.revenue + components.eps + components.fcf + components.margin;

	// Calculate adjustment factors
	const consistencyFactor = calculateConsistencyFactor(metrics.annualRevenueGrowth);
	const qualityFactor = calculateQualityFactor(metrics.roic, metrics.wacc);

	// Final Growth Index
	const growthIndex = baseScore * consistencyFactor * qualityFactor;

	return {
		growthIndex: Math.round(growthIndex * 100) / 100,
		baseScore: Math.round(baseScore * 100) / 100,
		consistencyFactor: Math.round(consistencyFactor * 1000) / 1000,
		qualityFactor: Math.round(qualityFactor * 1000) / 1000,
		components: {
			revenue: Math.round(components.revenue * 100) / 100,
			eps: Math.round(components.eps * 100) / 100,
			fcf: Math.round(components.fcf * 100) / 100,
			margin: Math.round(components.margin * 100) / 100
		}
	};
}

/**
 * Compare multiple companies by their Growth Index.
 * Returns companies sorted by GI descending.
 */
export function compareCompanies(
	companies: { name: string; ticker?: string; metrics: GrowthMetrics }[],
	weights: Weights = DEFAULT_WEIGHTS
): CompanyResult[] {
	const results: CompanyResult[] = companies.map((company) => ({
		name: company.name,
		ticker: company.ticker,
		result: calculateGrowthIndex(company.metrics, weights),
		metrics: company.metrics
	}));

	// Sort by growth index, descending
	results.sort((a, b) => b.result.growthIndex - a.result.growthIndex);
	return results;
}

/**
 * Get interpretation of the Growth Index score
 */
export function interpretGrowthIndex(gi: number): {
	label: string;
	description: string;
	color: 'green' | 'yellow' | 'orange' | 'red' | 'purple';
} {
	if (gi >= 40) {
		return {
			label: 'Exceptional Growth',
			description: 'Hypergrowth company with outstanding metrics across all dimensions',
			color: 'purple'
		};
	} else if (gi >= 25) {
		return {
			label: 'Strong Growth',
			description: 'High-growth company with solid fundamentals and value creation',
			color: 'green'
		};
	} else if (gi >= 15) {
		return {
			label: 'Moderate Growth',
			description: 'Healthy growth with room for improvement in some areas',
			color: 'yellow'
		};
	} else if (gi >= 5) {
		return {
			label: 'Low Growth',
			description: 'Mature company with stable but limited growth prospects',
			color: 'orange'
		};
	} else {
		return {
			label: 'Declining/Stagnant',
			description: 'Company facing headwinds or in a declining phase',
			color: 'red'
		};
	}
}

// Example company data for demonstration
export const EXAMPLE_COMPANIES = {
	META: {
		name: 'Meta Platforms',
		ticker: 'META',
		metrics: {
			revenueCagr: 18.8,
			epsCagr: 66.7,
			fcfCagr: 67.5,
			marginDelta: 8.3,
			annualRevenueGrowth: [15.7, 21.9, 21.3],
			roic: 34.0,
			wacc: 12.7
		}
	},
	APPLE: {
		name: 'Apple',
		ticker: 'AAPL',
		metrics: {
			revenueCagr: -0.4,
			epsCagr: -0.2,
			fcfCagr: -1.2,
			marginDelta: 1.0,
			annualRevenueGrowth: [-2.8, 2.0, 6.4],
			roic: 48.0,
			wacc: 10.1
		}
	},
	NVIDIA: {
		name: 'NVIDIA',
		ticker: 'NVDA',
		metrics: {
			revenueCagr: 94.0,
			epsCagr: 150.0,
			fcfCagr: 85.0,
			marginDelta: 15.0,
			annualRevenueGrowth: [60, 120, 100],
			roic: 45.0,
			wacc: 11.5
		}
	}
};
