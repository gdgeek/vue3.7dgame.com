import * as Blockly from 'blockly';
import DataType from './type'
// import Helper from '../helper'
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
  // inputsInline: boolean;
  previousStatement: any;
  nextStatement: any;
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
  };
}

const data: Data = {
  name: 'entity_explode'
}
const block: Block = {
  title: data.name,
  type: DataType.name,
  colour: DataType.colour,
  getBlockJson({ resource }) {
    const json: BlockJson = {
      type: 'block_type',
      message0: '实体 %1 爆炸展开 间距 %2',
      args0: [
        {
          type: 'input_value',
          name: 'entity',
          check: 'Entity'
        },
        {
          type: 'field_number',
          name: 'distance',
          value: '0.1'
        }
      ],
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
  getLua({ index }) {
    const lua = function (block: Blockly.Block) {
      var number_distance = block.getFieldValue('distance')
      var value_entity = luaGeneratorInstance.valueToCode(
        block,
        'entity',
        luaGeneratorInstance.ORDER_NONE
      )

      var code =
        'CS.MLua.Point.Explode(' + value_entity + ', ' + number_distance + ')\n'
      return code
    }
    return lua
  },
  toolbox: {
    kind: 'block',
    type: data.name
  }
}
export default block
