import { useEffect, useRef, useState } from 'react'

// Ambient background music plus its controls.
//
// The controls are a single dock in the bottom-right corner: a play/mute
// button that expands on hover (or keyboard focus) to reveal the volume
// slider and a toggle for whether playback continues while the tab is in the
// background. Earlier versions scattered those three across three corners of
// the viewport, which read as three unrelated widgets.

const STORAGE_KEY = 'om-audio-muted'
const FOCUS_KEY = 'om-audio-focus'
const VOL_KEY = 'om-audio-vol'

export default function AmbientAudio({
  src,
  volume = 0.1,
  loop = false,
  showToggle = true,
  clickToStart = true,
  pauseWhenUnfocused = true,
  gateLabel = 'click anywhere to enter'
}) {
  const audioRef = useRef(null)
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1' } catch { return false }
  })
  const [keepPlaying, setKeepPlaying] = useState(() => {
    try { return localStorage.getItem(FOCUS_KEY) === '1' } catch { return false }
  })
  const [vol, setVol] = useState(() => {
    try {
      const v = localStorage.getItem(VOL_KEY)
      return v !== null ? parseFloat(v) : volume
    } catch { return volume }
  })
  const [started, setStarted] = useState(!clickToStart)
  const [focused, setFocused] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (pauseWhenUnfocused && !keepPlaying) return
    const sync = () => setFocused(document.hasFocus() && !document.hidden)
    sync()
    window.addEventListener('focus', sync)
    window.addEventListener('blur', sync)
    document.addEventListener('visibilitychange', sync)
    return () => {
      window.removeEventListener('focus', sync)
      window.removeEventListener('blur', sync)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [pauseWhenUnfocused, keepPlaying])

  useEffect(() => {
    const el = audioRef.current
    if (!el || !src) return
    el.volume = vol

    if (started && !muted && (keepPlaying || !pauseWhenUnfocused || focused)) {
      const p = el.play()
      if (p && p.then) p.then(() => setPlaying(true)).catch(() => setPlaying(false))
    } else {
      el.pause()
      setPlaying(false)
    }
  }, [started, muted, focused, src, vol, pauseWhenUnfocused, keepPlaying])

  useEffect(() => {
    if (clickToStart || muted || !src) return
    const el = audioRef.current
    if (!el || !el.paused) return

    const onGesture = () => { setStarted(true); cleanup() }
    const opts = { once: true, passive: true }
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart']
    events.forEach((e) => window.addEventListener(e, onGesture, opts))
    const cleanup = () => events.forEach((e) => window.removeEventListener(e, onGesture))
    return cleanup
  }, [clickToStart, muted, src, playing])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, muted ? '1' : '0') } catch {}
  }, [muted])

  useEffect(() => {
    try { localStorage.setItem(FOCUS_KEY, keepPlaying ? '1' : '0') } catch {}
  }, [keepPlaying])

  useEffect(() => {
    try { localStorage.setItem(VOL_KEY, String(vol)) } catch {}
  }, [vol])

  if (!src) return null

  const toggle = () => {
    if (playing) { setMuted(true); return }
    setMuted(false)
    setStarted(true)
  }

  const showGate = clickToStart && !started && !muted && !failed
  const showDock = showToggle && !failed && !showGate
  const pct = Math.round(vol * 100)

  return (
    <>
      <audio
        ref={audioRef}
        src={src}
        loop={loop}
        preload="auto"
        onEnded={() => setPlaying(false)}
        onError={() => { setFailed(true); setStarted(true) }}
      />

      {showGate && (
        <div className="om-gate" onClick={() => setStarted(true)}>
          <button className="om-gate-bubble" onClick={() => setStarted(true)}>
            {gateLabel}
          </button>
        </div>
      )}

      {showDock && (
        <div className="om-dock">
          {/* Expanding half, revealed on hover/focus. Rendered before the
              button so it grows leftward out of the corner. */}
          <div className="om-dock-expand">
            <button
              className="om-dock-pin"
              data-on={keepPlaying}
              onClick={() => setKeepPlaying((k) => !k)}
              aria-pressed={keepPlaying}
              title={keepPlaying ? 'Playing in the background — click to pause when the tab loses focus' : 'Keep playing when the tab loses focus'}
            >
              ∞
            </button>
            <input
              className="om-range"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={vol}
              onChange={(e) => setVol(parseFloat(e.target.value))}
              style={{ '--fill': pct + '%' }}
              title={`Volume: ${pct}%`}
              aria-label="Volume"
            />
            <span style={{ fontSize: '10.5px', color: 'var(--muted)', minWidth: '30px', textAlign: 'right', userSelect: 'none', fontVariantNumeric: 'tabular-nums' }}>
              {pct}%
            </span>
          </div>

          <button
            className="om-dock-btn"
            data-on={playing}
            onClick={toggle}
            aria-pressed={playing}
            title={playing ? 'Mute music' : 'Play music'}
            aria-label={playing ? 'Mute music' : 'Play music'}
          >
            {playing ? '♪' : '♪̸'}
          </button>
        </div>
      )}
    </>
  )
}
