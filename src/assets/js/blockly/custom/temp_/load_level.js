import * as Blockly from 'blockly';
import EventType from './type'
import Helper from '../helper'
const data = {
  name: 'load_level'
}
const block = {
  title: data.name,
  type: EventType.name,
  colour: EventType.colour,
  getBlockJson({ resource }) {
    const json = {
      type: 'block_type',
      message0: '载入： %1 场景',
      args0: [
        {
          type: 'input_value',
          name: 'Id',
          check: 'Number'
        }
      ],
      inputsInline: true,
      output: 'Task',
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
      var id = Blockly.Lua.valueToCode(block, 'Id', Blockly.Lua.ORDER_NONE)

      // TODO: Assemble Lua into code variable.
      var code = null
      code = '_G.task.load_level(' + id + ')'
      return [code, Blockly.Lua.ORDER_NONE]
    }
    return lua
  },
  toolbox: {
    kind: 'block',
    type: data.name
  }
}
export default block
