function number(value) {
  return '_G.argument.number(' + value + ')'
}
function boolean(value) {
  return '_G.argument.boolean(' + value + ')'
}
function string(value) {
  return '_G.argument.string(' + value + ')'
}


function point(value) {
  return '_G.argument.point(' + value + ')'
}

function player(type, value) {
  switch (type) {
    case 'index':
      return '_G.argument.index_player(' + value + ')'
    case 'id':
      return '_G.argument.id_player(' + value + ')'
    case 'server':
      return '_G.argument.server_player()'
    case 'random_client':
      return '_G.argument.random_player()'
  }
  return '_G.argument.server_player()'
}

function anchor(key) {
  return "_G.argument.anchor('" + key + "')"
}
function range(anchor, radius) {
  return '_G.argument.range(' + anchor + ', ' + radius + ')'
}
module.exports = {
  number,
  string,
  boolean,
  range,
  anchor,
  player,
  point
}
