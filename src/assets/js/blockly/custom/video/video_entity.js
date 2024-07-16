import Blockly from 'blockly'
import DataType from './type'
import Helper from '../helper'

const data = {
  name: 'video_entity'
}
const block = {
  title: data.name,
  type: DataType.name,
  colour: DataType.colour,
  getBlockJson({ resource }) {
    const json = {
      type: data.name,
      message0: '视频 %1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'Video',
          options: function () {
            const video = resource.video
            let opt = [['none', '']]
            video.forEach(({ name, uuid }) => {
              opt.push([name, uuid])
            })
            return opt
          }
        }
      ],
      output: 'Video',
      colour: DataType.colour,
      tooltip: '',
      helpUrl: ''
    }
    return json
  },
  getBlock: function (parameters) {
    const data = {
      init: function () {
        const json = block.getBlockJson(parameters)
        this.jsonInit(json)
      }
    }
    return data
  },
  getLua({ index }) {
    const lua = function (block) {
      var dropdown = block.getFieldValue('Video')

      return [Helper.handler(dropdown), Blockly.Lua.ORDER_NONE]
    }
    return lua
  },
  toolbox: {
    kind: 'block',
    type: data.name
  }
}
export default block
