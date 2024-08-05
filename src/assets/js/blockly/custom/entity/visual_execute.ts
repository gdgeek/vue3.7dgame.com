import DataType from './type'

import * as Blockly from 'blockly';
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
  };
}

const data: Data = {
  name: 'visual_execute'
}
const block: Block = {
  title: data.name,
  type: DataType.name,
  colour: DataType.colour,
  getBlockJson({ }) {
    const json: BlockJson = {
      type: 'block_type',
      message0: '实体 %1 显示/隐藏 %2 %3',
      args0: [
        {
          type: 'input_value',
          name: 'entity',
          check: ['Entity', 'Polygen', 'Picture', 'Video', 'Text']
        },
        {
          type: 'input_dummy'
        },
        {
          type: 'input_value',
          name: 'bool',
          check: 'Boolean'
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
    } as Blockly.Block;
    return data
  },
  getLua({ }) {
    const lua = function (block: Blockly.Block) {
      var value_entity = luaGeneratorInstance.valueToCode(
        block,
        'entity',
        luaGeneratorInstance.ORDER_NONE
      )
      var value_bool = luaGeneratorInstance.valueToCode(
        block,
        'bool',
        luaGeneratorInstance.ORDER_ATOMIC
      )
      // TODO: Assemble Lua into code variable.
      var code =
        '_G.point.set_visual(' + value_entity + ', ' + value_bool + ')\n'
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
