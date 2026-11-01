import { Navigate, useSearchParams } from "@solidjs/router"
import { createEffect, createMemo, ErrorBoundary, Show, type ParentProps } from "solid-js"
import { CommentsProvider } from "@/composer/comments"
import { FileProvider } from "@/workspaces/files/model"
import { useGlobal } from "@/runtime/server/runtime"
import { LocationProvider } from "@/workspaces/location"
import { ModelsProvider } from "@/providers/models/models"
import { ComposerPersistenceProvider } from "@/composer/persistence"
import { ServerProvider, useServer } from "@/runtime/server/current"
import { ServerConnection, useServers } from "@/runtime/server/registry"
import { useTabs, type DraftTab } from "@/shell/tabs/tabs"
import { SessionUIProvider } from "@/shell/routes/session-ui-provider"
import NewSession from "@/new-session/screen"
import { ServerUnavailablePanel } from "@/session/server-unavailable-panel"
import { ErrorPage } from "@/shell/errors/error"
import { SessionPanelFrame, SessionRouteFrame } from "@/session/session-frame"

export function DraftRoute() {
  const [search] = useSearchParams<{ draftId?: string }>()
  const servers = useServers()
  const tabs = useTabs()
  const global = useGlobal()

  const draftTab = createMemo<DraftTab | undefined>(() => {
    if (search.draftId) {
      const found = tabs.store.find((tab): tab is DraftTab => tab.type === "draft" && tab.draftID === search.draftId)
      if (found) return found
    }
    return tabs.store.find((tab): tab is DraftTab => tab.type === "draft")
  })

  createEffect(() => {
    if (!tabs.ready() || servers.list.length === 0) return
    const conn = servers.visible[0] ?? servers.list[0]
    if (!conn) return
    const ctx = global.ensureServerCtx(conn)
    const list = ctx.projects.used()
    const fallbackList = ctx.projects.unique()
    const project = list[0] ?? fallbackList[0]
    const directory = project?.worktree || project?.canonical || ctx.data.location.default().directory || ""

    const currentDraft = draftTab()
    if (currentDraft) {
      if (!currentDraft.directory && directory) {
        tabs.updateDraft(currentDraft.draftID, { directory })
      }
      return
    }

    if (!directory && !ctx.sync.project.ready()) return
    void tabs.newDraft({
      server: ServerConnection.key(conn),
      directory
    })
  })


  return (
    <Show
      when={draftTab()}
      keyed
            fallback={<div class="flex min-h-0 flex-1 items-center justify-center text-xs text-v2-text-text-muted">Loading session...</div>}
    >
      {(draft) => <ResolvedDraftRoute draft={draft} />}
    </Show>
  )
}

function ResolvedDraftRoute(props: { draft: DraftTab }) {
  const global = useGlobal()
  const conn = createMemo(() => {
    const list = global.servers.list()
    if (!list.length) return undefined
    return list.find((item) => ServerConnection.key(item) === props.draft.server) ?? list[0]
  })

  return (
    <Show when={conn()} keyed>
        {(conn) => (
          <ServerProvider conn={conn}>
            <ResolvedDraftContent draft={props.draft} />
          </ServerProvider>
        )}
      </Show>
  )
}

function ResolvedDraftContent(props: { draft: DraftTab }) {
  const server = useServer()
  const dir = () => props.draft.directory || server.ctx.data.location.default().directory || ""


  return (
    <Show
      when={!server.health?.incompatible}
      fallback={
        <SessionRouteFrame padded>
          <SessionPanelFrame raised>
            <ServerUnavailablePanel
              reason="incompatible"
              onClose={() => {
                const index = tabs.store.findIndex((tab) => tab.type === "draft" && tab.draftID === props.draft.draftID)

                if (index !== -1) tabs.closeTab(index)
              }}
            />
          </SessionPanelFrame>
        </SessionRouteFrame>
      }
    >
      <ErrorBoundary
        fallback={(error) => (
          <SessionRouteFrame padded>
            <SessionPanelFrame raised>
              <ErrorPage error={error} />
            </SessionPanelFrame>
          </SessionRouteFrame>
        )}
      >
        <ModelsProvider directory={dir()}>
          <LocationProvider directory={dir()}>
            <SessionUIProvider directory={dir()} server={props.draft.server}>
              <DraftProviders>
                <NewSession draftId={props.draft.draftID} />
              </DraftProviders>
            </SessionUIProvider>
          </LocationProvider>
        </ModelsProvider>
      </ErrorBoundary>
    </Show>
  )
}

// The draft page only renders the prompt composer.
// FileProvider and CommentsProvider stay because Composer uses file search and comment context.
function DraftProviders(props: ParentProps) {
  return (
    <FileProvider>
      <ComposerPersistenceProvider>
        <CommentsProvider>{props.children}</CommentsProvider>
      </ComposerPersistenceProvider>
    </FileProvider>
  )
}
