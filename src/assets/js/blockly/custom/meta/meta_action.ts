import * as Blockly from 'blockly';
import TriggerType from './type';
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
  getBlockJson: (parameters: BlockParameters) => BlockJson;
  getBlock: (parameters: BlockParameters) => Blockly.Block;
  getLua: (parameters: BlockParameters) => (block: Blockly.Block) => string;
  toolbox: {
    kind: string;
    type: string;
  };
}

// 实现 Block 对象
const data: Data = {
  name: 'meta_action'
};

const block: Block = {
  title: data.name,
  type: TriggerType.name,
  colour: TriggerType.colour,

  getBlockJson({ resource }) {
    const json: BlockJson = {
      type: data.name,
      message0: '动作 %1 %2 %3',
      args0: [
        {
          type: 'field_dropdown',
          name: 'Action',
          options: function () {
            const action = resource.action;
            let opt: [string, string][] = [['none', '']];
            action.forEach(({ name, uuid }) => {
              opt.push([name, uuid]);
            });
            return opt;
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
      colour: TriggerType.colour,
      tooltip: '',
      helpUrl: ''
    };
    return json;
  },

  getBlock(parameters: BlockParameters): Blockly.Block {
    const data: Blockly.Block = {
      init: function () {
        const json = block.getBlockJson(parameters);
        this.jsonInit(json);
      }
    } as Blockly.Block;
    return data;
  },

  getLua(parameters: BlockParameters) {
    const lua = function (block: Blockly.Block): string {
      const dropdown_option = block.getFieldValue('Action');
      const statements_content = luaGeneratorInstance.statementToCode(block, 'content');

      const code =
        `meta['@${dropdown_option}'] = function(parameter) \n\
  is_playing = true\n\
  print('${dropdown_option}')\n\
${statements_content}\n\
  is_playing = false\n\
end\n`;

      return code;
    };
    return lua;
  },

  toolbox: {
    kind: 'block',
    type: data.name
  }
};

export default block;
