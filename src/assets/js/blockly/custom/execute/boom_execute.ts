import * as Blockly from 'blockly';
import DataType from './type'
import { LuaGenerator } from 'blockly/lua';

const luaGeneratorInstance = new LuaGenerator() as any;

// 定义数据对象类型
interface Data {
  name: string;
}

// 定义参数类型
interface Parameters {
  resource: {
    action: { name: string; uuid: string }[];
  };
}

// 定义 BlockJson 类型
interface BlockJson {
  type: string;
  message0: string;
  args0: any[];
  inputsInline: boolean;
  previousStatement: any,
  nextStatement: any,
  colour: number;
  tooltip: string;
  helpUrl: string;
}

// 定义 Block 类型
interface Block {
  title: string;
  type: string;
  colour: number;
  getBlockJson: (parameters: Parameters) => BlockJson;
  getBlock: (parameters: Parameters) => Blockly.Block;
  getLua: (parameters: { index: any }) => (block: Blockly.Block) => string;
  toolbox: {
    kind: string;
    type: string;
    inputs: {
      [key: string]: {
        shadow: {
          type: string;
          inputs?: {
            [key: string]: {
              shadow: {
                type: string;
                fields?: {
                  NUM: number;
                };
              };
            };
          };
        };
      };
    };
  };
}

const data: Data = {
  name: 'boom_execute'
}

const block: Block = {
  title: data.name,
  type: DataType.name,
  colour: DataType.colour,
  getBlockJson({ }) {
    const json: BlockJson = {
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
    } as Blockly.Block
    return data
  },
  getLua({ }) {
    const lua = function (block: Blockly.Block) {
      var value_boom = luaGeneratorInstance.valueToCode(
        block,
        'boom',
        luaGeneratorInstance.ORDER_ATOMIC
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
