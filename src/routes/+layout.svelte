<script lang="ts">
	import './layout.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Growth Index</title>
	<meta name="description" content="Analyze and compare company growth potential" />
</svelte:head>

{@render children()}
