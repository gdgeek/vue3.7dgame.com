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
  name: 'play_video'
}

const block: Block = {
  title: data.name,
  type: DataType.name,
  colour: DataType.colour,
  getBlockJson(parameters) {
    const json: BlockJson = {
      type: 'block_type',
      message0: '播放视频 %1 同步 %2 独占 %3',
      args0: [
        {
          type: 'input_value',
          name: 'video',
          check: 'Video'
        },
        {
          type: 'field_checkbox',
          name: 'sync',
          checked: true
        },
        {
          type: 'field_checkbox',
          name: 'occupy',
          checked: true
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
      var video = luaGeneratorInstance.valueToCode(
        block,
        'video',
        luaGeneratorInstance.ORDER_NONE
      )
      var sync = block.getFieldValue('sync') === 'TRUE'
      var occupy = block.getFieldValue('occupy') === 'TRUE'

      var parameter = video + ', ' + JSON.stringify(occupy)

      if (sync) {
        return '_G.video.sync_play(' + parameter + ')\n'
      } else {
        return '_G.video.play(' + parameter + ')\n'
      }
    }
    return lua
  },
  toolbox: {
    kind: 'block',
    type: data.name
  }
}
export default block
