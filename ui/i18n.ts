import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
  // For now, we only support en-US
  const locale = 'en-US';

  return {
    locale,
    messages: (await import(`./locales/${locale}/common.json`)).default,
    timeZone: 'America/New_York',
    now: new Date()
  };
});