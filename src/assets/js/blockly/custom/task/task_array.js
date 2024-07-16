import Blockly from 'blockly'
import EventType from './type'
import Helper from '../helper'
const data = {
  name: 'task_array'
}
const block = {
  title: data.name,
  type: EventType.name,
  colour: EventType.colour,
  getBlockJson({ resource }) {
    const json = {
      type: 'block_type',
      message0: '任务数组 %1 %2',
      args0: [
        {
          type: 'field_dropdown',
          name: 'ArrayType',
          options: [
            ['list', 'LIST'],
            ['set', 'SET']
          ]
        },
        {
          type: 'input_value',
          name: 'TaskArray',
          check: 'Array'
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
      var type = block.getFieldValue('ArrayType')

      var array = Blockly.Lua.valueToCode(
        block,
        'TaskArray',
        Blockly.Lua.ORDER_ATOMIC
      )

      var code = '_G.task.array("' + type + '",' + array + ')\n'

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
