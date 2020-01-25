const GOG_GALAXY_USER_AGENT = 'GOGGalaxyClient/1.2.59.21 (win10 x64)';
const CHROME_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.97 Safari/537.36';

const GOG_CLIENT_ID = '46899977096215655';
const GOG_CLIENT_SECRET = '9d85c43b1482497dbbce61f6e4aa173a433796eeae2ca8c5f6129f2dc4de46d9';

const GOG_API_URL = 'https://api.gog.com';
const GOG_AUTH_URL = 'https://auth.gog.com';
const GOG_CDN_URL = 'https://cdn.gog.com';
const GOG_CS_URL = 'https://content-system.gog.com';
const GOG_IMAGES_URL = 'https://images.gog.com';
const GOG_WWW_URL = 'https://www.gog.com';

const GOG_API_HEADERS = {
  'User-Agent': GOG_GALAXY_USER_AGENT,
};
const GOG_AUTH_HEADERS = {
  'User-Agent': GOG_GALAXY_USER_AGENT,
};
const GOG_CS_HEADERS = {
  'User-Agent': GOG_GALAXY_USER_AGENT,
};
const GOG_WWW_HEADERS = {
  'User-Agent': CHROME_USER_AGENT,
};

export {
  GOG_API_HEADERS,
  GOG_API_URL,
  GOG_AUTH_HEADERS,
  GOG_AUTH_URL,
  GOG_CDN_URL,
  GOG_CLIENT_ID,
  GOG_CLIENT_SECRET,
  GOG_CS_HEADERS,
  GOG_CS_URL,
  GOG_IMAGES_URL,
  GOG_WWW_HEADERS,
  GOG_WWW_URL,
};
