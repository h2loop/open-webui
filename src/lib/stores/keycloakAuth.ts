import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { KeycloakService } from '$lib/apis/auths/keycloak';
import {
	KEYCLOAK_BASE_URL,
	KEYCLOAK_CLIENT_ID,
	KEYCLOAK_CLIENT_SECRET,
	KEYCLOAK_REALM
} from '$lib/constants';

const AUTH_STATE_KEY = 'keycloak-auth-state';

type AuthCredentials = {
	clientToken: string;
	refreshToken?: string;
	sessionId: string;
	organizationId?: string | null;
};

export const keycloakAuth = (() => {
	const { subscribe, set, update } = writable<{
		isAuthenticated: boolean;
		user: any;
		accessToken: string | null;
		refreshToken: string | null;
	}>({
		isAuthenticated: false,
		user: null,
		accessToken: null,
		refreshToken: null
	});

	let keycloakService: KeycloakService;
	let refreshTimer: NodeJS.Timeout | null = null;

	const initialize = () => {
		if (!browser) return;

		keycloakService = new KeycloakService(
			KEYCLOAK_BASE_URL,
			KEYCLOAK_REALM,
			KEYCLOAK_CLIENT_ID,
			KEYCLOAK_CLIENT_SECRET
		);

		loadCredentials();
	};

	const loadCredentials = () => {
		const stored = localStorage.getItem('keycloak-credentials');
		if (stored) {
			try {
				const credentials: AuthCredentials = JSON.parse(stored);
				set({
					isAuthenticated: true,
					user: null, // Load user info separately
					accessToken: credentials.clientToken,
					refreshToken: credentials.refreshToken || null
				});
				startRefreshTimer();
			} catch (e) {
				console.error('Failed to parse stored credentials', e);
			}
		}
	};

	const storeCredentials = (credentials: AuthCredentials) => {
		localStorage.setItem('keycloak-credentials', JSON.stringify(credentials));
	};

	const clearCredentials = () => {
		localStorage.removeItem('keycloak-credentials');
		localStorage.removeItem(AUTH_STATE_KEY);
		set({
			isAuthenticated: false,
			user: null,
			accessToken: null,
			refreshToken: null
		});
		if (refreshTimer) {
			clearInterval(refreshTimer);
			refreshTimer = null;
		}
	};

	const startRefreshTimer = () => {
		if (refreshTimer) clearInterval(refreshTimer);
		refreshTimer = setInterval(
			async () => {
				await refreshSession();
			},
			50 * 60 * 1000
		); // Refresh every 50 minutes
	};

	const refreshSession = async () => {
		const current = get(keycloakAuth);
		if (!current.refreshToken) return;

		try {
			const tokenData = await keycloakService.refreshToken(current.refreshToken);
			update((state) => ({
				...state,
				accessToken: tokenData.accessToken,
				refreshToken: tokenData.refreshToken || null
			}));
			storeCredentials({
				clientToken: tokenData.accessToken,
				refreshToken: tokenData.refreshToken,
				sessionId: 'session-id' // Generate or use appropriate session ID
			});
		} catch (e) {
			console.error('Failed to refresh token', e);
			clearCredentials();
		}
	};

	const login = async () => {
		const state =
			Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15); // Simple state
		localStorage.setItem(AUTH_STATE_KEY, state);

		const redirectUri = `${window.location.origin}/auth/keycloak/callback`;
		const url = keycloakService.getAuthorizationUrl(redirectUri, state);
		window.location.href = url;
	};

	const handleCallback = async (code: string, state: string) => {
		console.log('Handling Keycloak callback with code:', code, 'and state:', state);
		const storedState = localStorage.getItem(AUTH_STATE_KEY);
		if (state !== storedState) {
			throw new Error('Invalid state parameter');
		}

		const redirectUri = `${window.location.origin}/auth/keycloak/callback`;
		const tokenData = await keycloakService.exchangeCodeForTokens(code, redirectUri);

		localStorage.token = tokenData.accessToken;

		const credentials: AuthCredentials = {
			clientToken: tokenData.accessToken,
			refreshToken: tokenData.refreshToken,
			sessionId: state
		};

		storeCredentials(credentials);

		const userInfo = await keycloakService.getUserInfo(tokenData.accessToken);

		set({
			isAuthenticated: true,
			user: userInfo,
			accessToken: tokenData.accessToken,
			refreshToken: tokenData.refreshToken || null
		});

		startRefreshTimer();
		goto('/');
	};

	const logout = async () => {
		const current = get(keycloakAuth);
		if (current.refreshToken) {
			await keycloakService.logout(current.refreshToken);
		}
		clearCredentials();
		goto('/auth');
	};

	return {
		subscribe,
		initialize,
		login,
		handleCallback,
		logout
	};
})();
