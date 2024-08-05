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
  colour: number;
  getBlock: (parameters: any) => Blockly.Block;
  getLua: (parameters: any) => (block: Blockly.Block) => [string, number];
  toolbox: {
    kind: string;
    type: string;
    inputs: {
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
}

const data: Data = {
  name: 'vector3_data'
};

const block: Block = {
  title: data.name,
  type: DataType.name,
  colour: DataType.colour,
  getBlock: function ({ }): Blockly.Block {
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
        });
      }
    } as Blockly.Block; // 使用类型断言来满足 TypeScript 的类型要求

    return block;
  },
  getLua({ }): (block: Blockly.Block) => [string, number] {
    const lua = function (block: Blockly.Block): [string, number] {
      const value_x = luaGeneratorInstance.valueToCode(
        block,
        'X',
        luaGeneratorInstance.ORDER_ATOMIC
      );
      const value_y = luaGeneratorInstance.valueToCode(
        block,
        'Y',
        luaGeneratorInstance.ORDER_ATOMIC
      );
      const value_z = luaGeneratorInstance.valueToCode(
        block,
        'Z',
        luaGeneratorInstance.ORDER_ATOMIC
      );

      // 生成 Lua 代码
      const code = `CS.UnityEngine.Vector3(${value_x}, ${value_y}, ${value_z})`;
      return [code, luaGeneratorInstance.ORDER_NONE]; // TODO: Change ORDER_NONE to the correct strength.
    };
    return lua;
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
};

export default block;
