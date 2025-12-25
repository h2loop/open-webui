export class KeycloakService {
	private baseUrl: string;
	private realm: string;
	private clientId: string;
	private clientSecret: string;

	constructor(baseUrl: string, realm: string, clientId: string, clientSecret: string) {
		this.baseUrl = baseUrl;
		this.realm = realm;
		this.clientId = clientId;
		this.clientSecret = clientSecret;
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

		const params = new URLSearchParams({
			grant_type: 'authorization_code',
			code,
			redirect_uri: redirectUri,
			client_id: this.clientId,
			client_secret: this.clientSecret
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
			client_id: this.clientId,
			client_secret: this.clientSecret
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

	getAuthorizationUrl(redirectUri: string, state: string, scope = 'openid profile email'): string {
		const authEndpoint = `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/auth`;

		const params = new URLSearchParams({
			response_type: 'code',
			client_id: this.clientId,
			redirect_uri: redirectUri,
			state,
			scope
		});

		return `${authEndpoint}?${params.toString()}`;
	}

	async logout(refreshToken?: string): Promise<void> {
		const logoutEndpoint = `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/logout`;

		const params = new URLSearchParams({
			client_id: this.clientId,
			client_secret: this.clientSecret
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
