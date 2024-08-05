import * as Blockly from 'blockly';
import TriggerType from './type'
import "blockly/lua"
import { LuaGenerator } from 'blockly/lua';
const luaGeneratorInstance = new LuaGenerator() as any;

interface Data {
  name: string;
}

// 定义参数类型
interface Parameters {
  action: { name: string; uuid: string }[];
}

interface BlockParameters {
  resource: Parameters;
}

// 定义 BlockJson 类型
interface BlockJson {
  type: string;
  message0: string;
  args0: any[];
  colour: number;
  tooltip: string;
  helpUrl: string;
}

// 定义 Block 对象的类型
interface Block {
  title: string;
  type: string;
  colour: number;
  // getBlockJson: (parameters: BlockParameters) => BlockJson;
  getBlock: (parameters: BlockParameters) => Blockly.Block;
  getLua: (parameters: BlockParameters) => (block: Blockly.Block) => string;
  toolbox: {
    kind: string;
    type: string;
  };
}

const data: Data = {
  name: 'init_trigger'
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
          message0: '销毁 %1 %2',
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
        "meta['@init'] = function() \n\
    print('@init')\n" +
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
