import Icon from './Icon.jsx'
import { headingStyle } from '../lib/styles.js'

// Section heading with either a text glyph (e.g. "✦") or an SVG icon from
// assets — config supplies one or the other per section. The trailing rule
// fades out to the right, which anchors the short heading to the card's width
// instead of leaving it floating in the corner.
export default function SectionHeading({ glyph, icon, children, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '9px', ...style }}>
      <span style={{ color: 'var(--accent3, var(--accent))', display: 'flex', alignItems: 'center', fontSize: '15px' }}>
        {icon ? <Icon name={icon} size={16} /> : glyph}
      </span>
      <h2 style={headingStyle}>{children}</h2>
      <span
        aria-hidden="true"
        style={{
          flex: 1,
          height: '1px',
          minWidth: '12px',
          background: 'linear-gradient(90deg, var(--border), transparent)',
        }}
      />
    </div>
  )
}
