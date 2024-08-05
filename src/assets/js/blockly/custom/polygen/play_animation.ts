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
  name: 'play_animation'
}
const block: Block = {
  title: data.name,
  type: DataType.name,
  colour: DataType.colour,
  getBlockJson(parameters) {
    const json: BlockJson = {
      type: 'block_type',
      message0: '播放模型动画 %1 %2',
      args0: [
        {
          type: 'field_input',
          name: 'animation',
          text: 'idle'
        },
        {
          type: 'input_value',
          name: 'polygen',
          check: 'Polygen'
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
  getLua(parameters) {
    const lua = function (block: Blockly.Block) {
      var text_animation = block.getFieldValue('animation')
      var value_polygen = luaGeneratorInstance.valueToCode(
        block,
        'polygen',
        luaGeneratorInstance.ORDER_NONE
      )
      // TODO: Assemble Lua into code variable.
      var code =
        '_G.polygen.play_animation(' +
        value_polygen +
        ',' +
        JSON.stringify(text_animation) +
        ')\n'
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
