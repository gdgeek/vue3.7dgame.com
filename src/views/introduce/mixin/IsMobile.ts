const { body } = document
const WIDTH = 992 // refer to Bootstrap's responsive design
const XS = 768
const SM = 992
const MD = 1200
const XL = 1920

export function useIsMobile() {
  const isMobile = () => {
    const rect = body.getBoundingClientRect()
    return rect.width - 1 < WIDTH
  }

  const isXS = () => {
    const rect = body.getBoundingClientRect()
    return rect.width - 1 < XS
  }

  const isSM = () => {
    const rect = body.getBoundingClientRect()
    return rect.width - 1 < SM
  }

  const isMD = () => {
    const rect = body.getBoundingClientRect()
    return rect.width - 1 < MD
  }

  const isXL = () => {
    const rect = body.getBoundingClientRect()
    return rect.width - 1 < XL
  }

  return {
    isMobile,
    isXS,
    isSM,
    isMD,
    isXL
  }
}
