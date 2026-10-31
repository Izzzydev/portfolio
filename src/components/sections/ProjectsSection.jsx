import ExternalLink from '../ExternalLink.jsx'
import Icon from '../Icon.jsx'
import SectionHeading from '../SectionHeading.jsx'
import { cardPad } from '../../lib/styles.js'

const projectCardStyle = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: '152px',
  background: 'var(--card2)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-md)',
  padding: '16px',
}

// `type: "projects"` — description cards in a configurable-column grid.
// Cards with a `link` are clickable and get an external-link arrow; cards
// without one render dimmed (e.g. "coming soon").
//
// The grid uses auto-fit/minmax rather than a fixed column count, so the
// configured `columns` is a maximum: cards drop to one column on a phone
// instead of squeezing two 120px-wide cards side by side.
export default function ProjectsSection({ tab }) {
  const columns = tab.columns || 2
  return (
    <div className="om-card" style={cardPad}>
      <SectionHeading glyph={tab.glyph} icon={tab.headingIcon} style={{ marginBottom: '16px' }}>{tab.heading}</SectionHeading>
      <div
        className="om-stagger"
        style={{
          display: 'grid',
          gridTemplateColumns: columns > 1 ? 'repeat(auto-fit, minmax(min(190px, 100%), 1fr))' : '1fr',
          gap: '12px',
        }}
      >
        {(tab.items || []).map((p, i) => {
          const body = (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-.2px' }}>{p.title}</div>
                {p.link && <Icon name="external" size={13} className="om-arrow" style={{ color: 'var(--muted)' }} />}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '9px', lineHeight: 1.65, textWrap: 'pretty', flexGrow: 1 }}>{p.desc}</div>
              {(p.tags || []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                  {p.tags.map((t) => (
                    <span key={t} style={{ fontSize: '10px', letterSpacing: '.5px', textTransform: 'uppercase', fontWeight: 700, padding: '3px 8px', borderRadius: 'var(--r-pill)', color: 'var(--accent3, var(--accent))', background: 'color-mix(in srgb, var(--accent) 14%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 22%, transparent)' }}>{t}</span>
                  ))}
                </div>
              )}
            </>
          )
          return p.link ? (
            <ExternalLink key={p.id} href={p.link} className="om-project-card" style={{ ...projectCardStyle, '--i': i }}>{body}</ExternalLink>
          ) : (
            <div key={p.id} style={{ ...projectCardStyle, '--i': i, opacity: 0.6, borderStyle: 'dashed' }}>{body}</div>
          )
        })}
      </div>
    </div>
  )
}
