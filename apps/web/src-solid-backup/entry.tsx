// @refresh reload

import "@/runtime/polyfills"
import { init } from "@sentry/solid"
import { render } from "solid-js/web"
import { AppBaseProviders, AppInterface } from "@/app"
import { loadInitialLocale } from "@/runtime/i18n/language"
import { PlatformProvider } from "@/runtime/platform/platform"
import { createWebPlatform } from "@/runtime/platform/web"
import { isStandalone, PwaRoutePersistence, restorePwaRoute } from "@/runtime/platform/pwa"
import { KeyboardInsets } from "@/runtime/platform/keyboard"
import { authFromToken } from "@/runtime/server/api"
import pkg from "../package.json"
import { ServerConnection } from "@/runtime/server/registry"

const clearAuthToken = () => {
  const params = new URLSearchParams(location.search)
  if (!params.has("auth_token")) return
  params.delete("auth_token")
  history.replaceState(null, "", location.pathname + (params.size ? `?${params}` : "") + location.hash)
}

const web = createWebPlatform(pkg.version)

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => void navigator.serviceWorker.register("/sw.js"), { once: true })
}

if (import.meta.env.VITE_SENTRY_DSN) {
  init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE ?? `web@${pkg.version}`,
    initialScope: {
      tags: {
        platform: "web",
      },
    },
    integrations: (integrations) => {
      return integrations.filter(
        (i) =>
          i.name !== "Breadcrumbs" && !(import.meta.env.OPENCODE_CHANNEL === "prod" && i.name === "GlobalHandlers"),
      )
    },
  })
}

function mount() {
  const root = document.getElementById("root")
  if (!(root instanceof HTMLElement)) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", mount, { once: true })
      return
    }
    console.error("Root element #root not found!")
    return
  }

  if (root.dataset.opencodeMounted !== undefined) return
  root.dataset.opencodeMounted = ""

  console.log("[Sirona] Initializing Sirona desktop interface...")

  void loadInitialLocale()
    .then((locale) => {
      console.log("[Sirona] Locale loaded:", locale)
      const auth = authFromToken(new URLSearchParams(location.search).get("auth_token"))
      clearAuthToken()
      const standalone = isStandalone()
      root.dataset.standalone = String(standalone)

      if (standalone) restorePwaRoute()

      const serverUrl = web.currentServerUrl || location.origin
      const server: ServerConnection.Http = {
        type: "http",
        authToken: !!auth,
        http: {
          url: serverUrl,
          ...auth,
        },
      }

      console.log("[Sirona] Mounting interface for server:", serverUrl)

      render(
        () => (
          <PlatformProvider value={web.platform}>
            <AppBaseProviders locale={locale}>
              <AppInterface
                canonicalLocalServer={ServerConnection.key(server)}
                servers={[server]}
              >
                <KeyboardInsets />
                {standalone && <PwaRoutePersistence />}
              </AppInterface>
            </AppBaseProviders>
          </PlatformProvider>
        ),
        root,
      )
    })
    .catch((err) => {
      console.error("[Sirona] Failed to mount desktop interface:", err)
    })
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount, { once: true })
} else {
  mount()
}
