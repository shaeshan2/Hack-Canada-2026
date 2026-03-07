const auth0Domain = process.env.AUTH0_DOMAIN;

if (auth0Domain && !process.env.AUTH0_ISSUER_BASE_URL) {
  process.env.AUTH0_ISSUER_BASE_URL = `https://${auth0Domain}`;
}
