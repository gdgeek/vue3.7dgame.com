// 定义函数参数的类型
export const handler = (uuid: string): string => `_G.helper.handler(index, '${uuid}')`;

export const input_event = (uuid: string): string => `_G.helper.input_event(index, '${uuid}')`;

export const output_event = (uuid: string): string => `_G.helper.output_event(index, '${uuid}')`;

// 导出函数
// export {
//   handler,
//   input_event,
//   output_event
// };
