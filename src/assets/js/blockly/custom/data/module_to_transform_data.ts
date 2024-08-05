import * as Blockly from 'blockly';
import DataType from './type';
import { LuaGenerator } from 'blockly/lua';

// 定义 data 对象的类型
interface Data {
  name: string;
}

// 定义 block 对象的类型
interface Block {
  title: string;
  type: string;
  getBlock: (parameters: any) => Blockly.Block;
  getLua: (parameters: { index: any }) => (block: Blockly.Block) => [string, number];
  toolbox: {
    kind: string;
    type: string;
  };
}

const data: Data = {
  name: 'module_to_transform_data'
};

const luaGeneratorInstance = new LuaGenerator() as any;

const block: Block = {
  title: data.name,
  type: DataType.name,
  getBlock({ }): Blockly.Block {
    const block = {
      init: function () {
        this.jsonInit({
          type: data.name,
          message0: "空间数据 %1",
          args0: [
            {
              type: "input_value",
              name: "entity",
              check: "Entity"
            }
          ],
          inputsInline: false,
          output: 'Transform',
          colour: DataType.colour,
          tooltip: '',
          helpUrl: ''
        });
      }
    } as Blockly.Block;

    return block;
  },
  getLua({ index }): (block: Blockly.Block) => [string, number] {
    const lua = function (block: Blockly.Block): [string, number] {
      const value_entity = luaGeneratorInstance.valueToCode(
        block,
        'entity',
        luaGeneratorInstance.ORDER_NONE
      );

      const code = `CS.MLua.Point.ToTransformData(${value_entity})\n`;
      // TODO: Change ORDER_NONE to the correct strength.
      return [code, luaGeneratorInstance.ORDER_NONE];
    };
    return lua;
  },
  toolbox: {
    kind: 'block',
    type: data.name
  }
};

export default block;




