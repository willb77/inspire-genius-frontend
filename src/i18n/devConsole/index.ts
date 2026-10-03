/**
 * The `devConsole` i18n namespace (CC.3) — one JSON file per supported locale.
 *
 * Why the files live here and not in `public/locales/{lng}/`: the namespace is
 * only ever needed by a lazy-loaded super-admin page, and adding a seventh
 * file to every `public/locales/{lng}/` directory would change the shared
 * locale tree (and the locale-tree test's per-directory count) for a page most
 * users never load. Bundling the namespace with the page and registering it
 * with `addResourceBundle` keeps the shared namespaces untouched.
 */
import i18next, { type i18n as I18n } from "i18next";

import ar from "./ar.json";
import de from "./de.json";
import en from "./en.json";
import es from "./es.json";
import fr from "./fr.json";
import hi from "./hi.json";
import id from "./id.json";
import it from "./it.json";
import ja from "./ja.json";
import ko from "./ko.json";
import nb from "./nb.json";
import nl from "./nl.json";
import pl from "./pl.json";
import pt from "./pt.json";
import ru from "./ru.json";
import sq from "./sq.json";
import sv from "./sv.json";
import th from "./th.json";
import tr from "./tr.json";
import vi from "./vi.json";
import zhCN from "./zh-CN.json";

export const DEV_CONSOLE_NS = "devConsole";

export const DEV_CONSOLE_BUNDLES: Record<string, Record<string, unknown>> = {
  en,
  es,
  fr,
  de,
  pt,
  ja,
  ko,
  "zh-CN": zhCN,
  ar,
  hi,
  it,
  nl,
  ru,
  pl,
  tr,
  th,
  vi,
  id,
  sv,
  nb,
  sq,
};

/**
 * Add the namespace to an i18next instance (the app's, by default). Safe to
 * call more than once; waits for `init` if the instance is not set up yet.
 */
export function registerDevConsoleI18n(instance: Pick<I18n, "hasResourceBundle" | "addResourceBundle" | "on" | "store"> = i18next): void {
  const add = () => {
    for (const [lng, resources] of Object.entries(DEV_CONSOLE_BUNDLES)) {
      if (!instance.hasResourceBundle(lng, DEV_CONSOLE_NS)) {
        instance.addResourceBundle(lng, DEV_CONSOLE_NS, resources, true, false);
      }
    }
  };
  if (instance.store) add();
  else instance.on("initialized", add);
}
