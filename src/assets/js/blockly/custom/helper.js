function handler(uuid) {
  return "_G.helper.handler(index, '" + uuid + "')"
}
function input_event(uuid) {
  return "_G.helper.input_event(index, '" + uuid + "')"
}
function output_event(uuid) {
  return "_G.helper.output_event(index, '" + uuid + "')"
}

module.exports = {
  handler,
  input_event,
  output_event
}
