import Blockly from 'blockly'
import DataType from './type'
const data = {
  name: 'transform_data'
}
const block = {
  title: data.name,
  type: DataType.name,
  getBlock({}) {
    const block = {
      init: function () {
        this.jsonInit({
          type: data.name,
          message0: '位置 %1 旋转 %2 缩放 %3',
          args0: [
            {
              type: 'input_value',
              name: 'position',
              check: 'Vector3'
            },
            {
              type: 'input_value',
              name: 'rotate',
              check: 'Vector3'
            },
            {
              type: 'input_value',
              name: 'scale',
              check: 'Vector3'
            }
          ],
          inputsInline: false,
          output: 'Transform',
          colour: DataType.colour,
          tooltip: '',
          helpUrl: ''
        })
      }
    }
    return block
  },
  getLua({}) {
    const lua = function (block) {
      var value_position = Blockly.Lua.valueToCode(
        block,
        'position',
        Blockly.Lua.ORDER_ATOMIC
      )
      var value_scale = Blockly.Lua.valueToCode(
        block,
        'scale',
        Blockly.Lua.ORDER_ATOMIC
      )
      var value_rotate = Blockly.Lua.valueToCode(
        block,
        'rotate',
        Blockly.Lua.ORDER_ATOMIC
      )
      // TODO: Assemble Lua into code variable.
      var code =
        'CS.MLua.Transform(' +
        value_position +
        ', ' +
        value_rotate +
        ', ' +
        value_scale +
        ')'
      // TODO: Change ORDER_NONE to the correct strength.
      return [code, Blockly.Lua.ORDER_NONE]
    }
    return lua
  },
  toolbox: {
    kind: 'block',
    type: data.name,
    inputs: {
      position: {
        shadow: {
          type: 'vector3_data',
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
      },
      rotate: {
        shadow: {
          type: 'vector3_data',
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
      },
      scale: {
        shadow: {
          type: 'vector3_data',
          inputs: {
            X: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 1
                }
              }
            },
            Y: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 1
                }
              }
            },
            Z: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 1
                }
              }
            }
          }
        }
      }
    }
  }
}
export default block
