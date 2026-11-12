import * as React from "react";
import PropTypes from "prop-types";
import {useTranslation} from "react-i18next";
import {LANGUAGES} from "../i18n";

/**
 * A plain <select> of the interface languages. Style it through `className`
 * (or `style`) so it fits the MUI site, the studio and the 3D gallery alike.
 * @return {LanguageSwitcher} switcher
 */
const LanguageSwitcher = ({className, style, short = false}) => {
  const {t, i18n} = useTranslation();
  return (
    <select
      className={className}
      style={style}
      value={i18n.resolvedLanguage}
      onChange={(event) => i18n.changeLanguage(event.target.value)}
      aria-label={t("language")}
    >
      {LANGUAGES.map((language) => (
        <option key={language.id} value={language.id}>{short ? language.short : language.name}</option>
      ))}
    </select>
  );
};

LanguageSwitcher.propTypes = {
  className: PropTypes.string,
  style: PropTypes.object,
  short: PropTypes.bool,
};

export default LanguageSwitcher;
