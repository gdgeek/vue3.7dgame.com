import * as Blockly from 'blockly';
import DataType from './type';
import { LuaGenerator } from 'blockly/lua';

const luaGeneratorInstance = new LuaGenerator() as any;

// 定义 data 对象的类型
interface Data {
  name: string;
}

// 定义 block 对象的类型
interface Block {
  title: string;
  type: string;
  getBlock: (parameters: any) => Blockly.Block;
  getLua: (parameters: any) => (block: Blockly.Block) => [string, number];
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
  name: 'transform_data'
};

const block: Block = {
  title: data.name,
  type: DataType.name,
  getBlock({ }): Blockly.Block {
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
        });
      }
    } as Blockly.Block; // 使用类型断言来满足 TypeScript 的类型要求

    return block;
  },
  getLua({ }): (block: Blockly.Block) => [string, number] {
    const lua = function (block: Blockly.Block): [string, number] {
      const value_position = luaGeneratorInstance.valueToCode(
        block,
        'position',
        luaGeneratorInstance.ORDER_ATOMIC
      );
      const value_scale = luaGeneratorInstance.valueToCode(
        block,
        'scale',
        luaGeneratorInstance.ORDER_ATOMIC
      );
      const value_rotate = luaGeneratorInstance.valueToCode(
        block,
        'rotate',
        luaGeneratorInstance.ORDER_ATOMIC
      );

      const code = `CS.MLua.Transform(${value_position}, ${value_rotate}, ${value_scale})`;
      return [code, luaGeneratorInstance.ORDER_NONE]; // TODO: Change ORDER_NONE to the correct strength.
    };
    return lua;
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
};

export default block;

