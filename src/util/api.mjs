const GOG_GALAXY_USER_AGENT = 'GOGGalaxyClient/1.2.59.21 (win10 x64)';

const GOG_API_URL = 'https://api.gog.com';
const GOG_CS_URL = 'https://content-system.gog.com';

const GOG_API_HEADERS = {
  'User-Agent': GOG_GALAXY_USER_AGENT,
};
const GOG_CS_HEADERS = {
  'User-Agent': GOG_GALAXY_USER_AGENT,
};

export {
  GOG_API_HEADERS,
  GOG_API_URL,
  GOG_CS_HEADERS,
  GOG_CS_URL,
};
