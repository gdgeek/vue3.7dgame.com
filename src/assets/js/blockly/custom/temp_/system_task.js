import * as Blockly from 'blockly';
import EventType from './type'
const data = {
  name: 'system_task'
}
const block = {
  title: data.name,
  type: EventType.name,
  colour: EventType.colour,
  getBlockJson({ resource }) {
    const json = {
      type: 'block_type',
      message0: '系统方法： %1 参数 %2',
      args0: [
        {
          type: 'input_value',
          name: 'Input',
          inputsInline: true,
          check: 'String'
        },
        {
          type: 'input_value',
          name: 'Parameter',
          check: 'Parameter'
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
      var input = Blockly.Lua.valueToCode(
        block,
        'Input',
        Blockly.Lua.ORDER_NONE
      )
      var parameters = Blockly.Lua.valueToCode(
        block,
        'Parameter',
        Blockly.Lua.ORDER_ATOMIC
      )

      // TODO: Assemble Lua into code variable.
      var code = null
      if (parameters) {
        code = '_G.system.task(' + input + ',' + parameters + ')'
      } else {
        code = '_G.system.task(' + input + ')'
      }

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
