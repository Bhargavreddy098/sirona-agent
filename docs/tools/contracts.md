---
title: "Qualified guest execution and terminal sessions"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F12"
specification: "EDITION 1 PROPOSAL"
updated: "2026-11-05"
---

# Qualified guest execution and terminal sessions

## Profile and request schemas

Inherit [foundation](../architecture/contract-foundation.md). Profile={state:"unqualified"|"qualified"|"unavailable",imageDigest:Text(256),dockerVersion:Text(80),wslDistribution:Text(200),network:"none"|"allowlist",allowedHosts:List(Text(253),20),cpu:Int,memoryMiB:Int,pids:Int,qualificationDigest:Digest or null}. imageDigest must be an immutable sha256 image reference. Defaults cpu=2 (1..8), memoryMiB=2048 (256..8192), pids=128 (16..512), network=none. No arbitrary host mounts, Docker socket, privileged mode or host namespace. Non-root user, read-only image root, ephemeral writable scratch, all Linux capabilities dropped and no-new-privileges required. A profile is qualified only after actual Windows Docker/WSL2 tests for that exact configuration.

Command={profileId:Id,projectId:Id,artifactId:Id,executable:Text(1024),args:List(Text(4096),100),cwd:Text(1024),env:List({name:Text(80),value:Text(4096)},30),timeoutMs:Int}. cwd is project-relative; executable/argv are exact descriptor bytes. Environment names match [A-Z_][A-Z0-9_]*, no duplicate or loader-injection variables (LD_PRELOAD, NODE_OPTIONS, PYTHONPATH); secrets use a separate qualified adapter path, not generic env. Timeout default 120000, range 1000..600000.

Execution={state:"admitted"|"starting"|"running"|"stopping"|"exited"|"failed"|"uncertain",command:Command,containerId:Text(128) or null,exitCode:Int or null,signal:Text(80) or null,stdout:BlobRef or null,stderr:BlobRef or null,truncated:boolean,outputArtifactId:Id or null}. Exit code is 0..255; process termination reason uses signal.

## Operations

- F12-OP01 tools.profiles public read {} -> List(Entity(Profile),20).
- F12-OP02 tools.registerProfile native/admin mutation {profile:Profile without state/qualificationDigest} -> Entity(Profile) unqualified. Configuration is not execution permission.
- F12-OP03 tools.qualify native/admin mutation {profileId:Id} -> Ack; requires explicit qualification authorization. Writes measured evidence and qualified state only if every required isolation case passes.
- F12-OP04 tools.execute public mutation {command:Command,approvalId?:Id} -> Ack, with F08 evaluation. Internal runtime invocation carries its effect identity. Missing/unqualified profile returns UNAVAILABLE before container creation.
- F12-OP05 tools.get public read {executionId:Id} -> Entity(Execution).
- F12-OP06 tools.cancel public mutation {executionId:Id} -> Entity(Execution), signalled stopping until actual exit/uncertainty known.
- F12-OP07 tools.terminalStart public mutation {command:Command,cols:Int,rows:Int,approvalId?:Id} -> Ack. cols 20..300, rows 5..100. Interactive terminal uses an isolated artifact copy and no-network profile; it grants that bounded session's arbitrary guest input, not host/project-root access.
- F12-OP08 tools.terminalInput public mutation {executionId:Id,inputSequence:Int,data:Text(8192)} -> {acceptedSequence:Int}. Duplicate same sequence/data acknowledged; changed bytes conflict. Maximum 100 inputs/second.
- F12-OP09 tools.terminalResize public mutation {executionId:Id,cols:Int,rows:Int} -> {cols,rows}; validation as start. Resize requires terminal ownership, never a new execution grant.

## Execution and export

F11 exports the pinned artifact into a private per-operation staging directory/volume. Never mount the live project writable. Guest file changes become a new captured artifact; applying them to the user's project is a separate F11 preview/apply governed effect. Reject exported symlinks/devices/path escapes and files over F11 limits. Dependency caches are read-only or per-operation, never shared writable authority.

Persist admission, then use Docker's structured API/argument-array invocation to create a container labeled with installationId and operationId. Record containerId before start. On restart find that owned label to reconcile creation before attempting another container. No fallback to PowerShell, arbitrary WSL shell or host process if Docker is missing. Network allowlist profiles require a qualified egress proxy/firewall; a string of allowed hostnames alone is not enforcement. Until that adapter is qualified, network=allowlist reports unavailable.

Stream terminal/output as tool.output {executionId,stream:"stdout"|"stderr"|"pty",sequence:Int,delta:Text(16384)}. Persist at most 4 MiB each stdout/stderr and 8 MiB combined PTY; mark truncation and retain process outcome. Output never becomes a checker PASS without F15. On deadline/cancel send termination, wait 5 seconds, force-kill the owned container, wait 5 more; if exit cannot be established, uncertain. Do not release project effect ownership while an unknown process may still act.

Terminal loss of observation does not imply exit. Terminal idle timeout 10 minutes, absolute maximum 60 minutes; reconnect reads its execution/output sequence, never launches another shell. Starting a shell with -c/command arguments is a command descriptor like any other, and remains constrained by the guest profile.

## Acceptance cases

| Case | Requirement / operation | Action | Required result |
|---|---|---|---|
| F12-T10 | R01 / OP04 | Docker absent or profile unqualified | UNAVAILABLE; zero host command execution |
| F12-T11 | R02 / qualification | Try network, host paths, privilege escalation and resource exhaustion | Actual limits enforced for exact image/profile |
| F12-T12 | R02 / OP06 | Timeout process that spawns children | Owned container/processes stopped or explicit uncertain |
| F12-T13 | R03 / export | Guest writes symlink and modifies artifact | Escape rejected; live project unchanged until F11 approval |
| F12-T14 | R04 / terminal | Disconnect/reconnect, repeat input sequence | Same terminal, one accepted input, no duplicate session |
| F12-T15 | R02 / recovery | Kill after container creation before DB receipt | Reconcile labeled container, never launch a duplicate |

Qualification needs an explicitly selected image digest and real Docker/WSL2 environment. These input gates do not prevent implementation of the port and unavailable behavior.
