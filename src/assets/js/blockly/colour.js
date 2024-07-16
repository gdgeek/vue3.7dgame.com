export default {
  kind: 'category',
  name: '颜色',
  colour: '%{BKY_COLOUR_HUE}',
  contents: [
    {
      kind: 'block',
      type: 'colour_picker'
    },
    {
      kind: 'block',
      type: 'colour_rgb'
    },
    {
      kind: 'block',
      type: 'colour_blend'
    }
  ]
}
