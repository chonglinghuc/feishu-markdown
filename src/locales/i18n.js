import { createI18n } from 'vue-i18n';
import en from './en.json';
import zh from './zh.json';
import ja from './ja.json';
import { bitable } from '@lark-base-open/js-sdk';

export const i18n = createI18n({
  locale: 'en',
  allowComposition: true, // 占位符支持
  messages: {
    en: en,
    zh: zh,
    ja: ja,
  },
});

bitable.bridge.getLanguage().then((lang) => {
  i18n.global.locale = lang;
});
