import { fetchJson } from '@/services';

export type SubscriberType = {
  id: number;
  name: string;
  username: string;
  email: string;
  address: {
    street: string;
    suite: string;
    city: string;
    zipcode: string;
    geo: {
      lat: string;
      lng: string;
    };
  };
  phone: string;
  website: string;
  company: {
    name: string;
    catchPhrase: string;
    bs: string;
  };
};

export const getSubscribers = async (): Promise<Array<SubscriberType>> => {
  const data = await fetchJson(`http://localhost:4321/api/subscribers/`);
  return data;
};

//  const data = await fetchJson(`${Astro.url.origin}/api/subscribers/`);
