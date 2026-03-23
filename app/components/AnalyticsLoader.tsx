'use client'

import { useEffect } from 'react'
import { hasAcceptedAnalytics } from '../../lib/cookieConsent'

export default function
AnalyticsLoader() {
	useEffect(() => {
		if (!hasAcceptedAnalytics())
return

// Put analytics initialization here

		console.log('Analytics Allowed')
	}, [])

	return null
}