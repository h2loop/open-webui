export class KeycloakService {
	private baseUrl: string;
	private realm: string;
	private clientId: string;
	private codeVerifier: string | null = null;
	private codeChallenge: string | null = null;

	constructor(baseUrl: string, realm: string, clientId: string) {
		this.baseUrl = baseUrl;
		this.realm = realm;
		this.clientId = clientId;
	}

	generateCodeVerifier(): string {
		const array = new Uint8Array(32);
		crypto.getRandomValues(array);
		return btoa(String.fromCharCode(...array))
			.replace(/=/g, '')
			.replace(/\+/g, '-')
			.replace(/\//g, '_');
	}

	async generateCodeChallenge(codeVerifier: string): Promise<string> {
		const encoder = new TextEncoder();
		const data = encoder.encode(codeVerifier);
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = new Uint8Array(hashBuffer);
		const hashBase64 = btoa(String.fromCharCode(...hashArray));
		return hashBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
	}

	async exchangeCodeForTokens(
		code: string,
		redirectUri: string
	): Promise<{
		accessToken: string;
		refreshToken?: string;
		idToken?: string;
		expiresIn: number;
	}> {
		const tokenEndpoint = `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token`;

		if (!this.codeVerifier && typeof sessionStorage !== 'undefined') {
			this.codeVerifier = sessionStorage.getItem('keycloak-code-verifier');
		}

		if (!this.codeVerifier) {
			throw new Error(
				'Code verifier not set. Ensure getAuthorizationUrl was called before exchanging code.'
			);
		}

		const params = new URLSearchParams({
			grant_type: 'authorization_code',
			code,
			redirect_uri: redirectUri,
			client_id: this.clientId,
			code_verifier: this.codeVerifier
		});

		const response = await fetch(tokenEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: params.toString()
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(
				`Token exchange failed: ${response.status} ${response.statusText}` +
					(errorData.error_description ? ` - ${errorData.error_description}` : '')
			);
		}

		const data = await response.json();

		// Clear codeVerifier from sessionStorage after successful exchange
		if (typeof sessionStorage !== 'undefined') {
			sessionStorage.removeItem('keycloak-code-verifier');
		}

		return {
			accessToken: data.access_token,
			refreshToken: data.refresh_token,
			idToken: data.id_token,
			expiresIn: data.expires_in
		};
	}

	async getUserInfo(accessToken: string) {
		const userInfoEndpoint = `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/userinfo`;

		const response = await fetch(userInfoEndpoint, {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		});

		if (!response.ok) {
			throw new Error(`User info request failed: ${response.status} ${response.statusText}`);
		}

		return await response.json();
	}

	async refreshToken(refreshToken: string): Promise<{
		accessToken: string;
		refreshToken?: string;
		expiresIn: number;
	}> {
		const tokenEndpoint = `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token`;

		const params = new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: refreshToken,
			client_id: this.clientId
		});

		const response = await fetch(tokenEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: params.toString()
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(
				`Token refresh failed: ${response.status} ${response.statusText}` +
					(errorData.error_description ? ` - ${errorData.error_description}` : '')
			);
		}

		const data = await response.json();

		return {
			accessToken: data.access_token,
			refreshToken: data.refresh_token,
			expiresIn: data.expires_in
		};
	}

	async getAuthorizationUrl(
		redirectUri: string,
		state: string,
		scope = 'openid profile email'
	): Promise<string> {
		const authEndpoint = `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/auth`;

		this.codeVerifier = this.generateCodeVerifier();
		this.codeChallenge = await this.generateCodeChallenge(this.codeVerifier);

		// Store codeVerifier in sessionStorage for use after redirect
		if (typeof sessionStorage !== 'undefined') {
			sessionStorage.setItem('keycloak-code-verifier', this.codeVerifier);
		}

		const params = new URLSearchParams({
			response_type: 'code',
			client_id: this.clientId,
			redirect_uri: redirectUri,
			state,
			scope,
			code_challenge: this.codeChallenge,
			code_challenge_method: 'S256'
		});

		return `${authEndpoint}?${params.toString()}`;
	}

	async logout(refreshToken?: string): Promise<void> {
		const logoutEndpoint = `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/logout`;

		const params = new URLSearchParams({
			client_id: this.clientId
		});

		if (refreshToken) {
			params.append('refresh_token', refreshToken);
		}

		const response = await fetch(logoutEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: params.toString()
		});

		if (!response.ok) {
			console.warn(`Logout request failed: ${response.status} ${response.statusText}`);
		}
	}
}
