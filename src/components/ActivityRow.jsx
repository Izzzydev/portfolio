import { useEffect, useState } from 'react'
import ExternalLink from './ExternalLink.jsx'
import Icon from './Icon.jsx'

// A live tick of the current time, updated once a second — only mounted
// while something actually needs it (a Spotify progress bar), so the rest of
// the page never re-renders on a timer.
function useNow(enabled) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [enabled])
  return now
}

const fmt = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Three bars bouncing at slightly different speeds — the classic "now
// playing" equalizer glyph, drawn in CSS rather than fetched as an icon.
function EqBars() {
  return (
    <span className="om-eq" aria-hidden="true">
      <i /><i /><i />
    </span>
  )
}

// The row under the status line that shows whatever Lanyard says is live
// right now: a Spotify track (with cover art and a moving progress bar), a
// custom status, or a generic "playing" activity. Renders nothing when
// there's nothing to show, so an idle/offline profile looks exactly like it
// did before this existed.
export default function ActivityRow({ activity }) {
  const isSpotify = activity?.kind === 'spotify'
  const now = useNow(isSpotify)

  if (!activity) return null

  if (isSpotify) {
    const { song, artist, albumArt, trackId, start, end } = activity
    const total = end && start ? end - start : 0
    const elapsed = start ? Math.min(total, Math.max(0, now - start)) : 0
    const pct = total > 0 ? (elapsed / total) * 100 : 0
    const body = (
      <>
        {albumArt ? (
          <img src={albumArt} alt="" aria-hidden="true" className="om-activity-art" />
        ) : (
          <span className="om-activity-art" aria-hidden="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="music" size={16} />
          </span>
        )}
        <span className="om-activity-body">
          <span className="om-activity-top">
            <EqBars />
            <span className="om-activity-title">{song}</span>
          </span>
          <span className="om-activity-sub">{artist}</span>
          {total > 0 && (
            <span className="om-activity-progress">
              <span className="om-activity-progress-fill" style={{ width: pct + '%' }} />
            </span>
          )}
        </span>
        {total > 0 && (
          <span className="om-activity-time">{fmt(elapsed)} / {fmt(total)}</span>
        )}
      </>
    )
    return trackId ? (
      <ExternalLink href={`https://open.spotify.com/track/${trackId}`} className="om-activity" title={`Open "${song}" on Spotify`}>
        {body}
      </ExternalLink>
    ) : (
      <div className="om-activity">{body}</div>
    )
  }

  if (activity.kind === 'custom') {
    if (!activity.text) return null
    return (
      <div className="om-activity om-activity--plain">
        {activity.emojiUrl
          ? <img src={activity.emojiUrl} alt="" aria-hidden="true" className="om-activity-emoji" />
          : activity.emojiFallback
            ? <span aria-hidden="true" style={{ fontSize: '15px', lineHeight: 1 }}>{activity.emojiFallback}</span>
            : null}
        <span className="om-activity-sub" style={{ color: 'var(--text)' }}>{activity.text}</span>
      </div>
    )
  }

  // 'playing' or 'streaming'
  const label = activity.kind === 'streaming' ? 'Streaming' : 'Playing'
  const body = (
    <>
      {activity.image ? (
        <img src={activity.image} alt="" aria-hidden="true" className="om-activity-art" style={{ borderRadius: 'var(--r-sm)' }} />
      ) : (
        <span className="om-activity-art" aria-hidden="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--r-sm)' }}>
          <Icon name="gamepad" size={16} />
        </span>
      )}
      <span className="om-activity-body">
        <span className="om-activity-top">
          <span className="om-activity-kicker">{label}</span>
          <span className="om-activity-title">{activity.name}</span>
        </span>
        {(activity.detail || activity.state) && (
          <span className="om-activity-sub">{[activity.detail, activity.state].filter(Boolean).join(' — ')}</span>
        )}
      </span>
    </>
  )
  return activity.url ? (
    <ExternalLink href={activity.url} className="om-activity" title={`${label} ${activity.name}`}>{body}</ExternalLink>
  ) : (
    <div className="om-activity">{body}</div>
  )
}
