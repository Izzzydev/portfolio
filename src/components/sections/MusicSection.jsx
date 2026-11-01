import SectionHeading from '../SectionHeading.jsx'
import { cardPad } from '../../lib/styles.js'

// `type: "music"` — official Spotify embed players for each configured track
// (30s preview for anyone, full track for logged-in Spotify listeners), plus
// an optional footnote.
export default function MusicSection({ tab }) {
  return (
    <div className="om-card" style={cardPad}>
      <SectionHeading glyph={tab.glyph} icon={tab.headingIcon} style={{ marginBottom: '16px' }}>{tab.heading}</SectionHeading>

      <div className="om-stagger" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {(tab.tracks || []).map((t, i) => (
          // The iframe is wrapped so the entrance animation and the rounded
          // clip are applied by us rather than fought over with Spotify's own
          // styles inside the frame.
          <div key={t.id} style={{ '--i': i, borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--card2)' }}>
            <iframe
              title={`${t.title} — ${t.artist}`}
              src={`https://open.spotify.com/embed/track/${t.id}?utm_source=generator&theme=0`}
              width="100%"
              height="80"
              loading="lazy"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              style={{ border: 'none', display: 'block', colorScheme: 'normal' }}
            />
          </div>
        ))}
      </div>

      {tab.note && (
        <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '14px', opacity: 0.7, lineHeight: 1.6, textWrap: 'pretty' }}>{tab.note}</div>
      )}
    </div>
  )
}
