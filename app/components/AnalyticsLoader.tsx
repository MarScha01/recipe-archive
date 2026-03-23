'use client'

import { Analytics } from '@vercel/analytics/react'
import { hasAcceptedAnalytics } from '../../lib/cookieConsent'

export default function AnalyticsLoader() {
	if (!hasAcceptedAnalytics()) return null

	return <Analytics />
}