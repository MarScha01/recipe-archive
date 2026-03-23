export const CONSENT_KEY = 'recipe_archives_cookie_consent_v1'

export function getCookieConsent() {
	if (typeof window === 'undefined')
return null
	return localStorage.getItem(CONSENT_KEY)
}

export function hasAcceptedAnalytics()
{
	return getCookieConsent() === 'accepted'
}