declare namespace Blockly {
  namespace Lua {
    function valueToCode(block: Block, name: string, order: number): string;
    const ORDER_NONE: number;
  }
}
