const appBaseUrl = process.env.AUTH0_BASE_URL;
const auth0Domain = process.env.AUTH0_DOMAIN;

if (appBaseUrl && !process.env.AUTH0_BASE_URL) {
  process.env.AUTH0_BASE_URL = appBaseUrl;
}

if (auth0Domain && !process.env.AUTH0_ISSUER_BASE_URL) {
  process.env.AUTH0_ISSUER_BASE_URL = `https://${auth0Domain}`;
}
