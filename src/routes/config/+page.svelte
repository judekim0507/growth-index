<script lang="ts">
    import {
        ArrowLeft,
        FlaskConical,
        Zap,
        Database,
        ExternalLink,
        Check,
    } from "@lucide/svelte";
    import { goto } from "$app/navigation";

    let alphaVantageEnabled = $state(false);
    let alphaVantageKey = $state("");

    function saveConfig() {
        if (typeof localStorage !== "undefined") {
            localStorage.setItem(
                "gi-alpha-vantage-enabled",
                String(alphaVantageEnabled),
            );
            localStorage.setItem("gi-alpha-vantage-key", alphaVantageKey);
        }
        goto("/");
    }

    $effect(() => {
        if (typeof localStorage !== "undefined") {
            alphaVantageEnabled =
                localStorage.getItem("gi-alpha-vantage-enabled") === "true";
            alphaVantageKey =
                localStorage.getItem("gi-alpha-vantage-key") || "";
        }
    });
</script>

<div class="min-h-screen bg-background flex flex-col">
    <header
        class="h-10 border-b border-border flex items-center justify-between px-4 shrink-0"
    >
        <div class="flex items-center gap-3">
            <a
                href="/"
                class="text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft class="h-4 w-4" />
            </a>
            <span
                class="text-xs font-semibold text-foreground uppercase tracking-wider"
                >Config</span
            >
        </div>
    </header>

    <main class="flex-1 overflow-auto">
        <div class="max-w-2xl mx-auto px-6 py-12">
            <div class="mb-12">
                <h1 class="text-2xl font-semibold tracking-tight mb-2">
                    Configuration
                </h1>
                <p class="text-sm text-muted-foreground">
                    Customize your Growth Index experience
                </p>
            </div>

            <div class="mb-12">
                <div class="flex items-center gap-2 mb-6">
                    <Database class="h-4 w-4 text-muted-foreground" />
                    <h2 class="text-sm font-medium uppercase tracking-wider">
                        Data Sources
                    </h2>
                </div>

                <div
                    class="bg-card border border-border border-primary/30 p-5 mb-3"
                >
                    <div class="flex items-start justify-between">
                        <div class="flex items-start gap-4">
                            <div
                                class="w-10 h-10 bg-primary/10 flex items-center justify-center shrink-0"
                            >
                                <Zap class="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <div class="flex items-center gap-2 mb-1">
                                    <h3 class="font-medium">Yahoo Finance</h3>
                                    <span
                                        class="text-[10px] uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5"
                                        >Default</span
                                    >
                                </div>
                                <p class="text-xs text-muted-foreground mb-3">
                                    Unofficial API via yahoo-finance2. Includes
                                    price charts, market data, company profiles,
                                    and full financial history.
                                </p>
                                <div
                                    class="flex items-center gap-4 text-[10px] text-muted-foreground"
                                >
                                    <span class="flex items-center gap-1">
                                        <Check class="h-3 w-3 text-positive" />
                                        No rate limits
                                    </span>
                                    <span class="flex items-center gap-1">
                                        <Check class="h-3 w-3 text-positive" />
                                        Extended data
                                    </span>
                                    <span class="flex items-center gap-1">
                                        <Check class="h-3 w-3 text-positive" />
                                        Price charts
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    class="bg-card border border-border p-5 {alphaVantageEnabled
                        ? 'border-warning/30'
                        : ''}"
                >
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex items-start gap-4">
                            <div
                                class="w-10 h-10 bg-warning/10 flex items-center justify-center shrink-0"
                            >
                                <FlaskConical class="h-5 w-5 text-warning" />
                            </div>
                            <div>
                                <div class="flex items-center gap-2 mb-1">
                                    <h3 class="font-medium">Alpha Vantage</h3>
                                    <span
                                        class="text-[10px] uppercase tracking-wider text-warning bg-warning/10 px-1.5 py-0.5"
                                        >Beta</span
                                    >
                                </div>
                                <p class="text-xs text-muted-foreground mb-3">
                                    Official financial API. Requires API key.
                                    Limited to 25 requests/day on free tier.
                                </p>
                                <div
                                    class="flex items-center gap-4 text-[10px] text-muted-foreground"
                                >
                                    <span>Rate: 1 req/sec</span>
                                    <span>25 req/day (free)</span>
                                    <a
                                        href="https://www.alphavantage.co/support/#api-key"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="flex items-center gap-1 text-primary hover:underline"
                                    >
                                        Get API key
                                        <ExternalLink class="h-3 w-3" />
                                    </a>
                                </div>
                            </div>
                        </div>
                        <button
                            onclick={() =>
                                (alphaVantageEnabled = !alphaVantageEnabled)}
                            aria-label="Toggle Alpha Vantage"
                            class="w-11 h-6 {alphaVantageEnabled
                                ? 'bg-warning'
                                : 'bg-secondary'} relative transition-colors"
                        >
                            <div
                                class="w-5 h-5 bg-foreground absolute top-0.5 transition-all {alphaVantageEnabled
                                    ? 'left-[22px]'
                                    : 'left-0.5'}"
                            ></div>
                        </button>
                    </div>

                    {#if alphaVantageEnabled}
                        <div class="pt-4 border-t border-border">
                            <label class="block">
                                <span
                                    class="text-[10px] text-muted-foreground uppercase tracking-wider block mb-2"
                                    >API Key</span
                                >
                                <input
                                    type="password"
                                    bind:value={alphaVantageKey}
                                    placeholder="Enter your Alpha Vantage API key"
                                    class="w-full h-9 px-3 bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground"
                                />
                            </label>
                            <p class="text-[10px] text-muted-foreground mt-2">
                                Your API key is stored locally in your browser
                                and never sent to our servers.
                            </p>
                        </div>
                    {/if}
                </div>
            </div>

            <div class="mb-12">
                <div class="flex items-center gap-2 mb-6">
                    <h2
                        class="text-sm font-medium uppercase tracking-wider text-muted-foreground"
                    >
                        About
                    </h2>
                </div>

                <div class="space-y-4 text-xs text-muted-foreground">
                    <p>
                        Growth Index is a quantitative metric for evaluating
                        company growth quality, combining revenue, earnings, and
                        free cash flow growth with consistency and quality
                        factors.
                    </p>
                    <p>
                        The formula draws from established financial research
                        including Jensen (1986) on free cash flow, Stern
                        Stewart's EVA methodology, and Piotroski (2000)
                        multi-factor scoring.
                    </p>
                    <div class="flex items-center gap-4 pt-4">
                        <a
                            href="https://github.com/judekim0507/growth-index"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-primary hover:underline flex items-center gap-1"
                        >
                            GitHub
                            <ExternalLink class="h-3 w-3" />
                        </a>
                        <span class="text-muted-foreground/50">·</span>
                        <span>Built by Jude Kim</span>
                    </div>
                </div>
            </div>

            <div class="flex items-center gap-3">
                <button
                    onclick={saveConfig}
                    class="h-10 px-6 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                    Save Config
                </button>
                <a
                    href="/"
                    class="h-10 px-6 bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors flex items-center"
                >
                    Cancel
                </a>
            </div>
        </div>
    </main>

    <footer
        class="h-6 border-t border-border bg-secondary flex items-center justify-center px-3 text-[10px] text-muted-foreground shrink-0"
    >
        <span>Growth Index v1.0</span>
    </footer>
</div>
