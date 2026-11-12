import i18n from "../i18n";

// How an artwork used AI, as shown to visitors and offered to uploaders.
// `short` is the badge on artwork cards (null: no badge). Labels follow the
// interface language, so read them at render time.
const label = (id, field) => i18n.t(`common:aiUsage.${id}.${field}`);
const usage = (id, hasBadge) => ({
  get name() {
    return label(id, "name");
  },
  get short() {
    return hasBadge ? label(id, "short") : null;
  },
  get hint() {
    return label(id, "hint");
  },
});

export const AI_USAGE = {
  none: usage("none", false),
  assisted: usage("assisted", true),
  generated: usage("generated", true),
  unspecified: usage("unspecified", false),
};

export const AI_CHOICES = ["none", "assisted", "generated"];
