<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { keycloakAuth } from '$lib/stores/keycloakAuth';

	onMount(async () => {
		const urlParams = new URLSearchParams(window.location.search);
		const code = urlParams.get('code');
		const state = urlParams.get('state');

		if (code && state) {
			try {
				await keycloakAuth.handleCallback(code, state);
			} catch (error) {
				console.error('Callback error:', error);
				goto('/auth?error=Authentication failed');
			}
		} else {
			goto('/auth?error=Invalid callback parameters');
		}
	});
</script>

<div class="flex justify-center items-center h-screen">
	<p>Processing authentication...</p>
</div>
