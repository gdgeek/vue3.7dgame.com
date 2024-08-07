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
  inputsInline: boolean;
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
  name: 'function_execute'
}
const block: Block = {
  title: data.name,
  type: DataType.name,
  colour: DataType.colour,
  getBlockJson(parameters) {
    const json: BlockJson = {
      type: data.name,
      message0: '执行 %1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'function',
          options: [
            ['redo', 'CS.MLua.Helper.Redo()'],
            ['undo', 'CS.MLua.Helper.Undo()'],
            ['boom_reset', 'CS.MLua.Helper.BoomReset(target)'],
            ['sample_reset', 'CS.MLua.Helpern.SampleReset(target)']
          ]
        }
      ],
      inputsInline: false,
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
      var dropdown_function = block.getFieldValue('function')
      // TODO: Assemble Lua into code variable.
      var code = dropdown_function + '\n'
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
