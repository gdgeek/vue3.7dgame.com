import Blockly from 'blockly'
import DataType from './type'
const data = {
  name: 'vector3_data'
}
const block = {
  title: data.name,
  type: DataType.name,
  colour: DataType.colour,
  getBlock: function ({ }) {
    const block = {
      init: function () {
        this.jsonInit({
          type: data.name,
          message0: 'X %1 Y %2 Z %3',
          args0: [
            {
              type: 'input_value',
              name: 'X',
              check: 'Number'
            },
            {
              type: 'input_value',
              name: 'Y',
              check: 'Number'
            },
            {
              type: 'input_value',
              name: 'Z',
              check: 'Number'
            }
          ],
          inputsInline: true,
          output: 'Vector3',
          colour: DataType.colour,
          tooltip: '',
          helpUrl: ''
        })
      }
    }
    return block
  },
  getLua({ }) {
    const lua = function (block) {
      var value_x = Blockly.Lua.valueToCode(
        block,
        'X',
        Blockly.Lua.ORDER_ATOMIC
      )
      var value_y = Blockly.Lua.valueToCode(
        block,
        'Y',
        Blockly.Lua.ORDER_ATOMIC
      )
      var value_z = Blockly.Lua.valueToCode(
        block,
        'Z',
        Blockly.Lua.ORDER_ATOMIC
      )
      // TODO: Assemble Lua into code variable.
      var code = 'CS.UnityEngine.Vector3(' + [value_x, value_y, value_z] + ')'
      // TODO: Change ORDER_NONE to the correct strength.
      return [code, Blockly.Lua.ORDER_NONE]
    }
    return lua
  },
  toolbox: {
    kind: 'block',
    type: data.name,
    inputs: {
      X: {
        shadow: {
          type: 'math_number',
          fields: {
            NUM: 0
          }
        }
      },
      Y: {
        shadow: {
          type: 'math_number',
          fields: {
            NUM: 0
          }
        }
      },
      Z: {
        shadow: {
          type: 'math_number',
          fields: {
            NUM: 0
          }
        }
      }
    }
  }
}
export default block
