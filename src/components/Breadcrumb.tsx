import { Fragment } from 'react'

const FONT_MONO = "'IBM Plex Mono', monospace"

interface BreadcrumbItem {
  label: string
  onClick?: () => void
}

interface Props {
  items: BreadcrumbItem[]
}

export default function Breadcrumb({ items }: Props) {
  return (
    <nav className="flex items-center">
      {items.map((item, index) => {
        const isClickable = !!item.onClick

        return (
          <Fragment key={index}>
            {index > 0 && (
              <span
                className="text-[#9ca4a4] text-[14px] leading-[18px] tracking-[-0.28px] px-1 select-none"
                style={{ fontFamily: FONT_MONO }}
                aria-hidden
              >
                &gt;
              </span>
            )}

            {isClickable ? (
              <button
                onClick={item.onClick}
                className={[
                  'text-[#2a2d2d] text-[14px] leading-[18px] tracking-[-0.28px]',
                  'underline decoration-solid',
                  'hover:font-medium hover:bg-[#fbffe5]',
                  'active:font-medium active:bg-[#f4ffc8]',
                  'transition-colors cursor-yellow-circle px-1',
                ].join(' ')}
                style={{ fontFamily: FONT_MONO }}
              >
                {item.label}
              </button>
            ) : (
              <span
                className={[
                  'text-[14px] leading-[18px] tracking-[-0.28px] px-1 text-[#2a2d2d]',
                ].join(' ')}
                style={{ fontFamily: FONT_MONO }}
              >
                {item.label}
              </span>
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}
