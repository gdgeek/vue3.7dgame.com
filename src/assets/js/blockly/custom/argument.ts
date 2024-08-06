export const number = (value: string) => {
  return '_G.argument.number(' + value + ')'
}
export const boolean = (value: string) => {
  return '_G.argument.boolean(' + value + ')'
}
export const string = (value: string) => {
  return '_G.argument.string(' + value + ')'
}


export const point = (value: string) => {
  return '_G.argument.point(' + value + ')'
}

export const player = (type: any, value: string) => {
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

export const anchor = (key: string) => {
  return "_G.argument.anchor('" + key + "')"
}
export const range = (anchor: string, radius: string) => {
  return '_G.argument.range(' + anchor + ', ' + radius + ')'
}

