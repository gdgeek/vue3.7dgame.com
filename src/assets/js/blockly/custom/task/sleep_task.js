import Blockly from 'blockly'
import EventType from './type'
import Helper from '../helper'
const data = {
  name: 'sleep_task'
}
const block = {
  title: data.name,
  type: EventType.name,
  colour: EventType.colour,
  getBlockJson({ resource }) {
    const json = {
      type: 'block_type',
      message0: '休眠： %1 秒',
      args0: [
        {
          type: 'input_value',
          name: 'Time',
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
      var time = Blockly.Lua.valueToCode(block, 'Time', Blockly.Lua.ORDER_NONE)

      // TODO: Assemble Lua into code variable.
      var code = null
      code = '_G.task.sleep(' + time + ')'
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
