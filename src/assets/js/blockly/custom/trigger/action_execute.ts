import * as Blockly from 'blockly';
import EventType from './type';
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
  name: 'action_execute'
};

const block: Block = {
  title: data.name,
  type: EventType.name,
  colour: EventType.colour,
  getBlockJson({ resource }) {
    const json: BlockJson = {
      type: 'block_type',
      message0: '动作 %1 %2',
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
          type: 'input_value',
          name: 'content',
          check: 'Task'
        }
      ],
      inputsInline: true,
      colour: EventType.colour,
      tooltip: '',
      helpUrl: ''
    };
    return json;
  },
  getBlock(parameters) {
    const data = {
      init: function () {
        const json = block.getBlockJson(parameters);
        this.jsonInit(json);
      }
    } as Blockly.Block;

    return data;
  },
  getLua({ index }) {
    const lua = function (block: Blockly.Block): string {
      const generator = luaGeneratorInstance;

      const statements_content = generator.valueToCode(
        block,
        'content',
        generator.ORDER_NONE
      );

      const dropdown_option = block.getFieldValue('Action');
      const execute = '  _G.task.execute(' + statements_content + ')\n';
      const code =
        "meta['@" + dropdown_option + "'] = function(parameter) \n  " +
        execute +
        'end\n';

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
