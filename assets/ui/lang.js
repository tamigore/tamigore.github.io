'use strict';

// Lightweight client-side i18n helper to swap text based on data-i18n attributes.
(function () {
    const SUPPORTED_LANGS = ['en', 'fr'];
    const DEFAULT_LANG = 'en';
    const STORAGE_KEY = 'site:lang';
    const DICT_PATH = '/assets/i18n/';

    const dictionaryCache = new Map();
    let currentLang = null;

    const normalizeLang = (lang) => {
        if (!lang) {
            return DEFAULT_LANG;
        }
        const base = lang.toLowerCase().split('-')[0];
        return SUPPORTED_LANGS.includes(base) ? base : DEFAULT_LANG;
    };

    const detectPreferredLanguage = () => {
        const stored = normalizeLang(localStorage.getItem(STORAGE_KEY));
        if (stored) {
            return stored;
        }
        if (Array.isArray(navigator.languages)) {
            for (const lang of navigator.languages) {
                const normalized = normalizeLang(lang);
                if (SUPPORTED_LANGS.includes(normalized)) {
                    return normalized;
                }
            }
        }
        return DEFAULT_LANG;
    };

    const loadDictionary = async (lang) => {
        if (dictionaryCache.has(lang)) {
            return dictionaryCache.get(lang);
        }
        const response = await fetch(`${DICT_PATH}${lang}.json`, { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error(`Failed to load translations for ${lang}`);
        }
        const dict = await response.json();
        dictionaryCache.set(lang, dict);
        return dict;
    };

    const applyTranslations = (dict) => {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach((el) => {
            const key = el.getAttribute('data-i18n');
            if (!key || !(key in dict)) {
                return;
            }
            const value = dict[key];
            const attrList = el.getAttribute('data-i18n-attr');
            if (attrList) {
                const attributes = attrList.split(',').map((attr) => attr.trim()).filter(Boolean);
                attributes.forEach((attr) => {
                    if (attr === 'text') {
                        el.textContent = value;
                    } else if (attr === 'html') {
                        el.innerHTML = value;
                    } else {
                        el.setAttribute(attr, value);
                    }
                });
                return;
            }
            el.textContent = value;
        });
    };

    const updateSwitcherUI = (lang) => {
        document.querySelectorAll('[data-lang-switch]').forEach((btn) => {
            const targetLang = normalizeLang(btn.getAttribute('data-lang-switch'));
            const isActive = targetLang === lang;
            btn.classList.toggle('is-active', isActive);
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    };

    const setLanguage = async (lang) => {
        const targetLang = normalizeLang(lang);
        if (targetLang === currentLang) {
            return;
        }
        try {
            const dict = await loadDictionary(targetLang);
            applyTranslations(dict);
            document.documentElement.lang = targetLang;
            localStorage.setItem(STORAGE_KEY, targetLang);
            currentLang = targetLang;
            updateSwitcherUI(targetLang);
        } catch (error) {
            console.error(error);
            if (targetLang !== DEFAULT_LANG) {
                setLanguage(DEFAULT_LANG);
            }
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        const initialLang = detectPreferredLanguage();
        setLanguage(initialLang);

        document.querySelectorAll('[data-lang-switch]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute('data-lang-switch');
                setLanguage(target);
            });
        });
    });

    window.SiteI18n = {
        setLanguage,
        getCurrentLanguage: () => currentLang ?? detectPreferredLanguage(),
        supportedLanguages: [...SUPPORTED_LANGS]
    };
})();
