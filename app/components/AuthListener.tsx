'use client'

import { useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function AuthListener(){
	useEffect(() => {
		const { data: listener } = supabase.auth.onAuthStateChange((event) => {
			if (event === 'PASSWORD_RECOVERY') { window.location.href = '/reset-password'}

		})

		return () => {
			listener.subscription.unsubscribe()
		}
	}, [])

	return null
}