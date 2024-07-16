import Blockly from 'blockly'
import EventType from './type'
import Helper from '../helper'
const data = {
  name: 'task-tween'
}
const block = {
  title: data.name,
  type: EventType.name,
  colour: EventType.colour,
  getBlockJson({ resource }) {
    const json = {
      "type": "block_type",
      "message0": "物体 %1 移动到 %2 用时 %3 %4 差值方式 %5",
      "args0": [
        {
          "type": "input_value",
          "name": "From",
          "check": "Entity"
        },
        {
          "type": "input_value",
          "name": "To",
          "check": "Entity"
        },
        {
          "type": "field_number",
          "name": "Time",
          "value": 0.03
        },
        {
          "type": "input_dummy"
        },
        {
          "type": "field_dropdown",
          "name": "Easy",
          "options": [
            [
              "LINEAR",
              "LINEAR"
            ],
            [
              "EASE_IN",
              "EASE_IN"
            ],
            [
              "EASE_OUT",
              "EASE_OUT"
            ],
            [
              "EASE_IN_OUT",
              "EASE_IN_OUT"
            ],
            [
              "BOUNCE_IN",
              "BOUNCE_IN"
            ],
            [
              "BOUNCE_OUT",
              "BOUNCE_OUT"
            ],
            [
              "BOUNCE_IN_OUT",
              "BOUNCE_IN_OUT"
            ]
          ]
        }
      ],
      "inputsInline": true,
      "output": "Task",
      "colour": EventType.colour,
      "tooltip": "",
      "helpUrl": "",

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
      var time = block.getFieldValue('Time')
      var easy = block.getFieldValue('Easy')

      var from = Blockly.Lua.valueToCode(
        block,
        'From',
        Blockly.Lua.ORDER_ATOMIC
      )

      var to = Blockly.Lua.valueToCode(
        block,
        'To',
        Blockly.Lua.ORDER_ATOMIC
      )
      // TODO: Assemble Lua into code variable.
      var code = '_G.task.tween(' + from + ', ' + to + ', ' + time + ', "' + easy + '")'
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