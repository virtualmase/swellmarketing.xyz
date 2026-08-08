(() => {
  const key = 'swell_attribution_v1';
  const params = new URLSearchParams(location.search);
  const current = {
    landingPage: location.pathname + location.search,
    referrer: document.referrer || '',
    utmSource: params.get('utm_source') || '',
    utmMedium: params.get('utm_medium') || '',
    utmCampaign: params.get('utm_campaign') || '',
    utmContent: params.get('utm_content') || '',
    capturedAt: new Date().toISOString()
  };
  try {
    const existing = JSON.parse(sessionStorage.getItem(key) || 'null');
    sessionStorage.setItem(key, JSON.stringify({
      firstTouch: existing?.firstTouch || current,
      latestTouch: current
    }));
  } catch {
    sessionStorage.removeItem(key);
    sessionStorage.setItem(key, JSON.stringify({ firstTouch: current, latestTouch: current }));
  }
})();
