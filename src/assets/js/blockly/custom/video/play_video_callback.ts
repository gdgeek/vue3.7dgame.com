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
  name: 'play_video_callback'
}
const block: Block = {
  title: data.name,
  type: DataType.name,
  colour: DataType.colour,
  getBlockJson(parameters) {
    const json: BlockJson = {
      type: 'block_type',
      message0: '播放视频 %1 独占 %2 %3 回调 %4',
      args0: [
        {
          type: 'input_value',
          name: 'video',
          check: 'Video'
        },
        {
          type: 'field_checkbox',
          name: 'occupy',
          checked: true
        },
        {
          type: 'input_dummy'
        },
        {
          type: 'input_statement',
          name: 'callback'
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: DataType.colour,
      tooltip: '',
      helpUrl: ''
    } /*{
      type: 'block_type',
      message0: '播放视频 %1 回调 %2',
      args0: [
        {
          type: 'input_value',
          name: 'video',
          check: 'Video'
        },
        {
          type: 'input_statement',
          name: 'callback'
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: DataType.colour,
      tooltip: '',
      helpUrl: ''
    }*/
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
  getLua(parameters) {
    const lua = function (block: Blockly.Block) {
      var value_video  = luaGeneratorInstance.valueToCode(
        block,
        'video',
        luaGeneratorInstance.ORDER_NONE
      )
      var statements_callback = luaGeneratorInstance.statementToCode(
        block,
        'callback',
        luaGeneratorInstance.ORDER_NONE
      )

      var checkbox_occupy = block.getFieldValue('occupy') === 'TRUE'

      var code =
        'CS.MLua.Video.Play(' +
        value_video +
        ', ' +
        JSON.stringify(checkbox_occupy) +
        ', ' +
        JSON.stringify(statements_callback) +
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
