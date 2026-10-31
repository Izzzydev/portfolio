// <Icon name="github" size={18} /> — renders an SVG from src/assets/icons/.
//
// Icons are kept as standalone .svg files and imported explicitly below.
// They are injected inline (not via <img>) so `currentColor` still works —
// every icon on the site tints itself from the CSS accent/muted colour of
// its parent, which an <img> reference cannot do.
// To add an icon: drop the .svg in src/assets/icons, import it here, and add
// it to the registry.
import ban from '../assets/icons/ban.svg?raw'
import code from '../assets/icons/code.svg?raw'
import codeberg from '../assets/icons/codeberg.svg?raw'
import email from '../assets/icons/email.svg?raw'
import external from '../assets/icons/external.svg?raw'
import gamepad from '../assets/icons/gamepad.svg?raw'
import github from '../assets/icons/github.svg?raw'
import grid from '../assets/icons/grid.svg?raw'
import music from '../assets/icons/music.svg?raw'
import robot from '../assets/icons/robot.svg?raw'
import user from '../assets/icons/user.svg?raw'

const registry = { ban, code, codeberg, email, external, gamepad, github, grid, music, robot, user }

export default function Icon({ name, size = 18, style, className }) {
  const svg = registry[name]
  if (!svg) return null
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{ width: size, height: size, display: 'inline-flex', flexShrink: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
