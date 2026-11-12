import i18n from "i18next";
import {initReactI18next} from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import languages from "../shared/languages.json";
import zhTWCommon from "./locales/zh-TW/common.json";
import zhTWSite from "./locales/zh-TW/site.json";
import zhTWStudio from "./locales/zh-TW/studio.json";
import zhTWGallery from "./locales/zh-TW/gallery.json";
import enCommon from "./locales/en/common.json";
import enSite from "./locales/en/site.json";
import enStudio from "./locales/en/studio.json";
import enGallery from "./locales/en/gallery.json";
import jaCommon from "./locales/ja/common.json";
import jaSite from "./locales/ja/site.json";
import jaStudio from "./locales/ja/studio.json";
import jaGallery from "./locales/ja/gallery.json";

// Interface languages, shared with the API (api/_lib/i18n.ts). Chinese is the
// source language; every key exists there first.
export const LANGUAGES = languages.languages;
export const SOURCE_LANGUAGE = languages.source;
const STORAGE_KEY = "igallery:language";

// One file per language and namespace, so each area of the app owns its own.
// A new namespace has to be imported here.
const resources = {
  "zh-TW": {common: zhTWCommon, site: zhTWSite, studio: zhTWStudio, gallery: zhTWGallery},
  "en": {common: enCommon, site: enSite, studio: enStudio, gallery: enGallery},
  "ja": {common: jaCommon, site: jaSite, studio: jaStudio, gallery: jaGallery},
};

// A browser language maps to the supported language with the same prefix
// (any Chinese gets Traditional Chinese); everything else gets English.
const supported = (tag = "") => {
  const code = tag.toLowerCase();
  const found = LANGUAGES.find((language) => code.startsWith(language.prefix));
  return found ? found.id : languages.unmatched;
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      supportedLngs: LANGUAGES.map((language) => language.id),
      fallbackLng: SOURCE_LANGUAGE,
      defaultNS: "common",
      ns: Object.keys(resources[SOURCE_LANGUAGE] || {}),
      interpolation: {escapeValue: false},
      detection: {
        order: ["localStorage", "navigator"],
        lookupLocalStorage: STORAGE_KEY,
        caches: ["localStorage"],
        convertDetectedLanguage: supported,
      },
      returnNull: false,
    });

const applyDocumentLanguage = (language) => {
  document.documentElement.lang = language;
};
applyDocumentLanguage(i18n.resolvedLanguage || SOURCE_LANGUAGE);
i18n.on("languageChanged", applyDocumentLanguage);

/**
 * The active interface language, e.g. for toLocaleDateString.
 * @return {string} language code
 */
export const currentLanguage = () => i18n.resolvedLanguage || SOURCE_LANGUAGE;

/**
 * Formats a date in the active language.
 * @param {string|number|Date} value the date
 * @param {object} [options] Intl.DateTimeFormat options
 * @return {string} formatted date
 */
export const formatDate = (value, options) => new Date(value).toLocaleDateString(currentLanguage(), options);

/**
 * Formats a date and time in the active language.
 * @param {string|number|Date} value the date
 * @param {object} [options] Intl.DateTimeFormat options
 * @return {string} formatted date and time
 */
export const formatDateTime = (value, options) => new Date(value).toLocaleString(currentLanguage(), options);

/**
 * Formats a time of day in the active language.
 * @param {string|number|Date} value the date
 * @param {object} [options] Intl.DateTimeFormat options
 * @return {string} formatted time
 */
export const formatTime = (value, options) => new Date(value).toLocaleTimeString(currentLanguage(), options);

export default i18n;
