import * as api from '../api.mjs';
import { formatString } from '../util/string.mjs';

class SecureLinkV2 {
  constructor(productId) {
    this.productId = productId;
    this.templates = {};
  }

  get authenticated() {
    return Object.keys(this.templates).length > 0;
  }

  getUrl(path) {
    if (path.includes(`/content-system/v2/store/${this.productId}/`)) {
      path = path.split(`/content-system/v2/store/${this.productId}/`)[1];
    }

    // TODO fall back to other providers

    const template = this.templates['edgecast'] || this.templates['gwent_edgecast'];

    if (!template) {
      throw new Error(`No edgecast template in set: ${Object.keys(this.templates).join(',')}`);
    }

    const { format, parameters } = template;

    const url = formatString(
      format,
      /{(\w*)}/g,
      { ...parameters, path: `${parameters.path}/${path}` },
    );

    return url;
  }

  async authenticate(session) {
    const authorization = await session.getBearer();
    const link = await api.cs.getSecureLink(this.productId, '/', authorization, 2, 2);

    const templates = {};

    for (const url of link.urls) {
      templates[url.endpoint_name] = {
        format: url.url_format,
        parameters: url.parameters,
        endpoint: url.endpoint_name,
        priority: url.priority,
        supportedGenerations: url.supports_generation,
        maxFails: url.max_fails,
      };
    }

    this.templates = templates;
  }
}

export default SecureLinkV2;
