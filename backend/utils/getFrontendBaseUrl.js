const LOCALHOST_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

const normalizeUrl = (value) => {
  if (!value || typeof value !== 'string') return null;

  try {
    const url = new URL(value.trim());
    return url.origin;
  } catch {
    return null;
  }
};

const isLocalOrigin = (value) => {
  const origin = normalizeUrl(value);
  if (!origin) return false;

  try {
    return LOCALHOST_HOSTS.has(new URL(origin).hostname);
  } catch {
    return false;
  }
};

const getConfiguredOrigins = () => {
  const configured = [
    ...(process.env.FRONTEND_URLS || '').split(','),
    process.env.FRONTEND_URL || '',
  ]
    .map(normalizeUrl)
    .filter(Boolean);

  return [...new Set(configured)];
};

const getRequestOrigin = (req) => {
  const originHeader = req?.get?.('origin');
  const refererHeader = req?.get?.('referer');

  const origin = normalizeUrl(originHeader);
  if (origin) return origin;

  return normalizeUrl(refererHeader);
};

const getFrontendBaseUrl = (req) => {
  const requestOrigin = getRequestOrigin(req);
  const configuredOrigins = getConfiguredOrigins();

  if (requestOrigin) {
    if (configuredOrigins.length === 0 || configuredOrigins.includes(requestOrigin)) {
      return requestOrigin;
    }
  }

  const preferredConfiguredOrigin = configuredOrigins.find((origin) => !isLocalOrigin(origin));
  if (preferredConfiguredOrigin) return preferredConfiguredOrigin;

  if (configuredOrigins[0]) return configuredOrigins[0];
  if (requestOrigin) return requestOrigin;

  return 'http://localhost:5173';
};

export default getFrontendBaseUrl;