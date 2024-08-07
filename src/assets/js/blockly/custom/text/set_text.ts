import DataType from './type'
import * as Blockly from 'blockly';
import { LuaGenerator, Order } from 'blockly/lua';

const luaGeneratorInstance = new LuaGenerator();

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
  getBlock: (parameters: Parameters) => Blockly.BlockSvg;
  getLua: (parameters: { index: any }) => (block: Blockly.BlockSvg) => string;
  toolbox: {
    kind: string;
    type: string;
  };
}
const data: Data = {
  name: 'set_text'
}
const block: Block = {
  title: data.name,
  type: DataType.name,
  colour: DataType.colour,
  getBlockJson(parameters) {
    const json: BlockJson = {
      type: 'block_type',
      message0: '文本 %1 设置为 %2',
      args0: [
        {
          type: 'input_value',
          name: 'text',
          check: 'Text'
        },
        {
          type: 'field_input',
          name: 'value',
          text: 'default'
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
    } as Blockly.BlockSvg
    return data
  },
  getLua(parameters) {
    const lua = function (block: Blockly.BlockSvg) {
      var value = block.getFieldValue('value')
      var text = luaGeneratorInstance.valueToCode(block, 'text', Order.NONE)
      // TODO: Assemble Lua into code variable.
      var code =
        '_G.text.set_text(' + text + ',' + JSON.stringify(value) + ')\n'
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
