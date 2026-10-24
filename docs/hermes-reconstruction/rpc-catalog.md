# Complete declared gateway wire catalog

Exact shapes are in master-rpc-contract.json and gateway-openrpc.json, copied from generated local OpenRPC. Call links are static literal sites, not proof of runtime use. Canonical entries override matching shared names; do not count same-name entries as two independently active endpoints.

| Catalog | Method/event/request | Input | Output | Literal frontend sites | Purpose |
|---|---|---|---|---:|---|
| methods | agents.list | AgentsListParams | AgentsListResult | 0 | Registry-wide background process summary for ``/agents``. |
| methods | approval.pending | ApprovalPendingParams | ApprovalPendingResult | 0 | Replay the approvals still waiting on this session (reconnect / polling). |
| methods | approval.received | ApprovalReceivedParams | ApprovalReceivedResult | 0 | Tell the backend the card is on screen, so its timeout clock starts. |
| methods | approval.respond | ApprovalRespondParams | ApprovalRespondResult | 0 | Deliver the user's decision on a dangerous command (falls back to durable identity on a stale sid). |
| methods | billing.auto_reload | BillingAutoReloadParams | BillingMutationResult | 0 | Enable/disable auto top-up with its threshold and reload amount (billing:manage). |
| methods | billing.charge | BillingChargeParams | BillingChargeResult | 0 | Start a one-off top-up charge (billing:manage, idempotent). |
| methods | billing.charge_status | BillingChargeStatusParams | BillingChargeStatusResult | 0 | Poll one charge by id. |
| methods | billing.keep_going_on_credits | BillingKeepGoingOnCreditsParams | BillingMutationResult | 0 | Window plans: turn 'Keep going on credits' on/off (billing:manage). |
| methods | billing.state | ProfileParams | BillingStateResult | 0 | Read-only billing view (no scope); the Nous free tier is answered locally without a portal call. |
| methods | billing.step_up | BillingStepUpParams | BillingStepUpResult | 0 | Run the billing:manage device flow; the URL/code arrive via billing.step_up.verification. |
| methods | bot_relay.deliver | BotRelayDeliverParams | BotRelayDeliverResult | 0 | Deliver a relayed DM into a Bot Chat on this gateway and return the one-turn reply (blocking). |
| methods | bot_relay.outbox.drain | BotRelayOutboxDrainParams | BotRelayOutboxDrainResult | 0 | Atomically claim every pending cross-connection envelope queued on this gateway. |
| methods | bot_relay.reply | BotRelayReplyParams | OkResult | 0 | Write a relayed reply and/or typed error for an envelope so the sender-side waiter resolves. |
| methods | bot_relay.roster.sync | BotRelayRosterSyncParams | BotRelayRosterSyncResult | 0 | Replace this gateway's view of agents on other connections; answers the accepted row count. |
| methods | browser.controller.detach | BrowserControllerParams | BrowserControllerDetachResult | 0 | Hard-detach only the controller owned by this authenticated transport. |
| methods | browser.controller.heartbeat | BrowserControllerParams | OkResult | 0 | Acknowledge a heartbeat only for this transport's own attached controller. |
| methods | browser.controller.register | BrowserControllerRegisterParams | BrowserControllerRegisterResult | 0 | Attach this connection as the browser controller for one session; fails closed (4403). |
| methods | browser.controller.result | BrowserControllerResultParams | BrowserControllerResultResult | 0 | Deliver one command result to the broker; accepted is false for unknown or settled command ids. |
| methods | browser.manage | BrowserManageParams | BrowserManageResult | 0 | Inspect, attach to, or drop the CDP browser the tools use, or switch Browser Use mode (``use``, applies to new sessions); ``messages`` narrate a connect. |
| methods | clarify.lock | ClarifyLockParams | ClarifyLockResult | 0 | Lock one answer of a batch clarify request (editable until every question is locked). |
| methods | cli.exec | CliExecParams | CliExecResult | 1 | Run ``hermes <argv>`` non-interactively and capture its output; ``blocked`` explains a refusal. |
| methods | client.capabilities | ClientCapabilitiesParams | ClientCapabilitiesResult | 2 | What the calling client handles, sent once per connection (after gateway.ready); returns the server→client request methods this backend may send. |
| methods | clipboard.paste | ClipboardPasteParams | AttachedImageResult | 0 | Save the host clipboard image into the session and queue it for the next turn. |
| methods | command.dispatch | CommandDispatchParams | CommandDispatchResult | 0 | Run a quick/plugin/bundle/skill/built-in slash command and answer a structured directive. |
| methods | command.resolve | CommandResolveParams | CommandResolveResult | 0 | Canonical registry command for a name or alias. |
| methods | commands.catalog | CommandsCatalogParams | CommandsCatalogResult | 0 | Categorized slash metadata (registry, quick, plugin, skill) for completion menus. |
| methods | complete.path | CompletePathParams | CompletionItemsResult | 0 | Path / @-reference completions for the composer (files, folders, profiles, plugin providers). |
| methods | complete.slash | CompleteSlashParams | CompleteSlashResult | 0 | Ranked slash-command / skill completions for a ``/`` token. |
| methods | config.get | ConfigGetParams | ConfigGetResult | 0 | Read one normalised config value (or the whole effective config) the way the UIs render it. |
| methods | config.set | ConfigSetParams | ConfigSetResult | 1 | Change one config key (persisted or session-scoped) and read back the normalised value. |
| methods | config.show | ConfigShowParams | ConfigShowResult | 0 | Masked, display-ready config summary (model / agent / environment rows). |
| methods | connection.respond | ConnectionRespondParams | ConnectionRespondResult | 1 | Per-target outcomes from the card, and an optional Continue. |
| methods | connectors.accounts | ConnectorAccountsParams | ConnectorAccountsResult | 0 | The scoped member's hosted connector accounts, optionally filtered by connector slug. |
| methods | connectors.accounts.remove | ConnectorAccountsRemoveParams | ConnectorAccountsRemoveResult | 0 | Remove one hosted connector account owned by the scoped member. |
| methods | connectors.accounts.rename | ConnectorAccountsRenameParams | ConnectorAccountRow | 0 | Name or rename one hosted connector account owned by the scoped member. |
| methods | connectors.catalog | ProfileParams | ConnectorsCatalogResult | 0 | The hosted connector catalog available to the scoped member. |
| methods | connectors.connect | ConnectorsConnectParams | ConnectorsConnectResult | 0 | Start or re-initiate authorization for named connectors on a session or account operation. |
| methods | connectors.list | ConnectorsListParams | ConnectorsListResult | 0 | Connector catalog + connection state for one session or profile account owner. |
| methods | connectors.operation.status | ConnectionOperationParams | ConnectionOperationStatus | 0 | The current snapshot of one open session or account operation. |
| methods | connectors.operation.wake | ConnectionOperationParams | ConnectionWakeResult | 0 | The browser leg came back (hermes://connections/done): read the accounts now, not at the next tick. |
| methods | connectors.policy.get | ProfileParams | ConnectorPolicyGetResult | 0 | Policy layers for the scoped member, from organization to member scope. |
| methods | connectors.policy.set | ConnectorPolicySetParams | ConnectorPolicySetResult | 0 | Apply one scoped member connector or tool-list policy change. |
| methods | connectors.tools | ConnectorToolsParams | ConnectorToolsResult | 0 | The scoped profile's cached or current tool list for one connector. |
| methods | cron.manage | CronManageParams | CronManageResult | 0 | List/add/remove/pause/resume cron jobs in the (optionally profile-scoped) cron store. |
| methods | delegation.pause | DelegationPauseParams | DelegationPauseResult | 0 | Block/unblock NEW spawns globally (active children keep running); returns the new state. |
| methods | delegation.status | ProfileParams | DelegationStatusResult | 0 | Running subagent tree plus the spawn pause flag and limits. |
| methods | diagnostics.share_nous | DiagnosticsShareNousParams | DiagnosticsShareNousResult | 1 | Upload a force-redacted debug bundle to Nous-internal diagnostics storage. |
| methods | display.install | ProfileParams | DisplayInstallResult | 0 | Run the distro package install on the gateway host; progress streams as display.install.log/.done. |
| methods | display.lease.acquire | DisplayLeaseAcquireParams | DisplayLeaseResult | 0 | Take over: the human named by a viewer id this connection minted controls the screen. |
| methods | display.lease.release | DisplayLeaseReleaseParams | DisplayLeaseResult | 0 | Hand back. Without a viewer id the release is refused while a human holds unless force. |
| methods | display.observe | DisplayObserveParams | DisplayObserveResult | 0 | Mint a single-use ticket for /api/display/ws and the server-minted viewer id for this connection. |
| methods | display.start | ProfileParams | DisplayStatus | 0 | Start this profile's Xvnc + Xfce (idempotent); blocks until the display is published. |
| methods | display.status | ProfileParams | DisplayStatus | 2 | Runtime + lease snapshot for this profile's screen. |
| methods | display.stop | DisplayStopParams | DisplayStopResult | 0 | Stop the screen. Refused (5300, code viewer_mismatch) while a human holds unless force. |
| methods | display.switchSandboxImage | DisplaySwitchSandboxImageParams | DisplaySwitchSandboxImageResult | 0 | Decide the pending default sandbox image switch for this profile; refused when none is pending. |
| methods | display.thumbnail | ProfileParams | DisplayThumbnailResult | 0 | One JPEG grab of the bot's screen; read-only, never changes the lease. |
| methods | file.attach | FileAttachParams | FileAttachResult | 0 | Stage a non-image file into the session workspace and hand back its @file: ref. |
| methods | free_tier.ack_notice | ProfileParams | FreeTierAckNoticeResult | 0 | Mark the one-time availability notice as shown on the free-tier identity. |
| methods | free_tier.challenge_result | FreeTierChallengeResultParams | FreeTierChallengeResult | 0 | Report a browser window outcome for the matching pending attempt; mint remains authoritative. |
| methods | free_tier.claim_nudge | FreeTierClaimNudgeParams | FreeTierClaimNudgeResult | 0 | Claim the due sign-in offer; true for exactly one caller each time an offer comes due. |
| methods | free_tier.provision | ProfileParams | FreeTierProvisionResult | 0 | Explicit retry of the free-tier identity mint when the boot bootstrap could not create it. |
| methods | free_tier.status | ProfileParams | FreeTierStatusResult | 0 | Pure read of the focused profile's free-tier identity state (no network, no side effects). |
| methods | gateway.capabilities | PingParams | GatewayCapabilitiesResult | 0 | What THIS build enforces (a client withholds a feature unless advertised). |
| methods | groups.approve | GroupsApproveParams | GroupsApproveResult | 0 | Resolve one exact pending approval raised by a local or peer room member. |
| methods | groups.capabilities | GroupsCapabilitiesParams | GroupsCapabilitiesResult | 0 | Describe the hosted-room protocol implemented by this gateway. |
| methods | groups.create | GroupsCreateParams | GroupsCreateResult | 0 | Create a hosted room idempotently; authority is this gateway's stable install identity. |
| methods | groups.demote | GroupsDemoteParams | GroupsDemoteResult | 0 | Fence this gateway's stale room authority against a proven newer epoch. |
| methods | groups.disband | GroupsDisbandParams | GroupsDisbandResult | 0 | Permanently tombstone a hosted room id after stopping its work and revoking peer routes. |
| methods | groups.list | GroupsListParams | GroupsListResult | 0 | List rooms hosted by this gateway, most recently changed first. |
| methods | groups.log | GroupsLogParams | GroupsLogResult | 0 | A monotonic room-log delta after since_seq, bounded by count and page bytes. |
| methods | groups.peer.invite | GroupsPeerInviteParams | GroupsPeerInviteResult | 0 | Mint one target-issued room/profile grant for a prospective room home. |
| methods | groups.peer.register | GroupsPeerRegisterParams | GroupsPeerRegisterResult | 0 | Register and probe one scoped peer route on the room home. |
| methods | groups.peer.revoke | GroupsPeerRevokeParams | GroupsPeerRevokeResult | 0 | Revoke one target-issued grant using its exact profile scope. |
| methods | groups.promote | GroupsPromoteParams | GroupsPromoteResult | 0 | Continue a replicated room on this gateway at epoch + 1; requires confirm=true. |
| methods | groups.rename | GroupsRenameParams | GroupsRenameResult | 0 | Rename one hosted room atomically with its replay event. |
| methods | groups.replica_state | GroupsReplicaStateParams | GroupsReplicaStateResult | 0 | The local replica's coverage and authority lineage for one room. |
| methods | groups.replicate | GroupsReplicateParams | GroupsReplicateResult | 0 | Persist one authority-stamped replay page into the local replica store; idempotent. |
| methods | groups.retry | GroupsRetryParams | GroupsRetryResult | 0 | Retry one indeterminate room task after explicit user confirmation. |
| methods | groups.send | GroupsSendParams | GroupsSendResult | 0 | Append one inert message.user event idempotently; the actor is server-owned. |
| methods | groups.state | GroupsStateParams | GroupsStateResult | 0 | One hosted room's replay cursor and fenced authority state, plus live driver status. |
| methods | groups.stop | GroupsStopParams | GroupsStopResult | 0 | Durably cancel queued or running work for one hosted room. |
| methods | handoff.fail | HandoffFailParams | HandoffFailResult | 0 | Fail a not-yet-claimed handoff (client poll timeout); CAS against the watcher. |
| methods | handoff.request | HandoffRequestParams | HandoffRequestResult | 0 | Queue a handoff to a messaging platform's home channel; the gateway watcher claims it. |
| methods | handoff.state | SessionParams | HandoffStateResult | 0 | Poll the handoff row for this session. |
| methods | i18n.catalog | I18nCatalogParams | I18nCatalogResult | 0 | Pack + overlay messages for one language and surface; the renderer merges them over its bundled catalog. |
| methods | i18n.languages | ProfileParams | I18nLanguagesResult | 0 | Every language some layer supplies (bundled ∪ user overlay ∪ plugin packs), en first. |
| methods | image.attach | ImageAttachParams | AttachedImageResult | 0 | Queue a gateway-visible image file for the next turn. |
| methods | image.attach_bytes | ImageAttachBytesParams | AttachedImageResult | 0 | Queue an image uploaded as base64 (remote client); reply mirrors image.attach. |
| methods | image.detach | ImageDetachParams | ImageDetachResult | 0 | Drop a queued image before the turn is sent. |
| methods | image.generate | ImageGenerateParams | ImageGenerateResult | 4 | Generate an image through the tool's provider dispatcher and hand the renderer a data URL. |
| methods | input.detect_drop | InputDetectDropParams | InputDetectDropResult | 0 | Recognise a terminal file drop pasted into the composer and turn it into an attachment. |
| methods | insights.get | InsightsGetParams | InsightsGetResult | 0 | Session/message counts over the last ``days`` for the (optionally scoped) profile store. |
| methods | learning.delete | LearningNodeParams | LearningMutationResult | 0 | Archive a skill (restorable via curator) or remove a memory chunk. |
| methods | learning.detail | LearningNodeParams | LearningDetailResult | 0 | Node content (SKILL.md or memory chunk) for an edit prefill. |
| methods | learning.edit | LearningEditParams | LearningMutationResult | 0 | Rewrite a node's content (SKILL.md or memory chunk). |
| methods | learning.frames | LearningFramesParams | LearningFramesResult | 0 | Pre-render the /journey timeline (frames + legend/summary) so the TUI walks it locally. |
| methods | llm.oneshot | LlmOneshotParams | LlmOneshotResult | 0 | Stateless one-shot LLM completion (titles, ideas) on the session's or the task backend. |
| methods | machine.facts | Params | MachineFactsResult | 0 | Facts about the machine running this backend and its OS account, for the desktop first run. |
| methods | mcp.catalog | ProfileParams | McpCatalogResult | 0 | Curated MCP presets with per-profile installed/enabled state and the env keys each needs. |
| methods | mcp.servers.add | McpServersAddParams | McpServersAddResult | 0 | Add a server to the profile's config from a catalog preset and/or an explicit config. |
| methods | mcp.servers.list | ProfileParams | McpServersListResult | 0 | Configured MCP servers for the (scoped) profile, secrets redacted to env-key names. |
| methods | mcp.servers.oauth.callback | McpOauthCallbackParams | McpOauthCallbackResult | 0 | Relay a client-captured redirect into a client_redirect_uri flow. |
| methods | mcp.servers.oauth.cancel | McpOauthFlowParams | McpOauthCancelResult | 0 | Cancel a flow owned by the resolved profile, waking its callback worker. |
| methods | mcp.servers.oauth.poll | McpOauthFlowParams | McpOauthPollResult | 0 | Poll a flow; approved persists tokens for the profile and returns the probed tools. |
| methods | mcp.servers.oauth.start | McpOauthStartParams | McpOauthStartResult | 0 | Begin a PKCE OAuth flow; the client opens auth_url and polls mcp.servers.oauth.poll. |
| methods | mcp.servers.remove | McpServerNameParams | McpServersRemoveResult | 0 | Drop a server from the profile's config.yaml. |
| methods | mcp.servers.set_api_key | McpServersSetApiKeyParams | McpServersSetApiKeyResult | 0 | Store a credential in the profile's .env and reference it from the server config (header or env). |
| methods | mcp.servers.status | ProfileParams | McpServersStatusResult | 0 | Cached runtime state per configured server; never connects, probes, or starts auth. |
| methods | mcp.servers.test | McpServerNameParams | McpServersTestResult | 0 | Connect, list tools, disconnect — an OAuth server with no token on disk is reported as not ok. |
| methods | message.react | MessageReactParams | MessageReactResult | 0 | Set/clear one author's emoji reaction on a message; returns the row's full reaction list. |
| methods | model.disconnect | ModelDisconnectParams | ModelDisconnectResult | 0 | Remove every credential (env keys and OAuth state) for a provider. |
| methods | model.options | ModelOptionsParams | ModelOptionsResult | 0 | Provider/model inventory for the picker, layered over the session's live provider when given. |
| methods | model.save_key | ModelSaveKeyParams | ModelSaveKeyResult | 0 | Save an API key for a provider and return its refreshed inventory row. |
| methods | onboarding.set_run | OnboardingSetRunParams | OnboardingRunStateResult | 0 | Write onboarding.run in the root profile's config.yaml; answers the new state. |
| methods | onboarding.skip | OnboardingSkipParams | OnboardingSkipResult | 0 | Skip setup: end the session's onboarding run and close the card that waits. |
| methods | onboarding.start | OnboardingStartParams | OnboardingStartResult | 0 | Open the onboarding chat in the default profile: create it, write its run record and play the opening. |
| methods | onboarding.state | OnboardingStateParams | OnboardingRunStateResult | 0 | Whether desktop first-run onboarding is due, and the chat in progress; reads the root profile's config. |
| methods | paste.collapse | PasteCollapseParams | PasteCollapseResult | 0 | Spill a large paste to a file and hand back the inline placeholder. |
| methods | pdf.attach | PdfAttachParams | PdfAttachResult | 0 | Render a PDF's pages to PNG and queue them as images for the next turn. |
| methods | pet.cancel | PetCancelParams | PetCancelResult | 0 | Stop an in-flight pet generate/hatch by token (idempotent). |
| methods | pet.cells | PetCellsParams | PetCellsResult | 0 | Half-block cell frames (or a kitty placement) for one pet state. |
| methods | pet.disable | ProfileParams | OkResult | 0 | Turn the pet display off from the desktop picker. |
| methods | pet.export | PetSlugParams | PetExportResult | 0 | Export an installed pet as a re-importable .zip. |
| methods | pet.gallery | PetGalleryParams | PetGalleryResult | 1 | Petdex gallery + local install state (installed-only offline); localOnly skips the remote manifest. |
| methods | pet.generate | PetGenerateParams | PetGenerateResult | 0 | Candidate base looks for a new pet (draft step); drafts also stream via pet.generate.progress. |
| methods | pet.generate.status | ProfileParams | PetGenerateStatusResult | 0 | Whether pet generation is possible (a reference-capable image backend) and which providers. |
| methods | pet.hatch | PetHatchParams | PetHatchResult | 0 | Turn a base draft into a full spritesheet pet; progress streams via pet.hatch.progress. |
| methods | pet.info | PetInfoParams | PetInfoResult | 0 | Active pet for sprite renderers: spritesheet (base64) + frame geometry + state-row taxonomy. |
| methods | pet.info.meta | ProfileParams | PetInfoMetaResult | 0 | Cheap active-pet metadata used to avoid full payload refreshes. |
| methods | pet.remove | PetSlugParams | PetSlugResult | 0 | Uninstall a pet (delete its directory); if it was active, turn the display off. |
| methods | pet.rename | PetRenameParams | PetSlugResult | 0 | Rename a pet's display name + realign its slug/dir; follows the active slug in config. |
| methods | pet.scale | PetScaleParams | PetScaleResult | 0 | Persist display.pet.scale (clamped to engine bounds) from the desktop slider. |
| methods | pet.select | PetSlugParams | PetSlugResult | 0 | Adopt a pet: install (if needed) + activate; writes display.pet.* to config. |
| methods | pet.thumb | PetThumbParams | PetThumbResult | 1 | Idle-frame PNG data URI for the picker (desktop CSP breaks CDN <img>). |
| methods | ping | PingParams | PingResult | 3 | Cheapest liveness probe; answered on the WS reader thread even while every agent is mid-turn. |
| methods | plugins.catalog.lookup | PluginCatalogLookupParams | PluginCatalogLookupResult | 0 | One curated plugin-catalog entry by name, from the backend's live catalog (cached, with the in-tree fallback and kill list); backs hermes://plugin/install?catalog= deep links. |
| methods | plugins.list | PluginsListParams | PluginsListResult | 0 | Loaded plugin manager entries (legacy flat view); the Plugins Hub uses plugins.manage list. |
| methods | plugins.manage | PluginsManageParams | PluginsManageResult | 0 | Plugins Hub backend: list installed plugins, toggle, git-install, re-pin a catalog install, or remove a user install. |
| methods | preview.restart | PreviewRestartParams | TaskIdResult | 0 | Spawn a hidden agent that brings the desktop preview's dev server back up. |
| methods | process.kill | ProcessKillParams | ProcessKillResult | 0 | Kill one background process the caller's session owns and return its output snapshot. |
| methods | process.list | ProcessListParams | ProcessListResult | 0 | Background processes owned by the caller's session (desktop status stack poll). |
| methods | process.stop | ProcessStopParams | ProcessStopResult | 0 | ``/stop``: on the shared owner, kill the background processes ``session_id`` owns (required); a standalone sidecar kills every process it holds. Answers the count killed. |
| methods | profiles.configure | ProfilesConfigureParams | ProfilesConfigureResult | 2 | Editor Save: apply any subset of a profile's sections and report each one. |
| methods | profiles.create | ProfilesCreateParams | ProfilesCreateResult | 0 | Create a profile (ws twin of POST /api/profiles), mirroring launch credentials by default. |
| methods | profiles.describe | ProfileNameParams | ProfilesDescribeResult | 1 | Everything the profile editor shows: soul, model pin, skills, toolsets, MCP servers. |
| methods | profiles.get_asset | ProfilesGetAssetParams | ProfilesGetAssetResult | 1 | A profile asset as a data URL. |
| methods | profiles.list | ProfilesListParams | ProfilesListResult | 3 | Roster of profiles with previews so a client paints without N follow-up calls. |
| methods | profiles.set_asset | ProfilesSetAssetParams | ProfilesSetAssetResult | 2 | Store or clear a profile asset (avatar) atomically. |
| methods | project.facts | ProjectFactsParams | ProjectFactsResult | 0 | Structured project facts for a cwd so UIs don't re-sniff the workspace. |
| methods | projects.add_folder | ProjectsAddFolderParams | ProjectResult | 0 | Attach a folder to a project (optionally as its primary path). |
| methods | projects.archive | ProjectsArchiveParams | ProjectsPayload | 0 | Archive (or with ``restore`` un-archive) a project; answers the full listing. |
| methods | projects.create | ProjectsCreateParams | OptionalProjectResult | 0 | Create a project from a name + folders; duplicate primary paths are refused (5063). |
| methods | projects.delete | ProjectIdParams | ProjectsPayload | 0 | Delete a project and its folders; answers the full listing. |
| methods | projects.discover_repos | ProjectsDiscoverReposParams | ProjectsDiscoverReposResult | 0 | Repos for the desktop overview: scanned-from-disk (cached) ∪ session-derived. |
| methods | projects.for_cwd | ProjectsForCwdParams | ProjectsForCwdResult | 0 | Which project (if any) owns a directory, plus the resolved cwd and its git branch. |
| methods | projects.get | ProjectIdParams | ProjectResult | 0 | One stored project with its folders. |
| methods | projects.list | ProfileParams | ProjectsPayload | 0 | Every project of the profile (archived included) plus which one is active. |
| methods | projects.project_sessions | ProjectsProjectSessionsParams | ProjectsProjectSessionsResult | 0 | Fully hydrated lanes for one project, from the same grouping as projects.tree. |
| methods | projects.record_repos | ProjectsRecordReposParams | ProjectsRecordReposResult | 0 | Persist repo roots found by the client's (desktop-side) scan; return the merged list. |
| methods | projects.remove_folder | ProjectFolderParams | ProjectResult | 0 | Detach a folder from a project. |
| methods | projects.set_active | ProjectsSetActiveParams | ActiveIdResult | 0 | Switch (or clear) the active project for the profile. |
| methods | projects.set_primary | ProjectFolderParams | ProjectResult | 0 | Make one attached folder the project's primary path. |
| methods | projects.tree | ProjectsTreeParams | ProjectsTreeResult | 0 | Project → repo → lane overview with counts and a few preview sessions per project. |
| methods | projects.update | ProjectsUpdateParams | ProjectResult | 0 | Patch a project's display fields; answers the refreshed project. |
| methods | prompt.background | SideAgentParams | TaskIdResult | 0 | Run a task on a fresh agent in the background; the answer arrives as background.complete. |
| methods | prompt.btw | SideAgentParams | TaskIdResult | 0 | Side question over a snapshot of the live conversation; the answer arrives as btw.complete. |
| methods | prompt.submit | PromptSubmitParams | PromptSubmitResult | 1 | Send a user turn to a live session; busy sessions queue / steer / redirect instead of refusing. |
| methods | reload.env | ReloadEnvParams | ReloadEnvResult | 0 | Re-read ~/.hermes/.env (CLI /reload parity); built agents keep their pool until /new. |
| methods | reload.mcp | ReloadMcpParams | ReloadMcpResult | 0 | Tear down and rediscover MCP servers for every live session (prompt cache is invalidated). |
| methods | request.answer | RequestAnswerParams | RequestAnswerResult | 0 | Answer an open server→client request from a client that never received the frame. |
| methods | rollback.diff | RollbackDiffParams | RollbackDiffResult | 0 | Diff between a checkpoint and the working tree, with an ANSI rendering sized to the TUI. |
| methods | rollback.list | RollbackListParams | RollbackListResult | 0 | Checkpoints for the session's cwd; ``enabled: false`` when checkpointing is off. |
| methods | rollback.restore | RollbackRestoreParams | RollbackRestoreResult | 0 | Restore the working tree (or one file) to a checkpoint by hash or 1-based index. |
| methods | session.activate | SessionActivateParams | SessionActivateResult | 0 | Attach the frontend to a live session without closing the previously focused one. |
| methods | session.active_list | SessionActiveListParams | SessionActiveListResult | 0 | Live sessions in this process, insertion order (not a DB browser). |
| methods | session.archive | SessionArchiveParams | SessionArchiveResult | 0 | Set/clear archived (soft-hide, messages kept) on a session + lineage; Desktop PATCH parity. |
| methods | session.branch | SessionBranchParams | SessionBranchResult | 0 | Fork a live session into a new stored child that shares the parent's history so far. |
| methods | session.branch_stored | SessionBranchStoredParams | SessionBranchStoredResult | 0 | Whole-session branch of a stored parent: the owning backend reads and copies the transcript, which never crosses the wire (a separate method so an older gateway fails loudly, not with an empty branch). |
| methods | session.branch_whole | SessionBranchWholeParams | SessionBranchWholeResult | 0 | session.branch of the whole history without echoing the copied transcript back. |
| methods | session.close | SessionCloseParams | SessionCloseResult | 0 | Tear down a live session (its stored row stays resumable). |
| methods | session.compress | SessionCompressParams | SessionCompressResult | 0 | Manual /compress of an idle session, optionally focused on a topic. |
| methods | session.context_breakdown | SessionContextBreakdownParams | SessionContextBreakdownResult | 0 | Cursor-style split of the context window by category. |
| methods | session.control | SessionControlParams | SessionControlResult | 0 | Run one allowlisted goal / loop / subgoal / heartbeat action and return the exact resulting snapshot. |
| methods | session.control.read | SessionControlReadParams | SessionControlReadResult | 0 | Stable, allowlisted snapshot of one live session's goal / loop / heartbeat state. |
| methods | session.create | SessionCreateParams | SessionCreateResult | 0 | Mint a live session (agent builds after the reply); a DB row appears on the first prompt unless seeded. |
| methods | session.cwd.set | SessionCwdSetParams | SessionCwdSetResult | 0 | Change a live, idle session's working directory. |
| methods | session.delete | SessionDeleteParams | SessionDeleteResult | 0 | Delete a stored session + transcripts; refused while it is live here. |
| methods | session.events.since | SessionEventsSinceParams | SessionEventsSinceResult | 1 | Replay events after a seq watermark on WS reconnect; truncated means refetch state. |
| methods | session.events.stats | SessionEventsStatsParams | SessionEventsStatsResult | 0 | Replay-buffer occupancy telemetry (ops/debug). |
| methods | session.foreign.import | SessionForeignIdParams | SessionForeignImportResult | 0 | Import a foreign session into this profile's history (idempotent per origin). |
| methods | session.foreign.list | SessionForeignListParams | SessionForeignListResult | 0 | One page of Claude Code / Codex sessions found on the serving backend. |
| methods | session.foreign.preview | SessionForeignIdParams | SessionForeignPreviewResult | 0 | Preview a foreign session's tail before importing it. |
| methods | session.history | SessionHistoryParams | SessionHistoryResult | 0 | The durable display transcript (ancestors included, row ids attached). |
| methods | session.interrupt | SessionInterruptParams | SessionInterruptResult | 0 | Stop the running turn (and streaming TTS); retires the crash-recovery marker. |
| methods | session.list | SessionListParams | SessionListResult | 0 | Human-facing stored sessions, most recent first (sub-agent / kanban sources denied). |
| methods | session.most_recent | SessionMostRecentParams | SessionMostRecentResult | 0 | Most recent human-facing session; errors fold into a null session_id. |
| methods | session.redirect | SessionCorrectionParams | SessionCorrectionResult | 0 | Redirect the active turn (queued for the next turn while the agent is still building). |
| methods | session.resume | SessionResumeParams | SessionResumeResult | 3 | Attach to a stored session: reuse it if live here, else lazy / deferred / cold / eager rebuild. |
| methods | session.save | SessionSaveParams | SessionSaveResult | 0 | Export the transcript to ~/.hermes/sessions/saved (classic /save). |
| methods | session.set_hidden | SessionSetHiddenParams | SessionSetHiddenResult | 0 | Set/clear hidden (out of the default list, still resumable by its owner) on a session + lineage. |
| methods | session.status | SessionStatusParams | SessionStatusResult | 0 | Rendered /status text for the session. |
| methods | session.steer | SessionCorrectionParams | SessionCorrectionResult | 0 | Inject text into the next tool result without interrupting the turn. |
| methods | session.title | SessionTitleParams | SessionTitleResult | 0 | Read or set a live session's title; a title set before the row exists is queued. |
| methods | session.undo | SessionUndoParams | SessionUndoResult | 0 | Drop the last user turn (and everything after it) from an idle session. |
| methods | session.usage | SessionUsageParams | SessionUsageResult | 0 | Token / context / cost counters for the session (+ Nous credit lines when available). |
| methods | session.workspace.move | SessionWorkspaceMoveParams | SessionWorkspaceMoveResult | 0 | Re-home a stored session's workspace; git identity is replaced and a live agent follows. |
| methods | setup.runtime_check | SetupRuntimeCheckParams | SetupRuntimeCheckResult | 0 | Strict provider check through the same runtime resolution the agent uses on session creation. |
| methods | setup.status | ProfileParams | SetupStatusResult | 0 | Loose provider check: is ANY provider auth state discoverable for the (launch or named) profile. |
| methods | shared_metrics.desktop_daily | SharedMetricsDesktopDailyParams | SharedMetricsDesktopDailyResult | 0 | Record one finished Desktop day (mode use + button presses); recorded=false keeps it for a retry. |
| methods | shared_metrics.desktop_dislike | SharedMetricsDesktopDislikeParams | OkResult | 0 | Count one Desktop dislike signal (fire-and-forget; capped per signal per day; a no-op unless on). |
| methods | shared_metrics.desktop_feature_use | SharedMetricsDesktopFeatureUseParams | OkResult | 0 | Count one Desktop area used today (fire-and-forget; once per area per UTC day; a no-op unless on). |
| methods | shared_metrics.desktop_friction | SharedMetricsDesktopFrictionParams | OkResult | 0 | Count one Desktop friction event (fire-and-forget; capped per day; a no-op unless on). |
| methods | shared_metrics.desktop_onboarding | SharedMetricsDesktopOnboardingParams | OkResult | 0 | Count one Desktop first-run step transition (fire-and-forget; once per step+event; a no-op unless on). |
| methods | shared_metrics.set | SharedMetricsSetParams | SharedMetricsConsentResult | 0 | Write both shared-metrics opt-ins at once (send requires collection) and reconcile consent windows. |
| methods | shared_metrics.slash_command | SharedMetricsSlashCommandParams | SharedMetricsSlashCommandResult | 0 | Count one user-typed slash command (fire-and-forget; a no-op unless shared metrics are on). |
| methods | shared_metrics.startup_latency | SharedMetricsStartupLatencyParams | SharedMetricsStartupLatencyResult | 0 | Record one client launch-to-ready latency (fire-and-forget; a no-op unless shared metrics are on). |
| methods | shared_metrics.status | ProfileParams | SharedMetricsConsentResult | 0 | Pure read of the focused profile's shared-metrics opt-ins (collection, upload, answered). |
| methods | shared_metrics.update_run | SharedMetricsUpdateRunParams | SharedMetricsUpdateRunResult | 0 | Count one Desktop packaged self-update outcome (fire-and-forget; a no-op unless shared metrics are on). |
| methods | shell.exec | ShellExecParams | ShellExecResult | 0 | Run a safe (non-dangerous) shell command captured for ``!cmd`` / inline substitution. |
| methods | skills.manage | SkillsManageParams | SkillsManageResult | 2 | Skills hub backend: list the profile's skills or search / browse / inspect / install from the hub. |
| methods | skills.reload | SkillsReloadParams | SkillsReloadResult | 0 | Re-scan skill dirs; the pre-rendered ``output`` is what /reload-skills prints. |
| methods | slash.exec | SlashExecParams | SlashExecResult | 0 | Execute a slash command against the session's slash worker (or a live/plugin shortcut). |
| methods | spawn_tree.list | SpawnTreeListParams | SpawnTreeListResult | 0 | Saved spawn-tree snapshots, newest first. |
| methods | spawn_tree.load | SpawnTreeLoadParams | SpawnTreeLoadResult | 0 | Read one saved spawn-tree snapshot (path must be under the spawn-trees root). |
| methods | spawn_tree.save | SpawnTreeSaveParams | SpawnTreeSaveResult | 0 | Persist a finished delegation tree snapshot under the session's spawn-trees dir. |
| methods | subagent.interrupt | SubagentIdParams | SubagentInterruptResult | 0 | Hard-interrupt one owned child; ``found`` is false when it already finished. |
| methods | subagent.list | SessionParams | SubagentListResult | 0 | Live children owned by this session (other sessions' children never leak). |
| methods | subagent.steer | SubagentSteerParams | SubagentSteerResult | 0 | Queue steering text into a live delegated child owned by this session. |
| methods | subagent.tail | SubagentIdParams | SubagentTailResult | 0 | Last 16KB of an owned child's live transcript. |
| methods | subscription.change | SubscriptionChangeParams | BillingPendingChangeResult | 0 | Schedule a downgrade / same-price change or a period-end cancellation. |
| methods | subscription.preview | SubscriptionPreviewParams | SubscriptionPreviewResult | 0 | Chargeless quote of what a plan change would do (billing:manage). |
| methods | subscription.resume | ProfileParams | BillingPendingChangeResult | 0 | Clear a scheduled downgrade / cancellation (re-enables recurring spend). |
| methods | subscription.state | ProfileParams | SubscriptionStateResult | 0 | Current plan, tier catalog and usage for the picker; fail-open when logged out. |
| methods | subscription.upgrade | SubscriptionUpgradeParams | SubscriptionUpgradeResult | 0 | Prorate, charge and flip the plan (billing:manage, idempotent). |
| methods | system.battery | SystemBatteryParams | SystemBatteryResult | 0 | Host battery for the status bar; always resolves, ``available: false`` when unreadable. |
| methods | terminal.resize | TerminalResizeParams | TerminalResizeResult | 0 | Record the client's column width for server-side rendering. |
| methods | tools.configure | ToolsConfigureParams | ToolsConfigureResult | 0 | Persist a toolset / MCP enable-disable change and rebuild the session agent so it takes effect now. |
| methods | tools.list | _SessionScoped | ToolsetsListResult | 0 | Every toolset with its resolved tool names, flagged against the session's (or config's) enabled set. |
| methods | tools.show | _SessionScoped | ToolsShowResult | 0 | The /tools listing grouped by toolset, including tools deferred behind the tool_search bridge. |
| methods | toolsets.list | _SessionScoped | ToolsetsListResult | 0 | Toolset summaries (no tool names) for the desktop Toolsets tab. |
| methods | usage.bars | ProfileParams | UsageModel | 0 | Two-bar dollar usage view shared by /usage, /topup and /subscription; fail-open to unavailable. |
| methods | vault.add | VaultAddParams | VaultAddResult | 0 | Add a login / payment / address item to the local vault. |
| methods | vault.list | ProfileParams | VaultListResult | 0 | Metadata-only listing across the local vault and every unlocked password manager. |
| methods | vault.lock | VaultLockParams | VaultLockResult | 0 | Forget a manager's session token (every manager when no name is given). |
| methods | vault.remove | VaultRemoveParams | VaultRemoveResult | 0 | Remove a local vault item by id. |
| methods | vault.source.set | VaultSourceSetParams | VaultSourceSetResult | 0 | Enable or disable an external password manager (disabling also locks it). |
| methods | vault.sources | ProfileParams | VaultSourcesResult | 0 | Status of every login source (local vault + detected password managers). |
| methods | vault.unlock | VaultUnlockParams | VaultUnlockResult | 0 | Unlock a password manager for this session with its master password. |
| methods | verification.status | VerificationStatusParams | VerificationStatusResult | 0 | Best known verification evidence for a cwd/session; read-only, never runs checks. |
| methods | voice.record | VoiceRecordParams | VoiceRecordResult | 0 | VAD-bounded push-to-talk; the transcript arrives as a voice.transcript event. |
| methods | voice.toggle | VoiceToggleParams | VoiceToggleResult | 0 | /voice parity: report, flip voice mode on/off, or toggle speech output. |
| methods | voice.tts | VoiceTtsParams | VoiceTtsResult | 0 | Speak text through the backend TTS engine (barge-in aware). |
| methods | wake.feed | WakeFeedParams | WakeFeedResult | 1 | Push client-captured PCM into the armed detector (mic-less remote backends). |
| methods | wake.pause | WakeControlParams | WakePauseResult | 1 | Release the mic (e.g. while the desktop's browser captures audio). |
| methods | wake.resume | WakeControlParams | WakeResumeResult | 0 | Reclaim the mic after a pause; no-op if the listener isn't armed. |
| methods | wake.start | WakeStartParams | WakeStartResult | 0 | Arm the wake-word listener for the calling surface; refusals explain why. |
| methods | wake.status | WakeStatusParams | WakeStatusResult | 0 | Everything a client needs to draw the wake-word state and decide whether to (re)arm. |
| methods | wake.stop | WakeStopParams | WakeStopResult | 0 | Stop this surface's listener; persist also writes wake_word.enabled: false. |
| x-canonical-methods | a2a.forward | A2aForwardParams | A2aForwardResult | 0 | Forward one A2A input into the conversation its identity tuple names. |
| x-canonical-methods | approval.respond | CanonicalApprovalParams | PromptResponseResult | 0 |  |
| x-canonical-methods | bot_relay.deliver | CanonicalBotDeliverParams | CanonicalBotDeliverResult | 0 |  |
| x-canonical-methods | bot_relay.settle | CanonicalBotDeliverParams | CanonicalBotDeliverResult | 0 |  |
| x-canonical-methods | clarify.lock | ClarifyLockParams | ClarifyLockResult | 0 | Lock one answer of the owner's batch clarify request (editable until every question is locked); only a viewer attached to that session with session:respond may lock. |
| x-canonical-methods | clarify.respond | ClarifyRespondParams | PromptResponseResult | 1 | Generation-fenced answer to a pending clarify prompt (empty answer = skipped). |
| x-canonical-methods | command.observe | CommandObserveParams | CommandObserveResult | 0 | Fire-only: a recognized command the classic CLI or the TUI runs itself; the gateway fires `pre_command` for it in the session's profile after replying (`queued` false: not fired). |
| x-canonical-methods | config.get | ConfigGetParams | CanonicalConfigGetResult | 0 |  |
| x-canonical-methods | config.set | CanonicalConfigSetParams | ConfigSetResult | 1 |  |
| x-canonical-methods | cron.cancel | CronAdmissionParams | CronCancelResult | 0 | Cancel a queued cron admission or latch cancellation on a started one. |
| x-canonical-methods | cron.recover | CronRunParams | CronStatusResult | 0 | Re-observe a firing after a scheduler restart (same request identity). |
| x-canonical-methods | cron.status | CronAdmissionParams | CronStatusResult | 0 | Status and, once terminal, the result of one cron admission. |
| x-canonical-methods | cron.submit | CronRunParams | CronSubmitResult | 0 | Admit one cron firing into the owning profile's durable FIFO. |
| x-canonical-methods | groups.approve | CanonicalRoomApproveParams | GroupsApproveResult | 0 |  |
| x-canonical-methods | groups.attachment.download | GroupsAttachmentDownloadParams | RoomAttachmentBytes | 0 | Read one committed attachment for a live room viewer. |
| x-canonical-methods | groups.attachment.upload | GroupsAttachmentUploadParams | RoomAttachment | 0 | Store one attachment for a later groups.send manifest (idempotent per upload_id). |
| x-canonical-methods | groups.create | CanonicalRoomCreateParams | GroupsCreateResult | 0 |  |
| x-canonical-methods | groups.discard | GroupsDiscardParams | GroupsDiscardResult | 0 | Discard one indeterminate room task after explicit user confirmation. |
| x-canonical-methods | groups.retry | CanonicalRoomAttemptParams | GroupsRetryResult | 0 |  |
| x-canonical-methods | image.attach_bytes | ImageAttachBytesParams | CanonicalAttachedImageResult | 0 |  |
| x-canonical-methods | kanban.run | KanbanRunParams | KanbanRunResult | 0 | Native-owner only: admit the dispatcher's current claim on a kanban task. |
| x-canonical-methods | profiles.list | CanonicalProfilesParams | CanonicalProfilesResult | 3 |  |
| x-canonical-methods | prompt.cancel | PromptCancelParams | AdmissionStatus | 0 | Retire a still-queued admission; a started one is unaffected. |
| x-canonical-methods | prompt.receipt | PromptReceiptParams | PromptReceiptResult | 0 | Current receipt of one admission the caller submitted (or controls). |
| x-canonical-methods | prompt.replace_queued | CanonicalReplaceQueuedParams | AdmissionStatus | 0 | Cancel a still-queued admission and admit the edited prompt as a new admission at the back of the FIFO, in one write bound to the replaced admission. Refusals: admission_started, admission_conflict (the submission_id replaced another admission), queue_full, unsupported_control, not_found. |
| x-canonical-methods | prompt.resolve_unknown | PromptResolveUnknownParams | AdmissionStatus | 0 | Acknowledge a turn lost across an owner restart; the FIFO behind it resumes. Never requeues the lost input. |
| x-canonical-methods | prompt.steer_queued | CanonicalSteerQueuedParams | AdmissionStatus | 0 | Hand a still-queued admission's text to the running turn's agent as a steer. The admission reads 'started' with that turn (pending snapshots mark it 'steering') and never runs on its own; it settles terminal 'steered' when the turn completes with its text, else 'interrupted' (its completion frame says 'cancelled', as an interrupted turn's does); a text the turn never consumed goes back to its queue place. Refusals: admission_started, session_idle, steer_unavailable (no agent to take it: the admission stays queued), unsupported_control, not_found. |
| x-canonical-methods | prompt.submit | CanonicalSubmitParams | CanonicalSubmitResult | 1 |  |
| x-canonical-methods | rollback.session_diff | RollbackSessionDiffParams | RollbackSessionDiffResult | 0 | The classic CLI's /diff session: everything changed since the session's earliest retained checkpoint, as data for its terminal renderer. |
| x-canonical-methods | runtime.describe | RuntimeDescribeParams | RuntimeDescribeResult | 0 | Owner identity and the canonical capabilities a client may rely on. |
| x-canonical-methods | session.automation | SessionAutomationParams | SessionAutomationResult | 0 | The classic CLI's /goal, /subgoal, /loop, /heartbeat manager calls (state writes, the goal judge, quality gates), run by the owner on the session's row. |
| x-canonical-methods | session.create | CanonicalCreateParams | CanonicalSnapshot | 0 |  |
| x-canonical-methods | session.detach | SessionDetachParams | SessionDetachResult | 0 | Drop this connection's subscription; a stale subscription id answers detached=false. end_reason (snake_case): the viewer is closing the conversation; the last viewer leaving an idle local session ends its row with that reason. |
| x-canonical-methods | session.events.since | CanonicalEventsParams | CanonicalEventsResult | 1 |  |
| x-canonical-methods | session.export | SessionExportParams | SessionExportResult | 0 | The /save transcript rendered for the client to write (the gateway writes nothing). |
| x-canonical-methods | session.info | CanonicalSessionInfoParams | CanonicalSessionInfo | 0 | Frozen launch policy projection of one local session. |
| x-canonical-methods | session.interrupt | CanonicalControlParams | CanonicalSessionHandle | 0 |  |
| x-canonical-methods | session.list | CanonicalListParams | CanonicalListResult | 0 |  |
| x-canonical-methods | session.mutate | SessionMutateParams | SessionMutateResult | 0 | Revision-fenced, retry-idempotent session edit (rename, archive, sidebar, branch, delete, rewind, reset, model, reasoning, workspace, edit_policy, compress, import). |
| x-canonical-methods | session.prune | SessionPruneParams | SessionPruneResult | 0 | Local operator only: the owner deletes the ended sessions `hermes sessions prune` selected, skipping busy sessions and retained reset owners. |
| x-canonical-methods | session.redirect | CanonicalCorrectionParams | CanonicalCorrectionResult | 0 |  |
| x-canonical-methods | session.resume | CanonicalResumeParams | CanonicalSnapshot | 3 |  |
| x-canonical-methods | session.stats | SessionStatsParams | SessionStats | 0 | The session.usage dict on demand: what main's classic CLI read off its agent. |
| x-canonical-methods | session.steer | CanonicalCorrectionParams | CanonicalCorrectionResult | 0 |  |
| x-canonical-methods | shell.exec | CanonicalShellExecParams | ShellExecResult | 0 | Ink ``!cmd`` / ``{!cmd}`` on the shared owner: one safe command for a local session, in its frozen launch cwd (``gateway/session_shell.py``). |
| x-canonical-methods | worker.adopt | WorkerScopeParams | WorkerExecution | 0 | Adopt a registered execution after verifying the live producer claim. |
| x-canonical-methods | worker.persist | WorkerPersistParams | WorkerPersistResult | 0 | Sequence-fenced typed persistence write from an adopted worker. |
| x-canonical-methods | worker.register | WorkerRegisterParams | WorkerExecution | 0 | Register a compute worker execution on an idle session. |
| x-server-requests | approval | ApprovalRequestParams | ApprovalResult | 0 | A dangerous command awaits the user's decision. |
| x-server-requests | clarify | ClarifyRequestParams | ClarifyResult | 0 | The clarify tool: ask the user 1-5 questions. |
| x-server-requests | display.install.sudo | DisplayInstallSudoParams | ValueResult | 0 | Masked sudo password for the Bot Screen package install; app-level (empty session). |
| x-server-requests | preview.act | PreviewActRequestParams | ValueResult | 0 | Click / type / scroll / annotate inside the in-app browser preview. |
| x-server-requests | preview.read | ReadRangeRequestParams | ValueResult | 0 | Read the in-app browser preview's text (JSON text answer). |
| x-server-requests | secret | SecretRequestParams | ValueResult | 0 | Masked value for a named env var (skills / setup flows). |
| x-server-requests | setup_beat | SetupBeatRequestParams | SetupBeatResult | 0 | The onboarding chat's card for one beat; blocks setup_beat until answered (300 s). |
| x-server-requests | sudo | SudoRequestParams | ValueResult | 0 | Masked sudo password for the terminal tool. |
| x-server-requests | terminal.read | ReadRangeRequestParams | ValueResult | 0 | Read the visible in-app terminal buffer (JSON text answer). |
| x-server-requests | theme.apply | ThemeApplyRequestParams | ValueResult | 0 | Apply set_theme values in the window showing the session (JSON text answer). |
| x-server-requests | theme.pick | ThemePickRequestParams | ThemePickResult | 0 | Show an accent or layout picker card in the chat and wait for the pick. |
| x-server-requests | tour | TourRequestParams | ValueResult | 0 | Drive a guided tour highlight in the desktop renderer. |
| x-server-requests | vault.code | VaultCodeRequestParams | ValueResult | 0 | A one-time / 2FA code the user reads from their device. |
| x-server-requests | vault.save_login | VaultSaveLoginRequestParams | ValueResult | 0 | Save a login for a site the agent is about to fill; the answer is JSON {identifier, password}. |
| x-server-requests | vault.unlock_prompt | VaultUnlockRequestParams | ValueResult | 0 | Master password to unlock an external password manager for this session. |
| x-server-requests | window.read | EmptyRequestParams | ValueResult | 0 | Enumerate the native window below the app (JSON text answer). |
| x-notifications | agent.print | AgentPrintPayload | — | 0 | A status line the agent printed during a local viewer's turn. |
| x-notifications | agent.terminal.output | TerminalOutputPayload | — | 0 | Output chunk from an agent-owned background process. |
| x-notifications | approval.cancelled | ApprovalCancelledPayload | — | 0 | Pending gateway approvals were dropped by interrupt/reap/teardown; the wait resolved as deny (not a user refusal). |
| x-notifications | background.complete | SideAgentCompletePayload | — | 0 | A /background side agent finished. |
| x-notifications | billing.step_up.verification | BillingStepUpVerificationPayload | — | 1 | Device-flow URL + code for the billing scope step-up; the client opens the browser. |
| x-notifications | bot_relay.outbox.pending | ChangeSignalPayload | — | 1 | A bot-relay outbox envelope is queued; drain it. |
| x-notifications | browser.controller.cancel | BrowserControllerCancelPayload | — | 0 | Withdraw a pending controller command. |
| x-notifications | browser.controller.command | BrowserControllerCommandPayload | — | 0 | Dispatch one browser action to the attached controller. |
| x-notifications | browser.progress | BrowserProgressPayload | — | 0 | Browser (CDP) connect / install progress line. |
| x-notifications | btw.complete | SideAgentCompletePayload | — | 0 | A /btw side question was answered. |
| x-notifications | connection.request | ConnectionRequestPayload | — | 0 | A connection operation opened on this session; the desktop renders its card. |
| x-notifications | connection.update | ConnectionUpdatePayload | — | 0 | One transition or the settlement of an open connection operation. |
| x-notifications | cron.changed | ChangeSignalPayload | — | 0 | cron/jobs.json moved; refetch the cron list. |
| x-notifications | display.install.done | DisplayInstallDonePayload | — | 1 | The install ended (0 ok, -1 cancelled, -2 no sudo: the command to run by hand was streamed). |
| x-notifications | display.install.log | DisplayInstallLogPayload | — | 1 | One line of package-manager output. |
| x-notifications | display.lease | DisplayLeasePayload | — | 2 | The takeover lease changed hands; every client repaints. |
| x-notifications | display.status | DisplayStatusPayload | — | 2 | This profile's screen started or stopped (also for transitions made outside hermes serve). |
| x-notifications | error | ErrorPayload | — | 46 | A session-level failure outside a turn (agent init, model switch, compression, resume). |
| x-notifications | free_tier.challenge | FreeTierChallengePayload | — | 0 | The account service wants a browser challenge cleared before the free-tier token exchange (broadcast); the desktop loads ``url`` in a hidden window. |
| x-notifications | gateway.ready | GatewayReadyPayload | — | 0 | First frame of a connection: the resolved skin, the change-event capability and the replay epoch. |
| x-notifications | message.complete | MessageCompletePayload | — | 0 | The turn ended: final text, usage and outcome. |
| x-notifications | message.delta | MessageDeltaPayload | — | 0 | One streamed chunk of the assistant reply (null text: segment boundary). |
| x-notifications | message.interim | MessageInterimPayload | — | 0 | Interim assistant commentary (text beside tool calls) sealed as its own segment. |
| x-notifications | message.reaction | MessageReactionPayload | — | 0 | The agent reacted to a message; paint it live. |
| x-notifications | message.start | MessageStartPayload | — | 0 | A turn began streaming; an automation turn carries its async-result card. |
| x-notifications | moa.aggregating | MoaAggregatingPayload | — | 0 | The MoA aggregator started. |
| x-notifications | moa.phase | MoaPhasePayload | — | 0 | MoA phase transition (currently only ``aggregator``). |
| x-notifications | moa.progress | MoaProgressPayload | — | 0 | MoA reference fan-out progress (n/total). |
| x-notifications | moa.reference | MoaReferencePayload | — | 0 | One MoA reference model's output. |
| x-notifications | notice | NoticePayload | — | 0 | Informational one-liner for the session (capabilities refreshed). |
| x-notifications | notification.clear | NotificationClearPayload | — | 0 | Withdraw the notice with this key. |
| x-notifications | notification.show | NotificationShowPayload | — | 0 | Show / replace a keyed out-of-band notice (toast or status bar). |
| x-notifications | onboarding.ended | OnboardingEndedPayload | — | 0 | A first-run onboarding run ended; sent to every connected window. |
| x-notifications | pairing.changed | ChangeSignalPayload | — | 0 | Pairing state moved; refetch pairing. |
| x-notifications | pane.reveal | PaneRevealPayload | — | 0 | Focus / reveal a named desktop pane. |
| x-notifications | pet.changed | PetChangedPayload | — | 0 | The active pet / its spritesheet changed (watcher). |
| x-notifications | pet.generate.progress | PetGenerateProgressPayload | — | 1 | Pet base-draft generation progress. |
| x-notifications | pet.hatch.progress | PetHatchProgressPayload | — | 1 | Pet hatch (row drawing) progress. |
| x-notifications | platforms.changed | ChangeSignalPayload | — | 0 | gateway_state.json moved; refetch platform status. |
| x-notifications | preview.close | PreviewClosePayload | — | 0 | Close the preview pane or one tab. |
| x-notifications | preview.open | PreviewOpenPayload | — | 0 | Open a URL / file in the desktop preview pane. |
| x-notifications | preview.restart.complete | SideAgentCompletePayload | — | 0 | The hidden preview-restart agent finished. |
| x-notifications | preview.restart.progress | PreviewRestartProgressPayload | — | 0 | Progress line from the preview-restart agent. |
| x-notifications | projects.changed | ChangeSignalPayload | — | 0 | projects.db moved; refetch the project list + tree. |
| x-notifications | reaction | ReactionPayload | — | 0 | Affection reaction detected in the user's message (hearts etc.). |
| x-notifications | reasoning.available | StreamDeltaPayload | — | 0 | A completed reasoning block (non-streaming providers). |
| x-notifications | reasoning.delta | StreamDeltaPayload | — | 0 | One streamed chunk of the model's reasoning. |
| x-notifications | request.cancel | RequestCancelPayload | — | 0 | The backend withdrew an open server→client request; clear the matching card only. |
| x-notifications | review.summary | ReviewSummaryPayload | — | 0 | Background review of the last turn finished. |
| x-notifications | session.control.update | SessionControlUpdatePayload | — | 0 | Persisted goal / loop / heartbeat state changed. |
| x-notifications | session.info | SessionLiveInfo | — | 0 | Live session settings snapshot (``server._session_info``); also the ``info`` of create/resume/activate. |
| x-notifications | session.reclaimed | SessionReclaimedPayload | — | 1 | The backend reclaimed a live session out from under its clients. |
| x-notifications | session.resume_progress | SessionResumeProgressPayload | — | 0 | Deferred resume hydration progress. |
| x-notifications | session.title | SessionTitlePayload | — | 0 | Auto-titling renamed the session (``session_id`` is the stored key). |
| x-notifications | session.usage | SessionUsagePayload | — | 0 | Mid-turn usage tick; message.complete carries the authoritative final usage. |
| x-notifications | sessions.changed | ChangeSignalPayload | — | 0 | state.db moved; refetch the session list. |
| x-notifications | setup.ready | SetupReadyPayload | — | 0 | The free-tier bootstrap finished (broadcast); the desktop's setup gate reads the record. |
| x-notifications | skills.changed | ChangeSignalPayload | — | 0 | A skill root moved (installed/removed elsewhere); refetch commands.catalog from the gateway. |
| x-notifications | skin.changed | SkinPayload | — | 0 | The active skin moved (name switch or live colour edit); repaint from this palette. |
| x-notifications | status.update | StatusUpdatePayload | — | 0 | Transient status line (kind: status, lifecycle, compacting, goal, loop, heartbeat, process, …). |
| x-notifications | subagent.complete | SubagentEventPayload | — | 0 | A child finished (status + observability rollup). |
| x-notifications | subagent.progress | SubagentEventPayload | — | 0 | Batched tool-name progress from a child. |
| x-notifications | subagent.spawn_requested | SubagentEventPayload | — | 0 | delegate_task accepted a child goal (before the child starts). |
| x-notifications | subagent.start | SubagentEventPayload | — | 0 | A delegated child started running. |
| x-notifications | subagent.thinking | SubagentEventPayload | — | 0 | A child's reasoning chunk. |
| x-notifications | subagent.tool | SubagentEventPayload | — | 0 | A child called a tool. |
| x-notifications | terminal.close | TerminalClosePayload | — | 0 | An agent-owned background process closed. |
| x-notifications | thinking.delta | StreamDeltaPayload | — | 0 | Legacy thinking-text chunk (thinking_callback). |
| x-notifications | tip.show | TipShowPayload | — | 0 | Point at a desktop element with a one-line tip bubble. |
| x-notifications | todo.updated | TodoUpdatedPayload | — | 0 | Full todo snapshot after a todo tool ran. |
| x-notifications | tool.complete | ToolCompletePayload | — | 0 | A tool call finished: parsed result, summary, optional diff / todo snapshot. |
| x-notifications | tool.generating | ToolGeneratingPayload | — | 0 | The model is emitting a tool call's arguments. |
| x-notifications | tool.output_risk | ToolOutputRiskPayload | — | 0 | Tool output was classified as risky (prompt-injection / secret findings). |
| x-notifications | tool.progress | ToolProgressPayload | — | 0 | Live progress of a running tool call (MCP notifications/progress). |
| x-notifications | tool.start | ToolStartPayload | — | 1 | A tool call began (stable id + full args). |
| x-notifications | voice.interrupted | inline | — | 0 | Barge-in: the spoken interjection interrupted the turn; no payload. |
| x-notifications | voice.partial | VoicePartialPayload | — | 0 | Live STT text so far while the user is still speaking. |
| x-notifications | voice.status | VoiceStatusPayload | — | 0 | Voice recorder state changed. |
| x-notifications | voice.transcript | VoiceTranscriptPayload | — | 0 | A voice capture produced text (or a stop phrase / silence limit). |
| x-notifications | wake.detected | WakeDetectedPayload | — | 0 | A wake phrase fired. |