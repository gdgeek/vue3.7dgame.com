import Blockly from 'blockly'
import EventType from './type'

import Helper from '../helper'
const data = {
  name: 'output_event'
}
const block = {
  title: data.name,
  type: EventType.name,
  colour: EventType.colour,
  getBlockJson({ resource }) {
    const json = {
      type: 'block_type',
      message0: '输出事件 %1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'Output',
          options: function () {
            const output = resource.events.outputs
            let opt = [['none', '']]
            output.forEach(({ title, uuid }) => {
              opt.push([title, uuid])
            })
            return opt
          }
        }
      ],
      previousStatement: null,
      nextStatement: null,
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
  getLua({ index }) {
    const lua = function (block) {
      var output_event = block.getFieldValue('Output')

      // TODO: Assemble Lua into code variable.
      var code =
        "_G.event.trigger(index,'" + output_event + "')\n"

      return code
    }
    return lua
  },
  toolbox: {
    kind: 'block',
    type: data.name
  }
}
export default block
