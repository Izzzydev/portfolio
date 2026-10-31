import ExternalLink from '../ExternalLink.jsx'
import Icon from '../Icon.jsx'
import SectionHeading from '../SectionHeading.jsx'
import { cardPad, headingStyle } from '../../lib/styles.js'

const flourishStyle = {
  textAlign: 'center',
  color: 'var(--accent2)',
  opacity: 0.55,
  fontSize: '12px',
  letterSpacing: '3px',
}

// A paragraph may be a plain string or { text, variant }. `variant: "quote"`
// sets it apart with an accent rule and italics — for pull quotes that would
// otherwise read as just another body line.
const asLine = (p) => (typeof p === 'string' ? { text: p } : p || {})

// `type: "text"` — heading, optional intro, body, and trailing links.
//
// Two layouts:
//   default        centered paragraphs, for prose (the About tab)
//   layout: "list" left-aligned bulleted rows, for enumerations where every
//                  line is a separate item rather than a continuing thought
//                  (the Do-Not-Interact and AI-policy tabs). Centering those
//                  made a list of seven short rules read as one paragraph.
export default function TextSection({ tab }) {
  const isList = tab.layout === 'list'
  const lines = (tab.paragraphs || []).map(asLine)
  // Prose defaults to centered (the About tab's look). Long-form sections set
  // align: "left", where a ragged centre axis makes multi-line rules hard to
  // scan back to the start of.
  const align = tab.align || (isList ? 'left' : 'center')

  return (
    <div className="om-card" style={cardPad}>
      <SectionHeading glyph={tab.glyph} icon={tab.headingIcon} style={{ marginBottom: '14px' }}>{tab.heading}</SectionHeading>

      {tab.flourish && <div style={{ ...flourishStyle, marginBottom: '16px' }}>{tab.flourish}</div>}

      {tab.intro && (
        <p style={{ margin: '0 0 16px', fontSize: '13px', lineHeight: 1.7, color: 'var(--muted)', textAlign: align, textWrap: 'pretty' }}>
          {tab.intro}
        </p>
      )}

      {isList ? (
        <ul className="om-list om-stagger">
          {lines.map((line, i) => (
            <li key={i} style={{ '--i': i }}>{line.text}</li>
          ))}
        </ul>
      ) : (
        <div className="om-stagger" style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: align }}>
          {lines.map((line, i) => (
            line.variant === 'quote' ? (
              <blockquote key={i} style={{
                '--i': i,
                margin: '2px 0',
                padding: '12px 16px',
                borderLeft: '2px solid var(--accent3, var(--accent))',
                borderRadius: '0 var(--r-sm) var(--r-sm) 0',
                background: 'var(--card2)',
                fontSize: '13.5px',
                lineHeight: 1.7,
                fontStyle: 'italic',
                color: 'var(--text)',
                textAlign: 'left',
                textWrap: 'pretty',
              }}>{line.text}</blockquote>
            ) : (
              <p key={i} style={{ '--i': i, margin: 0, fontSize: '14px', lineHeight: 1.75, color: 'var(--text)', textWrap: 'pretty' }}>{line.text}</p>
            )
          ))}
        </div>
      )}

      {/* An optional second block of list items under its own sub-heading —
          used by the AI tab to separate the policy from its exceptions. */}
      {tab.subList && (
        <div style={{ marginTop: '20px' }}>
          {tab.subList.heading && (
            <h3 style={{ ...headingStyle, fontSize: '11px', marginBottom: '12px', whiteSpace: 'normal' }}>{tab.subList.heading}</h3>
          )}
          <ul className="om-list om-stagger">
            {(tab.subList.items || []).map((item, i) => (
              <li key={i} style={{ '--i': i }}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {(tab.links || []).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: align === 'center' ? 'center' : 'flex-start', marginTop: '20px' }}>
          {tab.links.map((l) => (
            <ExternalLink key={l.url} href={l.url} className="om-chip" style={{ color: 'var(--accent3, var(--accent))', fontSize: '12.5px', cursor: 'pointer' }}>
              {l.label}
              <Icon name="external" size={12} />
            </ExternalLink>
          ))}
        </div>
      )}

      {tab.flourish && <div style={{ ...flourishStyle, marginTop: '18px' }}>{tab.flourish}</div>}
    </div>
  )
}
