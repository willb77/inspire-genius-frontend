import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    defaultNS: 'common',
<<<<<<< HEAD
    ns: ['common', 'auth', 'coaching', 'dashboard', 'admin', 'chat', 'userPages', 'prismUi', 'careerDiscoveryPages', 'lumenPages', 'directionPages', 'interviewPages', 'jobFitPages', 'summitPages', 'grantPages', 'kcPages', 'jobBlueprintPages', 'resumeUi', 'authPages', 'joinPages', 'onboardingPages', 'welcomePages', 'distributorPages', 'careerToolsPages', 'companyAdminPages', 'practitionerPages', 'managerPages', 'studioUi', 'shellUi', 'accountUi', 'sharingUi', 'supportUi'],
=======
    ns: ['common', 'auth', 'coaching', 'dashboard', 'admin', 'chat', 'userPages', 'prismUi', 'careerDiscoveryPages', 'lumenPages', 'directionPages', 'interviewPages', 'jobFitPages', 'summitPages', 'grantPages', 'kcPages', 'jobBlueprintPages', 'resumeUi', 'authPages', 'joinPages', 'onboardingPages', 'welcomePages', 'distributorPages', 'careerToolsPages', 'companyAdminPages', 'practitionerPages', 'managerPages', 'studioUi', 'shellUi', 'accountUi', 'orgUi'],
>>>>>>> origin/development
    supportedLngs: ['en', 'es', 'fr', 'de', 'pt', 'ja', 'ko', 'zh-CN', 'ar', 'hi', 'it', 'nl', 'ru', 'pl', 'tr', 'th', 'vi', 'id', 'sv', 'nb', 'sq', 'cs'],
    load: 'currentOnly',

    interpolation: {
      escapeValue: false,
    },

    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    react: {
      useSuspense: false,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
    },
  });

// Dev-only en-XA pseudo-locale (I18N-3). `import.meta.env.DEV` is a build-time constant, so the
// production bundle contains neither this branch nor the module. Not in supportedLngs above and
// not in LanguageSwitcher: switch with i18n.changeLanguage("en-XA") from the dev console.
if (import.meta.env.DEV) {
  void import('./i18nPseudo').then(({ installPseudoLocale }) =>
    installPseudoLocale(i18n, ['common', 'auth', 'coaching', 'dashboard', 'admin', 'chat']),
  );
}

export default i18n;
