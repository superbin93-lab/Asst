import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { loadMessages } from "@/messages";
import { DEFAULT_LOCALE, isAppLocale, LOCALE_COOKIE } from "./config";

/**
 * Locale is a user preference rather than a URL segment: the app is behind a
 * login and every user keeps their own language, so URLs stay unprefixed.
 * The cookie is written on login and whenever the language switcher is used.
 */
export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value;
  const locale = isAppLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  return {
    locale,
    messages: await loadMessages(locale),
    timeZone: "Asia/Ho_Chi_Minh",
    now: new Date(),
  };
});
