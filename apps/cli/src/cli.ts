#!/usr/bin/env node
import { Command } from 'commander'
import { backendOrigin, inspectHealth } from './health.js'

const program = new Command().name('sirona').description('Sirona runtime diagnostics — no host execution or product mutations').version('0.1.0')
program.option('--backend <origin>', 'Loopback backend origin', 'http://127.0.0.1:8000')
program.command('status').description('Inspect live and ready HTTP health status').action(async () => {
  const result = await inspectHealth(backendOrigin(program.opts().backend))
  console.log(JSON.stringify(result, null, 2))
  if (!result.ready || !result.live) process.exitCode = 1
})
program.command('tui').description('Interactive read-only runtime monitor (q or Escape to exit)').action(async () => {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('TUI requires an interactive terminal; use status for scripts')
  const origin = backendOrigin(program.opts().backend)
  const { ProcessTerminal, TuiMainScreen, Text, matchesKey } = await import('@earendil-works/pi-tui')
  const tui = new TuiMainScreen(new ProcessTerminal())
  const content = new Text('Sirona\nChecking backend…\nq / Escape: exit', 1, 1)
  tui.addChild(content)
  let stopped = false, active = false
  let timer: ReturnType<typeof setInterval> | undefined
  const stop = () => {
    if (stopped) return
    stopped = true
    clearInterval(timer)
    tui.stop()
    process.removeListener('SIGINT', stop)
    process.removeListener('SIGTERM', stop)
  }
  const refresh = async () => {
    if (active || stopped) return
    active = true
    try {
      const status = await inspectHealth(origin)
      if (!stopped) {
        content.setText(`Sirona\n${origin}\nLive: ${status.live ? 'yes' : 'unavailable'}\nReady: ${status.ready ? 'yes' : 'unavailable'}\n\nRead-only diagnostics. Language tools require a qualified worker.\nq / Escape: exit`)
        tui.requestRender()
      }
    } finally { active = false }
  }
  tui.addInputListener(data => { if (data === 'q' || matchesKey(data, 'escape') || matchesKey(data, 'ctrl+c')) { stop(); return { consume: true } } })
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)
  tui.start()
  timer = setInterval(() => { void refresh() }, 4000)
  await refresh()
})
program.parseAsync().catch(() => { console.error('Sirona command failed. Check the loopback origin or terminal; no operation was dispatched.'); process.exitCode = 1 })
