import { useState } from 'react'
import ExternalLink from '../ExternalLink.jsx'
import Marquee from '../Marquee.jsx'
import SectionHeading from '../SectionHeading.jsx'
import { cardPadBleed } from '../../lib/styles.js'

const tileStyle = {
  width: '58px',
  height: '58px',
  borderRadius: 'var(--r-md)',
  background: 'var(--card2)',
  border: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  transition: 'transform .25s var(--ease), border-color .25s var(--ease)',
}

const gameCardStyle = {
  width: '118px',
  flexShrink: 0,
  borderRadius: 'var(--r-md)',
  overflow: 'hidden',
  background: 'var(--card2)',
  border: '1px solid var(--border)',
  transition: 'transform .25s var(--ease), border-color .25s var(--ease)',
}

// Language icons come from skillicons.dev. If that CDN is blocked or down,
// fall back to the label itself rather than leaving a row of broken-image
// boxes with alt text spilling out of 58px tiles.
function LangIcon({ lang }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', padding: '0 6px', textAlign: 'center', lineHeight: 1.2, overflow: 'hidden' }}>
        {lang.label}
      </span>
    )
  }
  return (
    <img
      src={lang.url}
      alt={lang.label}
      width="34"
      height="34"
      loading="lazy"
      onError={() => setFailed(true)}
      style={{ display: 'block' }}
    />
  )
}

// One cover tile, shared by the single-item and marquee paths so the two
// render identically.
function GameCard({ game, style }) {
  return (
    <ExternalLink href={game.link} title={game.label} className="om-game-card" style={{ ...gameCardStyle, ...style }}>
      <div style={{ aspectRatio: '3 / 4', background: game.bg || 'var(--card3)', overflow: 'hidden', padding: game.fit === 'contain' ? '16px' : 0 }}>
        <img src={game.img} alt={game.label} loading="lazy" draggable="false" style={{ width: '100%', height: '100%', objectFit: game.fit || 'cover', display: 'block', userSelect: 'none' }} />
      </div>
      <div style={{ padding: '9px 11px', fontSize: '11.5px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{game.label}</div>
    </ExternalLink>
  )
}

// `type: "skills"` — interest chips, a marquee of language icons, and an
// optional row of game covers. Both marquees pause on hover (see
// lib/marquee.js) so a tile can actually be clicked.
export default function SkillsSection({ tab }) {
  const langs = (tab.languages?.items || []).map((l) => ({ ...l, url: `https://skillicons.dev/icons?i=${l.key}` }))
  const langsLoop = [...langs, ...langs]
  const games = tab.games?.items || []
  const gamesLoop = [...games, ...games]

  return (
    <div className="om-card" style={cardPadBleed}>
      <SectionHeading glyph={tab.glyph} icon={tab.headingIcon} style={{ marginBottom: '16px', padding: '0 24px' }}>{tab.heading}</SectionHeading>

      <div className="om-stagger" style={{ padding: '0 24px 16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {(tab.interests || []).map((t, i) => (
          <span key={t} className="om-chip" style={{ '--i': i }}>{t}</span>
        ))}
      </div>

      <Marquee settings={tab.languages?.marquee}>
        {langsLoop.map((lang, i) => (
          <ExternalLink key={i} href={lang.link} title={lang.label} className="om-lang-tile" style={tileStyle}>
            <LangIcon lang={lang} />
          </ExternalLink>
        ))}
      </Marquee>

      {games.length > 0 && (
        <>
          <SectionHeading glyph={tab.games.headingGlyph} icon={tab.games.headingIcon} style={{ margin: '22px 24px 14px' }}>{tab.games.heading}</SectionHeading>
          {games.length === 1 ? (
            <div style={{ padding: '0 24px' }}>
              <GameCard game={games[0]} style={{ display: 'inline-block' }} />
            </div>
          ) : (
            <Marquee settings={tab.games.marquee}>
              {gamesLoop.map((game, i) => <GameCard key={i} game={game} />)}
            </Marquee>
          )}
        </>
      )}
    </div>
  )
}
