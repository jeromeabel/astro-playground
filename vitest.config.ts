import { getViteConfig } from 'astro/config';
import { passthroughImageService } from 'astro/config';

export default getViteConfig(
  {
    test: {
      environment: 'node',
    },
  },
  {
    image: {
      service: passthroughImageService(),
    },
  }
);
