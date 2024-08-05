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
  previousStatement: null,
  nextStatement: null,
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
  name: 'play_sound_callback'
}
const block: Block = {
  title: data.name,
  type: DataType.name,
  colour: DataType.colour,
  getBlockJson(parameters) {
    const json: BlockJson = {
      type: 'block_type',
      message0: '播放音频 %1',
      args0: [
        {
          type: 'input_value',
          name: 'sound',
          check: 'Sound'
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
      var value_sound = luaGeneratorInstance.valueToCode(
        block,
        'sound',
        luaGeneratorInstance.ORDER_NONE
      )
      /*
      var statements_callback = Blockly.Lua.statementToCode(
        block,
        'callback',
        Blockly.Lua.ORDER_NONE
      )*/

      //var checkbox_occupy = block.getFieldValue('occupy') === 'TRUE'

      // TODO: Assemble Lua into code variable.
      var code =
        'CS.MLua.Sound.Play(' +
        value_sound +
        ', )\n'
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
