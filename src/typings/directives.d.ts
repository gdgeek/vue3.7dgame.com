import type { Directive } from "vue"

declare module "vue" {
  interface GlobalDirectives {
    vLoading: Directive
    vHighlight: Directive
  }
}

export {}
