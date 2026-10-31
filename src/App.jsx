import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import AmbientAudio from './components/AmbientAudio.jsx'
import Banner from './components/Banner.jsx'
import ExternalLink from './components/ExternalLink.jsx'
import Icon from './components/Icon.jsx'
import { SECTION_TYPES } from './components/sections/registry.js'
import { fetchPresence } from './lib/lanyard.js'
import { startMarquees } from './lib/marquee.js'
import { getPaletteFromUrl } from './lib/okolors.js'
import { MONO_BANNER_COLORS, bannerColors, blendDecoration, monoVars, paletteVars, themeVars } from './lib/palette.js'
import config from './site.config.json'

// All content and tunables (profile, socials, theme, banner effects, tabs and
// their sections, footer) live in src/site.config.json — edit that, not this.
// This file owns page state (presence, palette, active tab) and the layout
// shell; sections render via components/sections/registry.js.

const THEME_VARS = themeVars(config.theme)
const DEFAULT_BANNER_COLORS = config.banner.defaultColors
const BG = config.background || {}
const AUDIO = config.audio || {}

// Loaded on demand so the point-cloud's WebGL code isn't in the entry chunk.
const Particles = lazy(() => import('./components/backgrounds/Particles.jsx'))

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Shared by the social links and the copy-to-clipboard buttons, so the two
// render identically whichever element type they end up as.
const socialStyle = {
  width: '38px',
  height: '38px',
  borderRadius: 'var(--r-sm)',
  background: 'var(--card2)',
  border: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export default function App() {
  const rootRef = useRef(null)

  const [state, setState] = useState({
    avatarUrl: config.profile.fallbackAvatar,
    displayName: config.profile.fallbackName,
    userTag: '@' + (config.profile.username || config.profile.fallbackName),
    statusText: config.status.connecting.label,
    statusColor: config.status.connecting.color,
    activeTab: config.tabs[0]?.id,
    decorationUrl: '',
    hasDecoration: false,
  })

  // 'loading' → shimmer placeholder, 'ok' → the image, 'failed' → the initial.
  // Without the last one a blocked or deleted avatar leaves the browser's
  // broken-image box with the alt text spilling across the banner.
  const [avatarState, setAvatarState] = useState('loading')

  // Colours handed to the banner effect. `ready` gates the effect so it mounts
  // once with the correct (avatar-matched) colours instead of flashing defaults.
  const [banner, setBanner] = useState({ ready: false, colors: DEFAULT_BANNER_COLORS })
  const revealBanner = (colors, force) =>
    setBanner((b) => (force || !b.ready ? { ready: true, colors } : b))

  const setRootVars = (vars) => {
    const root = rootRef.current
    if (!root) return
    for (const [key, value] of Object.entries(vars)) root.style.setProperty(key, value)
  }

  // The avatar and its decoration are analysed separately, then blended. The
  // decoration contributes at reduced strength — see blendDecoration for why
  // an equal-terms merge would let it take the theme over outright.
  const resolvePalette = (avatarUrl, decorationUrl) => {
    const { decorationInfluence = 0.35, accentShift = 0.55 } = config.palette
    if (!decorationUrl || decorationInfluence <= 0) {
      return getPaletteFromUrl(avatarUrl).then((res) =>
        (res && !res.mono ? blendDecoration(res, null, 0, accentShift) : res))
    }
    return Promise.all([getPaletteFromUrl(avatarUrl), getPaletteFromUrl(decorationUrl)])
      .then(([avatar, deco]) =>
        (avatar ? blendDecoration(avatar, deco, decorationInfluence, accentShift) : avatar))
  }

  // Palette generation via Okolors' approach (Oklab k-means), see lib/okolors.js.
  // Results are cached per-URL in localStorage, so this is instant on revisit.
  const extractPalette = (url, decorationUrl) => {
    resolvePalette(url, decorationUrl).then((res) => {
      if (!res) { revealBanner(DEFAULT_BANNER_COLORS, false); return } // load/CORS failure
      if (res.mono) { setRootVars(monoVars()); revealBanner(MONO_BANNER_COLORS, true); return } // greyscale
      const sat = Math.min(config.palette.maxSaturation, Math.max(config.palette.minSaturation, res.s))
      setRootVars(paletteVars(res, sat))
      revealBanner(bannerColors(res, sat), true)
    })
  }

  const loadPresence = async () => {
    try {
      const presence = await fetchPresence(config.profile.discordId)
      const st = config.status[presence.statusKey] || config.status.offline
      setState((prev) => ({
        ...prev,
        avatarUrl: presence.avatarUrl,
        displayName: presence.displayName,
        userTag: presence.userTag,
        statusText: st.label,
        statusColor: st.color,
        hasDecoration: !!presence.decorationUrl,
        decorationUrl: presence.decorationUrl,
      }))
      setRootVars({ '--status': st.color })
      extractPalette(presence.avatarUrl, presence.decorationUrl)
    } catch (e) {
      const st = config.status.offline
      setState((prev) => ({ ...prev, statusText: st.label, statusColor: st.color }))
      setRootVars({ '--status': st.color })
      revealBanner(DEFAULT_BANNER_COLORS, false)
    }
  }

  // A new avatar URL gets a fresh attempt, so a failed fallback image doesn't
  // keep the initial showing once presence resolves.
  useEffect(() => { setAvatarState('loading') }, [state.avatarUrl])

  useEffect(() => {
    loadPresence()
    const stopMarquees = startMarquees()
    // Fallback: if the avatar never resolves, show the effect with defaults.
    const t = setTimeout(() => revealBanner(DEFAULT_BANNER_COLORS, false), config.banner.revealTimeoutMs)
    return () => { clearTimeout(t); stopMarquees() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── tabs ─────────────────────────────────────────────────────────────────
  const active = state.activeTab
  const activeIndex = config.tabs.findIndex((t) => t.id === active)
  const activeTab = config.tabs[activeIndex]
  const Section = activeTab ? SECTION_TYPES[activeTab.type] : null

  const setTab = (tab) => setState((prev) => ({ ...prev, activeTab: tab }))

  // The sliding pill behind the active tab. Its geometry is measured from the
  // real button rather than computed from the tab count, so it stays correct
  // when labels change the widths or the row reflows.
  const tabsRef = useRef(null)
  const tabRefs = useRef([])
  const pillRef = useRef(null)

  // Written straight to the node rather than held in state: this runs once a
  // frame while the row's grid tracks animate, and re-rendering the whole
  // page on each of those frames would be the expensive way to move one box.
  const measurePill = useCallback(() => {
    const el = tabRefs.current[activeIndex]
    const pill = pillRef.current
    if (!el || !pill) return
    pill.style.left = el.offsetLeft + 'px'
    pill.style.width = el.offsetWidth + 'px'
  }, [activeIndex])

  // useLayoutEffect so the pill is in place before the browser paints the new
  // selection — otherwise it visibly jumps on first render. The follow-up
  // frames track the grid-template-columns transition: the button's final
  // geometry isn't known until that transition finishes, so a single
  // measurement would leave the pill behind the label it is supposed to sit
  // under. 700ms covers the 500ms transition with room for a slow frame.
  useLayoutEffect(() => {
    measurePill()
    let raf = 0
    const until = performance.now() + 700
    const loop = () => {
      measurePill()
      if (performance.now() < until) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [measurePill])

  useEffect(() => {
    // Label widths settle once the webfont swaps in; re-measure then and on
    // any resize that reflows the row.
    const ro = new ResizeObserver(measurePill)
    if (tabsRef.current) ro.observe(tabsRef.current)
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measurePill).catch(() => {})
    return () => ro.disconnect()
  }, [measurePill])

  // Grid tracks for the tab row. Every tab gets one share; the selected one
  // gets extra in proportion to how long its label is, so a 15-character
  // title ("Do Not Interact") isn't clipped by an equal sixth of the row.
  const colFor = (tab, i) => {
    if (i !== activeIndex) return '1fr'
    const weight = Math.min(3.4, Math.max(1.6, 1 + (tab.title || '').length * 0.16))
    return weight.toFixed(2) + 'fr'
  }
  const cols = config.tabs.map(colFor).join(' ')
  const colsEven = `repeat(${config.tabs.length}, 1fr)`

  // Arrow keys move between tabs, Home/End jump to the ends — the roving
  // behaviour expected of a tablist.
  const onTabKeyDown = (e) => {
    const last = config.tabs.length - 1
    let next = null
    if (e.key === 'ArrowRight') next = activeIndex >= last ? 0 : activeIndex + 1
    else if (e.key === 'ArrowLeft') next = activeIndex <= 0 ? last : activeIndex - 1
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = last
    if (next === null) return
    e.preventDefault()
    setTab(config.tabs[next].id)
    tabRefs.current[next]?.focus()
  }

  // ── clipboard ────────────────────────────────────────────────────────────
  // Which social was just copied, so the button can confirm it briefly.
  const [copied, setCopied] = useState('')
  const copyToClipboard = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // clipboard API needs a secure context; fall back for plain http.
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch { /* nothing else to try */ }
      document.body.removeChild(ta)
    }
    setCopied(key)
    setTimeout(() => setCopied((c) => (c === key ? '' : c)), 1600)
  }

  // ── render ───────────────────────────────────────────────────────────────
  const bg = BG
  // The palette's dark shade — index 3 of the banner quad. Falls back to the
  // configured default before the avatar has been analysed.
  const particleColor = banner.colors[3] || DEFAULT_BANNER_COLORS[3]
  const showParticles = bg.particles !== false && !prefersReducedMotion()

  return (
    <div
      ref={rootRef}
      style={{
        ...THEME_VARS,
        '--vignette': bg.vignetteStrength ?? 0.55,
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: 'clamp(28px, 6vw, 56px) clamp(14px, 4vw, 20px) 110px',
        background: 'radial-gradient(1200px 600px at 50% -10%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 70%), var(--bg)',
        color: 'var(--text)',
      }}
    >
      {/* ===== PAGE BACKGROUND ===== */}
      {showParticles && (
        <div className="om-particles" aria-hidden="true">
          <Suspense fallback={null}>
            {/* keyed on the colour so a late palette update restarts the field */}
            <Particles
              key={particleColor}
              particleColors={[particleColor]}
              particleCount={bg.particleCount ?? 800}
              particleSpread={bg.particleSpread ?? 20}
              speed={bg.particleSpeed ?? 0.3}
              particleBaseSize={bg.particleBaseSize ?? 100}
              moveParticlesOnHover
              alphaParticles={false}
              disableRotation
            />
          </Suspense>
        </div>
      )}
      {bg.grain !== false && <div className="om-grain" aria-hidden="true" />}
      {bg.vignette !== false && <div className="om-vignette" aria-hidden="true" />}

      {/* Renders nothing until audio.src is set in site.config.json. */}
      <AmbientAudio
        src={AUDIO.src}
        volume={AUDIO.volume ?? 0.1}
        loop={AUDIO.loop ?? false}
        showToggle={AUDIO.showToggle !== false}
        clickToStart={AUDIO.clickToStart !== false}
        pauseWhenUnfocused={AUDIO.pauseWhenUnfocused !== false}
        gateLabel={AUDIO.gateLabel || 'click anywhere to enter'}
      />

      <main style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* ===== PROFILE CARD ===== */}
        <header className="om-card" style={{ animation: 'fadeUp .6s var(--ease-out) both', borderRadius: 'var(--r-xl)', overflow: 'hidden' }}>
          <div style={{ height: '140px', background: 'linear-gradient(120deg, var(--accent), var(--accent2) 55%, var(--accent3, var(--accent2)))', position: 'relative', overflow: 'hidden' }}>
            <Banner
              ready={banner.ready}
              colors={banner.colors}
              effects={config.banner.effects}
              shift={config.banner.parallaxShift}
              overscan={config.banner.overscan}
            />
            {/* soft highlight + a floor shadow, so the avatar has something to sit on */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(420px 220px at 80% 120%, rgba(255,255,255,.18), transparent 60%)' }} />
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,.42))' }} />
          </div>

          <div style={{ padding: '0 24px 24px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-48px', left: '24px' }}>
              <div style={{ position: 'relative', width: '96px', height: '96px' }}>
                {/* Faint accent halo — reads as the avatar catching the banner's light. */}
                <div aria-hidden="true" style={{ position: 'absolute', inset: '-10px', borderRadius: '50%', background: 'radial-gradient(circle, color-mix(in srgb, var(--accent) 40%, transparent), transparent 68%)', filter: 'blur(8px)', opacity: 0.75, pointerEvents: 'none' }} />
                <div style={{ position: 'relative', width: '96px', height: '96px', borderRadius: '50%', border: '6px solid var(--card)', overflow: 'hidden', background: 'var(--card2)' }}>
                  {avatarState === 'loading' && <div className="om-skeleton" aria-hidden="true" style={{ position: 'absolute', inset: 0 }} />}
                  {avatarState === 'failed' ? (
                    <div
                      role="img"
                      aria-label={`${state.displayName} avatar`}
                      style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '34px', fontWeight: 800, color: '#0b0d10', background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}
                    >
                      {(state.displayName || '?').trim().charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <img
                      src={state.avatarUrl}
                      alt={`${state.displayName} avatar`}
                      onLoad={() => setAvatarState('ok')}
                      onError={() => setAvatarState('failed')}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: avatarState === 'ok' ? 1 : 0, transition: 'opacity .4s var(--ease)' }}
                    />
                  )}
                </div>
                {state.hasDecoration && (
                  <img src={state.decorationUrl} alt="" aria-hidden="true" style={{ position: 'absolute', top: '50%', left: '50%', width: '124%', height: '124%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }} />
                )}
                <span
                  title={state.statusText}
                  style={{ position: 'absolute', right: '2px', bottom: '8px', width: '20px', height: '20px', borderRadius: '50%', border: '4px solid var(--card)', background: 'var(--status)', animation: 'pulse 2.4s infinite', zIndex: 2 }}
                />
              </div>
            </div>

            <nav aria-label="Social links" style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', gap: '8px' }}>
              {config.profile.socials.map((s) => (
                // A social with `copy` instead of `url` puts that text on the
                // clipboard rather than navigating — used for the address, so
                // it isn't a mailto: and isn't scrapeable as a link.
                s.copy ? (
                  <button
                    key={s.title}
                    onClick={() => copyToClipboard(s.copy, s.title)}
                    className="om-social"
                    title={copied === s.title ? 'Copied' : `Copy ${s.copy}`}
                    aria-label={`Copy ${s.title.toLowerCase()} address`}
                    style={{ ...socialStyle, cursor: 'pointer', color: copied === s.title ? 'var(--accent3, var(--accent))' : 'inherit' }}
                  >
                    {copied === s.title ? '✓' : <Icon name={s.icon} size={18} />}
                  </button>
                ) : (
                  <ExternalLink key={s.title} href={s.url} title={s.title} className="om-social" style={socialStyle}>
                    <Icon name={s.icon} size={18} />
                  </ExternalLink>
                )
              ))}
            </nav>

            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{
                  margin: 0,
                  fontSize: 'clamp(22px, 6vw, 27px)',
                  fontWeight: 800,
                  letterSpacing: '-.6px',
                  // Faintly graded so the name reads as the brightest thing on
                  // the page without being pure white against near-black.
                  background: 'linear-gradient(100deg, var(--text), color-mix(in srgb, var(--text) 72%, var(--accent3, var(--accent))))',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}>{state.displayName}</h1>
                <span className="om-chip" style={{ fontSize: '12px', color: 'var(--muted)', padding: '4px 10px' }}>{state.userTag}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '13px', color: 'var(--muted)' }}>
                <span aria-hidden="true" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status)', display: 'inline-block', boxShadow: '0 0 10px var(--status)' }} />
                {state.statusText}
              </div>
            </div>
          </div>
        </header>

        {/* ===== TAB BAR ===== */}
        <div
          className="om-tabs"
          ref={tabsRef}
          role="tablist"
          aria-label="Sections"
          onKeyDown={onTabKeyDown}
          style={{ animation: 'fadeUp .6s var(--ease-out) .06s both', '--cols': cols, '--cols-even': colsEven }}
        >
          <span className="om-tab-pill" ref={pillRef} aria-hidden="true" />
          {config.tabs.map((tab, i) => {
            const on = active === tab.id
            return (
              <button
                key={tab.id}
                ref={(el) => { tabRefs.current[i] = el }}
                className="om-tab"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={on}
                aria-controls={`panel-${tab.id}`}
                tabIndex={on ? 0 : -1}
                onClick={() => setTab(tab.id)}
                title={tab.title}
              >
                <Icon name={tab.icon} size={18} />
                <span className="om-tab-label">{tab.title}</span>
              </button>
            )
          })}
        </div>

        {/* ===== ACTIVE SECTION ===== */}
        {Section && (
          <div
            key={activeTab.id}
            className="om-section"
            role="tabpanel"
            id={`panel-${activeTab.id}`}
            aria-labelledby={`tab-${activeTab.id}`}
            tabIndex={-1}
          >
            <Section tab={activeTab} />
          </div>
        )}

        {config.footer && (
          <footer style={{ textAlign: 'center', fontSize: '11px', color: 'var(--muted)', opacity: 0.55, paddingTop: '6px', letterSpacing: '.4px' }}>{config.footer}</footer>
        )}

      </main>
    </div>
  )
}
