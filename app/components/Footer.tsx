import Link from 'next/link'

export default function Footer() {
	return (
		<footer
			style={{
				marginTop: '40px',
				padding: '20px',
				borderTop: '1px solid #2a2a2a',
				textAlign: 'center',
				color: '#aaa'
			}}
		>
			<Link href="/privacy" style={{ color: '#aaa', textDecoration: 'none' }}>
				Privacy & cookies
			</Link>
		</footer>
		)
}