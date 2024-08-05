import * as Blockly from 'blockly';
import DataType from './type'
const data = {
  name: 'boom_execute'
}
const block = {
  title: data.name,
  type: DataType.name,
  colour: DataType.colour,
  getBlockJson({ }) {
    const json = {
      type: data.name,
      message0: '爆炸 %1',
      args0: [
        {
          type: 'input_value',
          name: 'boom',
          check: 'Vector3'
        }
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
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
  getLua({ }) {
    const lua = function (block) {
      var value_boom = Blockly.Lua.valueToCode(
        block,
        'boom',
        Blockly.Lua.ORDER_ATOMIC
      )
      // TODO: Assemble Lua into code variable.

      var code = 'CS.MLua.Helper.Boom(target, ' + value_boom + ')\n'
      return code
    }
    return lua
  },
  toolbox: {
    kind: 'block',
    type: data.name,
    inputs: {
      boom: {
        shadow: {
          type: 'vector3_data',
          inputs: {
            X: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 0.2
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
    }
  }
}
/*
<value name="boom">
<shadow  type="vector3_data">
<value name="X">
<shadow type="math_number">
<field name="NUM">20</field>
</shadow></value><value name="Y">
<shadow type="math_number">
<field name="NUM">0</field></shadow></value>
<value name="Z"><shadow type="math_number">
<field name="NUM">0</field></shadow></value>
</shadow></value>
 */
export default block
