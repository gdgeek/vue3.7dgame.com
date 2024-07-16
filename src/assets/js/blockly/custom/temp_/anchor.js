import Blockly from 'blockly'
import EventType from './type'
import Helper from '../helper'
import Argument from '../argument'
const data = {
  name: 'anchor'
}
const block = {
  title: data.name,
  type: EventType.name,
  colour: EventType.colour,
  getBlockJson({ resource }) {
    const json = {
      type: 'block_type',
      message0: '锚点 %1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'Anchor',
          options: function () {
            let opt = [['none', '']]
            resource.anchors.forEach(item => {
              opt.push([item.parameters.title, item.parameters.uuid])
            })
            return opt
          }
        }
      ],
      output: 'Parameter',
      colour: EventType.colour,
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
  getLua() {
    const lua = function (block) {
      var key = block.getFieldValue('Anchor')
      return [Argument.anchor(key), Blockly.Lua.ORDER_NONE]
    }
    return lua
  },
  toolbox: {
    kind: 'block',
    type: data.name
  }
}
export default block
