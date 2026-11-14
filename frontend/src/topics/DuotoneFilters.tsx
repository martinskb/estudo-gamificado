import { PALETTES, type PaletteName, duotoneTables } from './cover'

/** Filtros SVG usados pelas capas com foto (um por paleta), declarados uma vez na página. */
export function DuotoneFilters() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      {(Object.keys(PALETTES) as PaletteName[]).map((name) => {
        const t = duotoneTables(PALETTES[name].dark, PALETTES[name].light)
        return (
          <filter key={name} id={`duo-${name}`} colorInterpolationFilters="sRGB">
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncR type="table" tableValues={t.r} />
              <feFuncG type="table" tableValues={t.g} />
              <feFuncB type="table" tableValues={t.b} />
            </feComponentTransfer>
          </filter>
        )
      })}
    </svg>
  )
}
