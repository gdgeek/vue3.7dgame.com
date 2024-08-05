import * as Blockly from 'blockly';
import TriggerType from './type'
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
  colour: number;
  tooltip: string;
  helpUrl: string;
}

// 定义 Block 类型
interface Block {
  title: string;
  type: string;
  colour: number;
  // getBlockJson: (parameters: Parameters) => BlockJson;
  getBlock: (parameters: Parameters) => Blockly.Block;
  getLua: (parameters: { index: any }) => (block: Blockly.Block) => string;
  toolbox: {
    kind: string;
    type: string;
  };
}

const data: Data = {
  name: 'update_trigger'
}
const block: Block = {
  title: data.name,
  type: TriggerType.name,
  colour: TriggerType.colour,
  getBlock(parameters) {
    const block = {
      init: function () {
        this.jsonInit({
          type: data.name,
          message0: '更新 %1 %2',
          args0: [
            {
              type: 'input_dummy'
            },
            {
              type: 'input_statement',
              name: 'content'
            }
          ],
          colour: TriggerType.colour,
          tooltip: '',
          helpUrl: ''
        })
      }
    } as Blockly.Block
    return block
  },
  getLua({ }) {
    const lua = function (block: Blockly.Block) {
      var statements_content = luaGeneratorInstance.statementToCode(block, 'content')
      // TODO: Assemble Lua into code variable.
      var code =
        "meta['@update'] = function(interval) \n\
  print('@update')\n" +
        statements_content +
        'end\n'
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
