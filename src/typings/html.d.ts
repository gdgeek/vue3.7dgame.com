// Extend HTML attributes for legacy/custom usage
declare module "vue" {
  interface HTMLAttributes {
    "data-aos"?: string
    "data-aos-delay"?: string | number
    "data-aos-duration"?: string | number
    "data-aos-easing"?: string
    "data-aos-once"?: string | boolean
    align?: string
    nowrap?: string | boolean
    shadow?: string
  }

  interface ImgHTMLAttributes {
    align?: string
    fit?: string
  }

  interface SVGAttributes {
    "xlink:href"?: string
  }

  interface ComponentCustomProps {
    id?: string | number
    modelModifiers?: Record<string, boolean>
    onClick?: ((event: MouseEvent) => void) | null
    onContextmenu?: ((event: MouseEvent) => void) | null
    onKeyup?: ((event: KeyboardEvent) => void) | null
    onKeydown?: ((event: KeyboardEvent) => void) | null
    onWheel?: ((event: WheelEvent) => void) | null
    onShow?: (() => void) | null
    onHide?: (() => void) | null
  }
}

export {}
