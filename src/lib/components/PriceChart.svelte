<script lang="ts">
	import { onMount } from 'svelte';
	import { createChart, type IChartApi, type ISeriesApi, ColorType, AreaSeries } from 'lightweight-charts';

	interface Props {
		data: { time: string; value: number }[];
		height?: number;
		positive?: boolean;
	}

	let { data, height = 200, positive = true }: Props = $props();

	let chartContainer: HTMLDivElement;
	let chart: IChartApi | null = null;
	let series: ISeriesApi<"Area"> | null = null;

	onMount(() => {
		if (!chartContainer || !data.length) return;

		chart = createChart(chartContainer, {
			height,
			layout: {
				background: { type: ColorType.Solid, color: 'transparent' },
				textColor: '#787b86',
				fontFamily: "-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif",
				attributionLogo: false,
			},
			grid: {
				vertLines: { color: '#2a2e39' },
				horzLines: { color: '#2a2e39' },
			},
			crosshair: {
				vertLine: { color: '#363a45', width: 1, style: 0 },
				horzLine: { color: '#363a45', width: 1, style: 0 },
			},
			rightPriceScale: {
				borderColor: '#2a2e39',
				scaleMargins: { top: 0.1, bottom: 0.1 },
			},
			timeScale: {
				borderColor: '#2a2e39',
				timeVisible: false,
			},
			handleScroll: false,
			handleScale: false,
		});

		const lineColor = positive ? '#26a69a' : '#ef5350';
		const areaTopColor = positive ? 'rgba(38, 166, 154, 0.28)' : 'rgba(239, 83, 80, 0.28)';
		const areaBottomColor = positive ? 'rgba(38, 166, 154, 0.02)' : 'rgba(239, 83, 80, 0.02)';

		series = chart.addSeries(AreaSeries, {
			lineColor,
			topColor: areaTopColor,
			bottomColor: areaBottomColor,
			lineWidth: 2,
			priceLineVisible: false,
			lastValueVisible: false,
			crosshairMarkerVisible: true,
			crosshairMarkerRadius: 4,
		});

		series.setData(data);
		chart.timeScale().fitContent();

		const resizeObserver = new ResizeObserver(() => {
			if (chart && chartContainer) {
				chart.applyOptions({ width: chartContainer.clientWidth });
			}
		});
		resizeObserver.observe(chartContainer);

		return () => {
			resizeObserver.disconnect();
			chart?.remove();
		};
	});

	$effect(() => {
		if (series && data.length) {
			series.setData(data);
			chart?.timeScale().fitContent();
		}
	});
</script>

<div bind:this={chartContainer} class="w-full"></div>
