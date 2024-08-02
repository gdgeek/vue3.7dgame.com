import Blockly from 'blockly';
import DataType from './type';

// 定义数据类型
interface BlockData {
  name: string;
}

// 定义 Block 类型
interface BlockType {
  title: string;
  type: string;
  getBlock: (args: any) => Blockly.Block;
  getLua: (args: { index?: number }) => (block: Blockly.Block) => [string, number];
  toolbox: {
    kind: string;
    type: string;
  };
}

const data: BlockData = {
  name: 'module_to_transform_data'
};

const block: BlockType = {
  title: data.name,
  type: DataType.name,
  getBlock({ }) {
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
    } as Blockly.Block; // 强制转换为 Blockly.Block 类型
    return block;
  },
  getLua({ index }) {
    const lua = function (block: Blockly.Block): [string, number] {
      const value_entity = Blockly.Lua.valueToCode(
        block,
        'entity',
        Blockly.Lua.ORDER_NONE
      );
      const code = `CS.MLua.Point.ToTransformData(${value_entity})\n`;
      // TODO: 根据需要调整 ORDER_NONE
      return [code, Blockly.Lua.ORDER_NONE];
    };
    return lua;
  },
  toolbox: {
    kind: 'block',
    type: data.name
  }
};

export default block;
