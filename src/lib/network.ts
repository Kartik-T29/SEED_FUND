/**
 * Network and URL resolution utilities for reverse proxy deployment behind Nginx.
 */

export function getPublicSiteUrl(): string {
  const siteUrl = process.env.PUBLIC_SITE_URL || 'https://seedfundip.duckdns.org';
  return siteUrl.replace(/\/+$/, '');
}

export function buildAbsoluteUrl(pathname: string): string {
  const base = getPublicSiteUrl();
  const cleanPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${base}${cleanPath}`;
}

export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim();
    if (firstIp) return firstIp;
  }
  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}
