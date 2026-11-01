// ── lanyard.js ───────────────────────────────────────────────────────────
// Fetches Discord presence via the Lanyard API and normalises it into the
// shape the app renders: display name, tag, avatar/decoration URLs, the
// presence key ('online' | 'idle' | 'dnd' | 'offline'), and a single "live
// activity" the card can show — whichever of these is most worth surfacing:
//
//   1. Listening to Spotify  → track, artist, album art, playback progress
//   2. A custom status       → the emoji + text the user set themselves
//   3. The richest "playing" activity → name, and details/state if present
//
// Throws on failure — the caller decides the fallback.

const CDN = 'https://cdn.discordapp.com'
// Discord activity `type`: 0 Playing, 1 Streaming, 2 Listening, 3 Watching,
// 4 Custom Status, 5 Competing. Only these two are used directly below; the
// rest fall into "playing" since they all read the same way (name + detail).
const TYPE_CUSTOM = 4
const TYPE_STREAMING = 1

function pickActivity(data) {
  if (data.listening_to_spotify && data.spotify) {
    const sp = data.spotify
    return {
      kind: 'spotify',
      song: sp.song,
      artist: sp.artist,
      album: sp.album,
      albumArt: sp.album_art_url,
      trackId: sp.track_id,
      start: sp.timestamps?.start ?? null,
      end: sp.timestamps?.end ?? null,
    }
  }

  const activities = Array.isArray(data.activities) ? data.activities : []
  const custom = activities.find((a) => a.type === TYPE_CUSTOM && (a.state || a.emoji))
  if (custom) {
    return {
      kind: 'custom',
      text: custom.state || '',
      emojiUrl: custom.emoji?.id
        ? `${CDN}/emojis/${custom.emoji.id}.${custom.emoji.animated ? 'gif' : 'png'}?size=32`
        : '',
      emojiFallback: !custom.emoji?.id ? custom.emoji?.name : '',
    }
  }

  // Prefer one with large-image art (a game icon) over a bare name, but take
  // whatever's there — streaming included, since "Streaming — <title>" still
  // reads fine through the generic "playing" row.
  const playing = activities.find((a) => a.type !== TYPE_CUSTOM && a.assets?.large_image) ||
    activities.find((a) => a.type !== TYPE_CUSTOM)
  if (playing) {
    const img = playing.assets?.large_image
    // Lanyard passes through raw asset keys; only the two CDN-hosted forms
    // ("mp:" external proxy, bare snowflake) resolve to a real URL.
    const image = img?.startsWith('mp:')
      ? `https://media.discordapp.net/${img.slice(3)}`
      : img
        ? `${CDN}/app-assets/${playing.application_id}/${img}.png`
        : ''
    return {
      kind: playing.type === TYPE_STREAMING ? 'streaming' : 'playing',
      name: playing.name,
      detail: playing.details || '',
      state: playing.state || '',
      image,
      url: playing.url || '',
    }
  }

  return null
}

export async function fetchPresence(discordId) {
  const res = await fetch(`https://api.lanyard.rest/v1/users/${discordId}`)
  const json = await res.json()
  if (!json.success) throw new Error('lanyard request failed')

  const data = json.data
  const user = data.discord_user
  const name = user.global_name || user.username || 'user'
  const avatarUrl = user.avatar
    ? `${CDN}/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith('a_') ? 'gif' : 'png'}?size=256`
    : `${CDN}/embed/avatars/${(Number(user.discriminator) || 0) % 5}.png`
  const deco = user.avatar_decoration_data

  return {
    displayName: name,
    userTag: '@' + (user.username || name),
    avatarUrl,
    statusKey: data.discord_status,
    decorationUrl: deco && deco.asset
      ? `${CDN}/avatar-decoration-presets/${deco.asset}.png?size=160&passthrough=true`
      : '',
    activity: pickActivity(data),
  }
}
