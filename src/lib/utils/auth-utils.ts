export function getKeycloakAccessToken() {
	return JSON.parse(localStorage.getItem('keycloak-credentials') || '{}').clientToken;
}
