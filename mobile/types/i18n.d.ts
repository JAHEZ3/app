import 'react-i18next';
import type commonEn from '../locales/en/common.json';
import type authEn from '../locales/en/auth.json';
import type homeEn from '../locales/en/home.json';
import type profileEn from '../locales/en/profile.json';
import type ordersEn from '../locales/en/orders.json';
import type deliveryEn from '../locales/en/delivery.json';

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof commonEn;
      auth: typeof authEn;
      home: typeof homeEn;
      profile: typeof profileEn;
      orders: typeof ordersEn;
      delivery: typeof deliveryEn;
    };
  }
}
