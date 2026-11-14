import { avatarPalette, initial } from './avatar'

export function Avatar({ nickname, size = 36 }: { nickname: string; size?: number }) {
  const p = avatarPalette(nickname)
  return (
    <span
      className="avatar"
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size * 0.44, background: p.dark, color: p.light }}
    >
      {initial(nickname)}
    </span>
  )
}
