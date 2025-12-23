<script lang="ts">
    import {
        Search,
        X,
        Loader2,
        ExternalLink,
        TrendingUp,
        TrendingDown,
        Settings,
    } from "@lucide/svelte";
    import PriceChart from "$lib/components/PriceChart.svelte";
    import ScoreBreakdown from "$lib/components/ScoreBreakdown.svelte";

    interface CompanyResult {
        ticker: string;
        name: string;
        growthIndex: number;
        baseScore: number;
        consistencyFactor: number;
        qualityFactor: number;
        metrics: {
            revenueCagr: number;
            epsCagr: number;
            fcfCagr: number;
            marginDelta: number;
            roic: number;
            wacc: number;
        };
        interpretation: {
            label: string;
            description: string;
        };
        company?: {
            sector: string;
            industry: string;
            employees: number;
            website: string;
            description: string;
        };
        market?: {
            price: number;
            change: number;
            changePercent: number;
            marketCap: string;
            volume: number;
            avgVolume: number;
            fiftyTwoWeekHigh: number;
            fiftyTwoWeekLow: number;
            fromHigh: number;
            fromLow: number;
            pe: number;
            forwardPe: number;
            dividendYield: number;
            beta: number;
        };
        priceHistory?: { time: string; value: number }[];
        revenueHistory?: {
            year: number;
            revenue: number;
            operatingIncome: number;
            netIncome: number;
        }[];
        weights?: {
            revenue: number;
            eps: number;
            fcf: number;
            margin: number;
        };
    }

    type DataSource = "yahoo-finance" | "alpha-vantage";

    interface SearchSuggestion {
        symbol: string;
        name: string;
        exchange: string;
    }

    let inputValue = $state("");
    let selectedTickers = $state<{ symbol: string; name: string }[]>([]);
    let suggestions = $state<SearchSuggestion[]>([]);
    let showSuggestions = $state(false);
    let highlightedIndex = $state(-1);
    let isLoading = $state(false);
    let isSearching = $state(false);
    let error = $state("");
    let results = $state<CompanyResult[]>([]);
    let selectedCompany = $state<CompanyResult | null>(null);
    let alphaVantageEnabled = $state(false);
    let alphaVantageKey = $state("");
    let dataSource = $state<DataSource>("yahoo-finance");
    let searchTimeout: ReturnType<typeof setTimeout>;
    let inputElement: HTMLInputElement;

    $effect(() => {
        if (typeof localStorage !== "undefined") {
            alphaVantageEnabled =
                localStorage.getItem("gi-alpha-vantage-enabled") === "true";
            alphaVantageKey =
                localStorage.getItem("gi-alpha-vantage-key") || "";
        }
    });

    async function fetchSuggestions(query: string) {
        if (!query.trim()) {
            suggestions = [];
            showSuggestions = false;
            return;
        }
        isSearching = true;
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            suggestions = data.results.filter(
                (s: SearchSuggestion) => !selectedTickers.some((t) => t.symbol === s.symbol)
            );
            showSuggestions = suggestions.length > 0;
            highlightedIndex = -1;
        } catch {
            suggestions = [];
        } finally {
            isSearching = false;
        }
    }

    function handleInput() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => fetchSuggestions(inputValue), 150);
    }

    function addTicker(suggestion: SearchSuggestion) {
        selectedTickers = [...selectedTickers, { symbol: suggestion.symbol, name: suggestion.name }];
        inputValue = "";
        suggestions = [];
        showSuggestions = false;
        inputElement?.focus();
    }

    function removeTicker(symbol: string) {
        selectedTickers = selectedTickers.filter((t) => t.symbol !== symbol);
    }

    function addTickerFromInput() {
        const symbol = inputValue.trim().toUpperCase().replace(/,/g, "");
        if (symbol && !selectedTickers.some((t) => t.symbol === symbol)) {
            selectedTickers = [...selectedTickers, { symbol, name: symbol }];
        }
        inputValue = "";
        suggestions = [];
        showSuggestions = false;
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "ArrowDown" && showSuggestions) {
            e.preventDefault();
            highlightedIndex = Math.min(highlightedIndex + 1, suggestions.length - 1);
        } else if (e.key === "ArrowUp" && showSuggestions) {
            e.preventDefault();
            highlightedIndex = Math.max(highlightedIndex - 1, 0);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
                addTicker(suggestions[highlightedIndex]);
            } else if (inputValue.trim()) {
                addTickerFromInput();
            } else if (selectedTickers.length > 0) {
                search();
            }
        } else if (e.key === "," || e.key === " ") {
            e.preventDefault();
            if (inputValue.trim()) {
                addTickerFromInput();
            }
        } else if (e.key === "Backspace" && !inputValue && selectedTickers.length > 0) {
            selectedTickers = selectedTickers.slice(0, -1);
        } else if (e.key === "Escape") {
            showSuggestions = false;
        }
    }

    function handlePaste(e: ClipboardEvent) {
        e.preventDefault();
        const text = e.clipboardData?.getData("text") || "";
        const symbols = text.split(/[,\s]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);
        const newTickers = symbols
            .filter((s) => !selectedTickers.some((t) => t.symbol === s))
            .map((s) => ({ symbol: s, name: s }));
        selectedTickers = [...selectedTickers, ...newTickers];
        inputValue = "";
    }

    async function search() {
        if (selectedTickers.length === 0) return;
        isLoading = true;
        error = "";
        selectedCompany = null;
        showSuggestions = false;

        try {
            const tickers = selectedTickers.map((t) => t.symbol)
                .filter(Boolean);

            const endpoint =
                dataSource === "alpha-vantage"
                    ? "/api/lookup"
                    : "/api/lookup-yahoo";
            const body: { tickers: string[]; apiKey?: string } = { tickers };

            if (dataSource === "alpha-vantage" && alphaVantageKey) {
                body.apiKey = alphaVantageKey;
            }

            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!data.success) {
                error = data.error || "Failed to fetch data";
                results = [];
            } else {
                results = data.data;
                if (results.length > 1) {
                    results.sort((a, b) => b.growthIndex - a.growthIndex);
                }
                if (results.length > 0) {
                    selectedCompany = results[0];
                }
            }
        } catch (e) {
            error = "Connection error";
            results = [];
        } finally {
            isLoading = false;
        }
    }

    function clear() {
        inputValue = "";
        selectedTickers = [];
        suggestions = [];
        showSuggestions = false;
        results = [];
        error = "";
        selectedCompany = null;
    }

    function selectCompany(company: CompanyResult) {
        selectedCompany = company;
    }

    function getGIColor(gi: number): string {
        if (gi >= 20) return "text-positive";
        if (gi >= 0) return "text-warning";
        return "text-negative";
    }

    function getValueColor(value: number): string {
        if (value > 0) return "text-positive";
        if (value < 0) return "text-negative";
        return "text-muted-foreground";
    }

    function fmt(n: number, showSign = true): string {
        const sign = showSign && n > 0 ? "+" : "";
        return `${sign}${n.toFixed(1)}`;
    }

    function formatVolume(v: number): string {
        if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
        if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
        if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
        return v.toString();
    }

    function formatRevenue(v: number): string {
        if (v >= 1e12) return `${(v / 1e12).toFixed(1)}T`;
        if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
        if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
        return v.toString();
    }
</script>

<div class="min-h-screen bg-background flex flex-col">
    <header
        class="h-10 border-b border-border flex items-center justify-between px-4 shrink-0"
    >
        <div class="flex items-center gap-3">
            <a
                href="/"
                class="text-xs font-semibold text-foreground uppercase tracking-wider cursor-pointer"
                >Growth Index</a
            >
        </div>
        <div class="flex items-center gap-4">
            <div
                class="flex items-center gap-1 text-[10px] text-muted-foreground"
            >
                <span class="w-1.5 h-1.5 bg-positive"></span>
                <a
                    href={dataSource === "alpha-vantage"
                        ? "https://www.alphavantage.co/"
                        : "https://finance.yahoo.com/"}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="cursor-pointer hover:text-foreground transition-colors"
                >
                    {dataSource === "alpha-vantage"
                        ? "Alpha Vantage"
                        : "Yahoo Finance"}
                </a>
            </div>
            <a
                href="/config"
                class="text-muted-foreground hover:text-foreground transition-colors"
            >
                <Settings class="h-3.5 w-3.5" />
            </a>
        </div>
    </header>

    <main class="flex-1 flex flex-col overflow-hidden">
        <div class="px-4 py-6 border-b border-border">
            <div class="max-w-2xl mx-auto">
                {#if alphaVantageEnabled}
                    <div class="flex justify-center mb-4">
                        <div class="inline-flex bg-secondary p-0.5">
                            <button
                                onclick={() => (dataSource = "yahoo-finance")}
                                class="px-3 py-1 text-[10px] font-medium transition-colors {dataSource ===
                                'yahoo-finance'
                                    ? 'bg-card text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'}"
                            >
                                Yahoo Finance
                            </button>
                            <button
                                onclick={() => (dataSource = "alpha-vantage")}
                                class="px-3 py-1 text-[10px] font-medium transition-colors {dataSource ===
                                'alpha-vantage'
                                    ? 'bg-card text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'}"
                            >
                                Alpha Vantage
                            </button>
                        </div>
                    </div>
                {/if}
                <div class="flex gap-2">
                    <div class="relative flex-1">
                        <div class="flex items-center flex-wrap gap-1.5 min-h-9 px-2 py-1.5 bg-secondary">
                            {#each selectedTickers as ticker}
                                <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/15 text-primary text-xs font-medium">
                                    {ticker.symbol}
                                    <button
                                        onclick={() => removeTicker(ticker.symbol)}
                                        class="hover:text-primary/70"
                                    >
                                        <X class="h-3 w-3" />
                                    </button>
                                </span>
                            {/each}
                            <input
                                bind:this={inputElement}
                                bind:value={inputValue}
                                oninput={handleInput}
                                onkeydown={handleKeydown}
                                onpaste={handlePaste}
                                onfocus={() => inputValue && fetchSuggestions(inputValue)}
                                onblur={() => setTimeout(() => showSuggestions = false, 150)}
                                placeholder={selectedTickers.length === 0 ? "Search companies..." : ""}
                                class="flex-1 min-w-[120px] bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none focus:outline-none focus:ring-0 border-none"
                            />
                            {#if selectedTickers.length > 0 || inputValue}
                                <button
                                    onclick={clear}
                                    class="text-muted-foreground hover:text-foreground"
                                >
                                    <X class="h-3.5 w-3.5" />
                                </button>
                            {/if}
                        </div>
                        {#if showSuggestions}
                            <div class="absolute top-full left-0 right-0 mt-1 bg-card border border-border z-50 max-h-64 overflow-auto">
                                {#each suggestions as suggestion, i}
                                    <button
                                        onmousedown={() => addTicker(suggestion)}
                                        class="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-secondary {highlightedIndex === i ? 'bg-secondary' : ''}"
                                    >
                                        <div>
                                            <span class="text-sm font-medium">{suggestion.symbol}</span>
                                            <span class="text-xs text-muted-foreground ml-2">{suggestion.name}</span>
                                        </div>
                                        <span class="text-[10px] text-muted-foreground">{suggestion.exchange}</span>
                                    </button>
                                {/each}
                            </div>
                        {/if}
                    </div>
                    <button
                        onclick={search}
                        disabled={isLoading || selectedTickers.length === 0}
                        class="h-9 px-4 bg-primary text-primary-foreground text-xs font-medium uppercase tracking-wider disabled:opacity-50 hover:bg-primary/90 transition-colors shrink-0"
                    >
                        {#if isLoading}
                            <Loader2 class="h-3.5 w-3.5 animate-spin" />
                        {:else}
                            Analyze
                        {/if}
                    </button>
                </div>
            </div>
        </div>

        {#if error}
            <div class="px-4 py-4">
                <div
                    class="max-w-2xl mx-auto bg-negative/10 border border-negative/30 px-3 py-2"
                >
                    <span class="text-xs text-negative">{error}</span>
                </div>
            </div>
        {/if}

        {#if isLoading}
            <div class="flex-1 flex items-center justify-center">
                <div class="text-center">
                    <Loader2
                        class="h-5 w-5 animate-spin text-primary mx-auto mb-2"
                    />
                    <p class="text-xs text-muted-foreground">
                        Fetching data...
                    </p>
                </div>
            </div>
        {/if}

        {#if results.length > 0 && !isLoading}
            <div class="flex-1 flex overflow-hidden">
                <div class="w-64 border-r border-border flex flex-col shrink-0">
                    <div
                        class="px-3 py-2 border-b border-border bg-secondary/50"
                    >
                        <span
                            class="text-[10px] text-muted-foreground uppercase tracking-wider"
                        >
                            Results ({results.length})
                        </span>
                    </div>
                    <div class="flex-1 overflow-auto">
                        {#each results as company, index}
                            <button
                                onclick={() => selectCompany(company)}
                                class="w-full px-3 py-3 border-b border-border text-left hover:bg-secondary/50 transition-colors {selectedCompany?.ticker ===
                                company.ticker
                                    ? 'bg-secondary'
                                    : ''}"
                            >
                                <div class="flex items-start justify-between">
                                    <div>
                                        <div class="flex items-center gap-2">
                                            {#if results.length > 1}
                                                <span
                                                    class="text-[10px] text-muted-foreground"
                                                    >#{index + 1}</span
                                                >
                                            {/if}
                                            <span class="text-sm font-medium"
                                                >{company.ticker}</span
                                            >
                                        </div>
                                        <div
                                            class="text-[10px] text-muted-foreground truncate max-w-[120px]"
                                        >
                                            {company.name}
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <div
                                            class="text-sm font-semibold tabular {getGIColor(
                                                company.growthIndex,
                                            )}"
                                        >
                                            {company.growthIndex.toFixed(1)}
                                        </div>
                                        <div
                                            class="text-[9px] text-muted-foreground uppercase"
                                        >
                                            {company.interpretation.label}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        {/each}
                    </div>
                </div>

                <div class="flex-1 overflow-auto">
                    {#if selectedCompany}
                        <div class="p-4 space-y-4">
                            <div class="flex items-start justify-between">
                                <div>
                                    <div class="flex items-center gap-3 mb-1">
                                        <h2 class="text-xl font-semibold">
                                            {selectedCompany.ticker}
                                        </h2>
                                        {#if selectedCompany.company?.website}
                                            <a
                                                href={selectedCompany.company
                                                    .website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                class="text-muted-foreground hover:text-foreground"
                                            >
                                                <ExternalLink
                                                    class="h-3.5 w-3.5"
                                                />
                                            </a>
                                        {/if}
                                    </div>
                                    <p class="text-sm text-muted-foreground">
                                        {selectedCompany.name}
                                    </p>
                                    {#if selectedCompany.company}
                                        <p
                                            class="text-[10px] text-muted-foreground mt-1"
                                        >
                                            {selectedCompany.company.sector} · {selectedCompany
                                                .company.industry}
                                        </p>
                                    {/if}
                                </div>
                                <div class="text-right">
                                    <div
                                        class="text-3xl font-bold tabular {getGIColor(
                                            selectedCompany.growthIndex,
                                        )}"
                                    >
                                        {selectedCompany.growthIndex.toFixed(1)}
                                    </div>
                                    <div
                                        class="text-xs text-muted-foreground uppercase tracking-wider"
                                    >
                                        {selectedCompany.interpretation.label}
                                    </div>
                                </div>
                            </div>

                            {#if selectedCompany.market}
                                {@const range52w =
                                    selectedCompany.market.fiftyTwoWeekHigh -
                                    selectedCompany.market.fiftyTwoWeekLow}
                                {@const pricePosition =
                                    range52w > 0
                                        ? ((selectedCompany.market.price -
                                              selectedCompany.market
                                                  .fiftyTwoWeekLow) /
                                              range52w) *
                                          100
                                        : 50}
                                {@const isPositive =
                                    selectedCompany.market.change >= 0}
                                <div class="grid grid-cols-2 gap-4">
                                    <div
                                        class="relative border border-border p-4 overflow-hidden {isPositive
                                            ? 'bg-positive/[0.04]'
                                            : 'bg-negative/[0.04]'}"
                                    >
                                        <div
                                            class="absolute inset-0 {isPositive
                                                ? 'bg-gradient-to-br from-positive/[0.06] to-transparent'
                                                : 'bg-gradient-to-br from-negative/[0.06] to-transparent'} pointer-events-none"
                                        ></div>

                                        <div
                                            class="relative flex items-center justify-between mb-4"
                                        >
                                            <div>
                                                <div
                                                    class="text-[10px] text-muted-foreground uppercase mb-1"
                                                >
                                                    Price
                                                </div>
                                                <span
                                                    class="text-3xl font-bold tabular"
                                                    >${selectedCompany.market.price.toFixed(
                                                        2,
                                                    )}</span
                                                >
                                            </div>
                                            <div class="text-right">
                                                <div
                                                    class="flex items-center gap-1.5 {getValueColor(
                                                        selectedCompany.market
                                                            .change,
                                                    )}"
                                                >
                                                    {#if isPositive}
                                                        <TrendingUp
                                                            class="h-5 w-5"
                                                        />
                                                    {:else}
                                                        <TrendingDown
                                                            class="h-5 w-5"
                                                        />
                                                    {/if}
                                                    <span
                                                        class="text-xl font-bold tabular"
                                                        >{fmt(
                                                            selectedCompany
                                                                .market
                                                                .changePercent,
                                                        )}%</span
                                                    >
                                                </div>
                                                <div
                                                    class="text-xs tabular {getValueColor(
                                                        selectedCompany.market
                                                            .change,
                                                    )}"
                                                >
                                                    {fmt(
                                                        selectedCompany.market
                                                            .change,
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div class="relative mb-4">
                                            <div
                                                class="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5"
                                            >
                                                <span>52W Range</span>
                                                <span class="tabular"
                                                    >${selectedCompany.market.fiftyTwoWeekLow.toFixed(
                                                        2,
                                                    )} — ${selectedCompany.market.fiftyTwoWeekHigh.toFixed(
                                                        2,
                                                    )}</span
                                                >
                                            </div>
                                            <div
                                                class="h-1.5 bg-secondary relative"
                                            >
                                                <div
                                                    class="absolute top-0 h-full bg-gradient-to-r from-negative via-warning to-positive opacity-40"
                                                    style="width: 100%"
                                                ></div>
                                                <div
                                                    class="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-foreground border-2 border-background"
                                                    style="left: calc({pricePosition}% - 5px)"
                                                ></div>
                                            </div>
                                            <div
                                                class="flex items-center justify-between text-[10px] mt-1"
                                            >
                                                <span
                                                    class="text-positive tabular"
                                                    >+{selectedCompany.market
                                                        .fromLow}%</span
                                                >
                                                <span
                                                    class="text-negative tabular"
                                                    >{selectedCompany.market
                                                        .fromHigh}%</span
                                                >
                                            </div>
                                        </div>

                                        <div
                                            class="relative border-t border-border pt-3"
                                        >
                                            <div class="grid grid-cols-3 gap-3">
                                                <div>
                                                    <div
                                                        class="text-[10px] text-muted-foreground mb-0.5"
                                                    >
                                                        Mkt Cap
                                                    </div>
                                                    <div
                                                        class="text-sm font-medium tabular"
                                                    >
                                                        {selectedCompany.market
                                                            .marketCap}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div
                                                        class="text-[10px] text-muted-foreground mb-0.5"
                                                    >
                                                        P/E
                                                    </div>
                                                    <div
                                                        class="text-sm font-medium tabular"
                                                    >
                                                        {selectedCompany.market
                                                            .pe || "—"}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div
                                                        class="text-[10px] text-muted-foreground mb-0.5"
                                                    >
                                                        Fwd P/E
                                                    </div>
                                                    <div
                                                        class="text-sm font-medium tabular"
                                                    >
                                                        {selectedCompany.market
                                                            .forwardPe || "—"}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div
                                                        class="text-[10px] text-muted-foreground mb-0.5"
                                                    >
                                                        Volume
                                                    </div>
                                                    <div
                                                        class="text-sm font-medium tabular"
                                                    >
                                                        {formatVolume(
                                                            selectedCompany
                                                                .market.volume,
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div
                                                        class="text-[10px] text-muted-foreground mb-0.5"
                                                    >
                                                        Beta
                                                    </div>
                                                    <div
                                                        class="text-sm font-medium tabular"
                                                    >
                                                        {selectedCompany.market
                                                            .beta}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div
                                                        class="text-[10px] text-muted-foreground mb-0.5"
                                                    >
                                                        Yield
                                                    </div>
                                                    <div
                                                        class="text-sm font-medium tabular"
                                                    >
                                                        {selectedCompany.market
                                                            .dividendYield
                                                            ? selectedCompany
                                                                  .market
                                                                  .dividendYield +
                                                              "%"
                                                            : "—"}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        class="bg-card border border-border p-4"
                                    >
                                        <div
                                            class="text-[10px] text-muted-foreground uppercase tracking-wider mb-3"
                                        >
                                            Score Breakdown
                                        </div>
                                        {#if selectedCompany.weights}
                                            <ScoreBreakdown
                                                metrics={selectedCompany.metrics}
                                                weights={selectedCompany.weights}
                                                consistencyFactor={selectedCompany.consistencyFactor}
                                                qualityFactor={selectedCompany.qualityFactor}
                                            />
                                        {/if}
                                    </div>
                                </div>

                                {#if selectedCompany.priceHistory?.length}
                                    <div
                                        class="bg-card border border-border p-4"
                                    >
                                        <div
                                            class="text-[10px] text-muted-foreground uppercase tracking-wider mb-3"
                                        >
                                            1Y Price
                                        </div>
                                        <PriceChart
                                            data={selectedCompany.priceHistory}
                                            height={180}
                                            positive={selectedCompany.market
                                                .changePercent >= 0}
                                        />
                                    </div>
                                {/if}

                                {#if selectedCompany.revenueHistory?.length}
                                    <div
                                        class="bg-card border border-border p-4"
                                    >
                                        <div
                                            class="text-[10px] text-muted-foreground uppercase tracking-wider mb-3"
                                        >
                                            Annual Financials
                                        </div>
                                        <div class="overflow-x-auto">
                                            <table class="w-full text-xs">
                                                <thead>
                                                    <tr
                                                        class="border-b border-border"
                                                    >
                                                        <th
                                                            class="text-left py-2 text-muted-foreground font-normal"
                                                            >Year</th
                                                        >
                                                        <th
                                                            class="text-right py-2 text-muted-foreground font-normal"
                                                            >Revenue</th
                                                        >
                                                        <th
                                                            class="text-right py-2 text-muted-foreground font-normal"
                                                            >Op. Income</th
                                                        >
                                                        <th
                                                            class="text-right py-2 text-muted-foreground font-normal"
                                                            >Net Income</th
                                                        >
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {#each selectedCompany.revenueHistory as row}
                                                        <tr
                                                            class="border-b border-border/50"
                                                        >
                                                            <td
                                                                class="py-2 tabular"
                                                                >{row.year}</td
                                                            >
                                                            <td
                                                                class="py-2 text-right tabular"
                                                                >{formatRevenue(
                                                                    row.revenue,
                                                                )}</td
                                                            >
                                                            <td
                                                                class="py-2 text-right tabular {row.operatingIncome >=
                                                                0
                                                                    ? 'text-positive'
                                                                    : 'text-negative'}"
                                                                >{formatRevenue(
                                                                    row.operatingIncome,
                                                                )}</td
                                                            >
                                                            <td
                                                                class="py-2 text-right tabular {row.netIncome >=
                                                                0
                                                                    ? 'text-positive'
                                                                    : 'text-negative'}"
                                                                >{formatRevenue(
                                                                    row.netIncome,
                                                                )}</td
                                                            >
                                                        </tr>
                                                    {/each}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                {/if}
                            {/if}
                        </div>
                    {:else}
                        <div
                            class="flex-1 flex items-center justify-center text-muted-foreground text-sm"
                        >
                            Select a company to view details
                        </div>
                    {/if}
                </div>
            </div>
        {/if}

        {#if !isLoading && results.length === 0 && !error}
            <div class="flex-1 flex items-center justify-center">
                <div class="text-center">
                    <p class="text-muted-foreground text-sm mb-2">
                        Enter ticker symbols to analyze
                    </p>
                    <p class="text-muted-foreground/60 text-xs">
                        Separate multiple tickers with commas
                    </p>
                </div>
            </div>
        {/if}
    </main>

    <footer
        class="h-6 border-t border-border bg-secondary flex items-center justify-between px-3 text-[10px] text-muted-foreground shrink-0"
    >
        <div class="flex items-center gap-4">
            <span>Growth Index v1.0</span>
            <span>Yahoo Finance API</span>
        </div>
        <a
            href="https://github.com/judekim0507/growth-index"
            target="_blank"
            rel="noopener noreferrer"
            class="hover:text-foreground transition-colors"
        >
            Built by Jude Kim
        </a>
    </footer>
</div>
