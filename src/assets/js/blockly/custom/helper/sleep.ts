import * as Blockly from 'blockly';
import DataType from './type'
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
  inputsInline: boolean;
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
  name: 'sleep'
}
const block: Block = {
  title: data.name,
  type: DataType.name,
  colour: DataType.colour,
  getBlockJson() {
    const json: BlockJson = {
      type: data.name,
      message0: '休眠 %1 秒',
      args0: [
        {
          type: 'field_number',
          name: 'time',
          value: 0.3,
          min: 0,
          max: 1000
        }
      ],
      inputsInline: true,
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
  getLua({ }) {
    const lua = function (block: Blockly.Block) {
      var time = block.getFieldValue('time')
      return '_G.helper.sync_sleep(' + time + ')\n'
    }
    return lua
  },
  toolbox: {
    kind: 'block',
    type: data.name
  }
}
export default block
