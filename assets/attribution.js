(() => {
  const key = 'swell_attribution_v1';
  const allowedEventNames = new Set(['swell_cta_click', 'diagnostic_completed', 'lead_request_saved']);
  const clean = value => String(value || '').replace(/[^a-zA-Z0-9_./:-]/g, '_').slice(0, 120);
  globalThis.va = globalThis.va || function () { (globalThis.vaq = globalThis.vaq || []).push(arguments); };
  globalThis.swellTrack = (name, data = {}) => {
    if (!allowedEventNames.has(name)) return false;
    const safeData = Object.fromEntries(Object.entries(data)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([field, value]) => [clean(field), clean(value)]));
    globalThis.va('event', { name, data: safeData });
    return true;
  };
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
    let externalReferrer = false;
    try { externalReferrer = Boolean(current.referrer && new URL(current.referrer).origin !== location.origin); } catch {}
    const meaningfulTouch = Boolean(current.utmSource || current.utmMedium || current.utmCampaign || current.utmContent || externalReferrer);
    sessionStorage.setItem(key, JSON.stringify({
      firstTouch: existing?.firstTouch || current,
      latestTouch: meaningfulTouch ? current : existing?.latestTouch || current,
      currentPage: current
    }));
  } catch {
    sessionStorage.removeItem(key);
    sessionStorage.setItem(key, JSON.stringify({ firstTouch: current, latestTouch: current }));
  }

  if (typeof document.addEventListener === 'function') {
    document.addEventListener('click', event => {
      const link = event.target.closest?.('a[href]');
      if (!link) return;
      let destination = '';
      try {
        const target = new URL(link.href, location.origin);
        if (target.hostname.endsWith('hubspot.com')) destination = 'fit_review';
        else if (target.pathname.startsWith('/geo-audit')) destination = 'diagnostic';
        else if (target.hostname === 'www.notion.so' || target.pathname.includes('REPRESENTATION_BASELINE_TEMPLATE')) destination = 'template';
        else if (target.pathname.startsWith('/contact')) destination = 'contact';
      } catch {}
      if (!destination) return;
      const targetParams = new URL(link.href, location.origin).searchParams;
      globalThis.swellTrack('swell_cta_click', {
        destination,
        page: location.pathname,
        campaign: targetParams.get('utm_campaign') || params.get('utm_campaign') || '',
        content: targetParams.get('utm_content') || ''
      });
    });
  }

  if (typeof document.createElement === 'function' && !document.querySelector?.('script[src="/_vercel/insights/script.js"]')) {
    const analytics = document.createElement('script');
    analytics.defer = true;
    analytics.src = '/_vercel/insights/script.js';
    document.head?.appendChild(analytics);
  }
})();
