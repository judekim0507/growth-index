<script lang="ts">
    interface Props {
        metrics: {
            revenueCagr: number;
            epsCagr: number;
            fcfCagr: number;
            marginDelta: number;
        };
        weights: {
            revenue: number;
            eps: number;
            fcf: number;
            margin: number;
        };
        consistencyFactor: number;
        qualityFactor: number;
    }

    let { metrics, weights, consistencyFactor, qualityFactor }: Props =
        $props();

    function getBarWidth(value: number, max: number = 50): number {
        const normalized = Math.min(Math.abs(value), max) / max;
        return normalized * 100;
    }

    function getBarColor(value: number): string {
        if (value > 10) return "bg-positive";
        if (value > 0) return "bg-positive/70";
        if (value < -10) return "bg-negative";
        if (value < 0) return "bg-negative/70";
        return "bg-muted-foreground";
    }

    function getFactorColor(value: number): string {
        if (value >= 1.0) return "text-positive";
        if (value >= 0.9) return "text-warning";
        return "text-negative";
    }

    const components = $derived([
        {
            label: "Revenue CAGR",
            value: metrics.revenueCagr,
            weight: weights.revenue,
        },
        { label: "EPS CAGR", value: metrics.epsCagr, weight: weights.eps },
        { label: "FCF CAGR", value: metrics.fcfCagr, weight: weights.fcf },
        {
            label: "Margin Delta",
            value: metrics.marginDelta,
            weight: weights.margin,
        },
    ]);
</script>

<div class="space-y-4">
    <div class="space-y-3">
        {#each components as comp}
            <div>
                <div class="flex items-center justify-between mb-1">
                    <span
                        class="text-[10px] text-muted-foreground uppercase tracking-wider"
                        >{comp.label}</span
                    >
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] text-muted-foreground"
                            >{(comp.weight * 100).toFixed(0)}%</span
                        >
                        <span
                            class="text-xs tabular {comp.value >= 0
                                ? 'text-positive'
                                : 'text-negative'}"
                        >
                            {comp.value >= 0 ? "+" : ""}{comp.value.toFixed(1)}%
                        </span>
                    </div>
                </div>
                <div class="h-1.5 bg-secondary relative">
                    <div
                        class="h-full {getBarColor(
                            comp.value,
                        )} transition-all duration-500"
                        style="width: {getBarWidth(comp.value)}%"
                    ></div>
                </div>
            </div>
        {/each}
    </div>

    <div class="pt-3 border-t border-border grid grid-cols-2 gap-4">
        <div>
            <div class="flex items-center justify-between mb-1">
                <span
                    class="text-[10px] text-muted-foreground uppercase tracking-wider"
                    >Consistency</span
                >
                <span
                    class="text-xs tabular {getFactorColor(consistencyFactor)}"
                >
                    {consistencyFactor.toFixed(2)}x
                </span>
            </div>
            <div class="h-1.5 bg-secondary relative">
                <div
                    class="h-full {consistencyFactor >= 0.9
                        ? 'bg-positive'
                        : consistencyFactor >= 0.7
                          ? 'bg-warning'
                          : 'bg-negative'} transition-all duration-500"
                    style="width: {(consistencyFactor / 1.0) * 100}%"
                ></div>
            </div>
        </div>
        <div>
            <div class="flex items-center justify-between mb-1">
                <span
                    class="text-[10px] text-muted-foreground uppercase tracking-wider"
                    >Quality</span
                >
                <span class="text-xs tabular {getFactorColor(qualityFactor)}">
                    {qualityFactor.toFixed(2)}x
                </span>
            </div>
            <div class="h-1.5 bg-secondary relative">
                <div
                    class="h-full {qualityFactor >= 1.0
                        ? 'bg-positive'
                        : qualityFactor >= 0.9
                          ? 'bg-warning'
                          : 'bg-negative'} transition-all duration-500"
                    style="width: {(qualityFactor / 1.2) * 100}%"
                ></div>
            </div>
        </div>
    </div>
</div>
