// import * as Blockly from 'blockly';
import * as Blockly from 'blockly';
import EventType from './type'
import { LuaGenerator, Order } from 'blockly/lua';

const luaGeneratorInstance = new LuaGenerator();

// 定义数据对象类型
interface Data {
  name: string;
}

// 定义参数类型
interface Parameters {
  resource: {
    events: {
      inputs: {
        title: string;
        uuid: string;
      }[];
    }
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
  getBlockJson: (parameters: Parameters) => BlockJson;
  getBlock: (parameters: Parameters) => Blockly.BlockSvg;
  getLua: (parameters: { index: any }) => (block: Blockly.BlockSvg) => string;
  toolbox: {
    kind: string;
    type: string;
  };
}

const data: Data = {
  name: 'input_event'
}
const block: Block = {
  title: data.name,
  type: EventType.name,
  colour: EventType.colour,
  getBlockJson({ resource }) {
    const json: BlockJson = {
      type: data.name,
      message0: '输入事件 %1 %2 %3',
      args0: [
        {
          type: 'field_dropdown',
          name: 'Event',
          options: function () {
            const input = resource.events.inputs
            let opt = [['none', '']]
            input.forEach(({ title, uuid }) => {
              opt.push([title, uuid])
            })
            return opt
          }
        },
        {
          type: 'input_dummy'
        },
        {
          type: 'input_statement',
          name: 'content'
        }
      ],
      colour: EventType.colour,
      tooltip: '',
      helpUrl: ''
    }
    return json
  },
  getBlock(parameters) {
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
      var dropdown_option = block.getFieldValue('Event')
      var statements_content = luaGeneratorInstance.statementToCode(block, 'content')
      // TODO: Assemble Lua into code variable.
      var code = '..'

      var code =
        "meta['#" + dropdown_option + "'] = function(parameter) \n\
  is_playing = true\n\
  print('" +
        dropdown_option +
        "')\n" +
        statements_content +
        '  is_playing = false\n\
end\n'

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
