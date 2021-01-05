import Vue from "vue";
import VueI18n from "vue-i18n";
import en from "@/locales/en.json";
import it from "@/locales/it.json";

Vue.use(VueI18n);

function loadMessages() {
    const context = require.context("../locales", true, /[a-z0-9-_]+\.json$/i);
  
    const messages:VueI18n.LocaleMessages = context
      .keys()
      .map((key) => ({ key, locale: key.match(/[a-z0-9-_]+/i)![0] }))
      .reduce(
        (messages, { key, locale }) => ({
          ...messages,
          [locale]: context(key),
        }),
        {}
      );
  
    return { context, messages };
}

const { context, messages } = loadMessages();


/*
export enum Locales {
    EN = 'en',
    IT = 'it',
  }
  
export const LOCALES = [
    { value: Locales.EN, caption: 'English' },
    { value: Locales.IT, caption: 'Italiano' }
  ]

  
export const messages = {
    [Locales.EN]: en,
    [Locales.IT]: it
  };
*/  
  
export const defaultLocale = "en";

// VueI18n instance
export const i18n = new VueI18n({
    locale: defaultLocale,
    fallbackLocale: defaultLocale,
    formatFallbackMessages: true,
    messages,
});


  
// Hot updates
if (module.hot) {
    module.hot.accept(context.id, () => {
      const { messages: newMessages } = loadMessages();
  
      Object.keys(newMessages)
        .filter((locale) => messages[locale]  !== newMessages[locale] )
        .forEach((locale) => {
          messages[locale] = newMessages[locale];
          i18n.setLocaleMessage(locale, messages[locale]);
        });
    });
}
