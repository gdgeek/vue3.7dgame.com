import Blockly from 'blockly'
import DataType from './type'

import Helper from '../helper'
const data = {
  name: 'picture_entity'
}
const block = {
  title: data.name,
  type: DataType.name,
  colour: DataType.colour,
  getBlockJson({ resource }) {
    const json = {
      type: data.name,
      message0: '图片 %1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'Picture',
          options: function () {
            const picture = resource.picture
            let opt = [['none', '']]
            picture.forEach(pic => {
              opt.push([pic.name, pic.uuid])
            })
            return opt
          }
        }
      ],
      output: 'Picture',
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
      var dropdown = block.getFieldValue('Picture')

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
