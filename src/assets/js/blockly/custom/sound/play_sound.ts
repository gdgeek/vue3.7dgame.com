import DataType from './type'
import * as Blockly from 'blockly';
import { LuaGenerator, Order } from 'blockly/lua';

// 定义数据对象类型
interface Data {
  name: string;
}

// 定义参数类型
interface Parameters {
  index: string;
  resource: {
    sound: { name: string; uuid: string; paramter?: any }[];
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

const luaGeneratorInstance = new LuaGenerator();

// 定义 Block 类型
export interface Block {
  title: string;
  type: string;
  colour: number;
  getBlockJson: (parameters: Parameters) => BlockJson;
  getBlock: (parameters: Parameters) => Blockly.BlockSvg;
  getLua: (parameters: Parameters) => (block: Blockly.BlockSvg) => string;
  toolbox: {
    kind: string;
    type: string;
  };
}

const data: Data = {
  name: 'play_sound'
}

const block: Block = {
  title: data.name,
  type: DataType.name,
  colour: DataType.colour,
  getBlockJson() {
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
  
  getBlock(parameters) {
    const data = {
      init: function () {
        const json = block.getBlockJson(parameters)
        console.log("json", json)
        
        this.jsonInit(json)  //问题所在
      }
    } as Blockly.BlockSvg
    console.log("play_soundJson", data) //{}
    return data
  },

  getLua() {
    console.log("c")
    const lua = function (block: Blockly.BlockSvg) {
      const sound = luaGeneratorInstance.valueToCode(
        block,
        'sound',
        Order.NONE
      )
      console.log("测试4", sound)
      return '_G.sound.play(' + sound + ')\n'

    }
    return lua
  },
  toolbox: {
    kind: 'block',
    type: data.name
  }
}
export default block
