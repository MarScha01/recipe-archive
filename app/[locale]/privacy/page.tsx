'use client'

import { useTranslations } from 'next-intl'

export default function PrivacyPage() {
  const t = useTranslations()

  return (
    <div style={{ padding: '40px 20px', maxWidth: '900px', margin: '0 auto', lineHeight: 1.7 }}>
      <h1 style={{ marginBottom: '20px' }}>
        <b>{t('privacy.title')}</b>
      </h1>

      <p>{t('privacy.intro')}</p>

      <p>{t('privacy.dataCollected')}</p>

      <br />

      <p>{t('privacy.dataUsageTitle')}</p>

      <ul>
        <li>- {t('privacy.use1')}</li>
        <li>- {t('privacy.use2')}</li>
        <li>- {t('privacy.use3')}</li>
      </ul>

      <br />

      <p>{t('privacy.cookies')}</p>

      <p>{t('privacy.noAds')}</p>

      <p>{t('privacy.contact')}</p>

      <br />

      <p>recipe.archives.contact@gmail.com</p>

      <p style={{ marginTop: '30px', color: '#aaa' }}>
        {t('privacy.lastUpdated')}
      </p>
    </div>
  )
}