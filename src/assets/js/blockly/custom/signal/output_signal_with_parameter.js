import Blockly from 'blockly'
import EventType from './type'

import Helper from '../helper'
const data = {
  name: 'output_signal_with_parameter'
}
const block = {
  title: data.name,
  type: EventType.name,
  colour: EventType.colour,
  getBlockJson({ resource }) {
    const json = {
      type: 'block_type',
      message0: '触发信号 %1 参数 %2',
      args0: [
        {
          type: 'field_dropdown',
          name: 'Output',
          options: function () {
            const output = resource.events.inputs
            let opt = [['none', JSON.stringify({ index: "", uuid: "" })]]
            output.forEach(({ title, index, uuid }) => {
              // alert(JSON.stringify({ index, uuid }))
              opt.push([title, JSON.stringify({ index, uuid })])
            })
            return opt
          }
        },
        {
          type: 'input_value',
          name: 'Parameter',
          check: 'Parameter'
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
      const data = JSON.parse(output_event)
      var parameter = Blockly.Lua.valueToCode(
        block,
        'Parameter',
        Blockly.Lua.ORDER_ATOMIC
      )
      //alert(JSON.stringify(data))
      var code = "_G.event.signal('" + data.index + "', '" + data.uuid + "'," + parameter + ")\n"
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
