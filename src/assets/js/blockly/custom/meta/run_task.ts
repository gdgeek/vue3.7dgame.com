import * as Blockly from 'blockly';
import EventType from './type';
import { LuaGenerator } from 'blockly/lua';

const luaGeneratorInstance = new LuaGenerator() as any;

// 定义参数类型
interface Resource {
  // 根据实际需求定义 Resource 的类型
}

// 定义 BlockJson 类型
interface BlockJson {
  type: string;
  message0: string;
  args0: any[];
  previousStatement: null;
  nextStatement: null;
  colour: number;
  tooltip: string;
  helpUrl: string;
}

// 定义 Block 对象的类型
interface Block {
  title: string;
  type: string;
  colour: number;
  getBlockJson: (parameters: { resource: Resource }) => BlockJson;
  getBlock: (parameters: { resource: Resource }) => Blockly.Block;
  getLua: (parameters: { index: any }) => (block: Blockly.Block) => string;
  toolbox: {
    kind: string;
    type: string;
  };
}

// 实现 Block 对象
const data = {
  name: 'run_task'
};

const block: Block = {
  title: data.name,
  type: EventType.name,
  colour: EventType.colour,

  getBlockJson({ resource }) {
    const json: BlockJson = {
      type: data.name,
      message0: '启动任务 %1',
      args0: [
        {
          type: 'input_value',
          name: 'content',
          check: 'Task'
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: EventType.colour,
      tooltip: '',
      helpUrl: ''
    };
    return json;
  },

  getBlock(parameters) {
    const data: Blockly.Block = {
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

      const statements_content = generator.statementToCode(block, 'content');

      const execute = `_G.task.execute(${statements_content})\n`;

      return execute;
    };
    return lua;
  },

  toolbox: {
    kind: 'block',
    type: data.name
  }
};

export default block;
