export const AUTOMATIC_MASCOT = 0

// Saved IDs are one-based positions in the sprite atlas.
export const PROJECT_MASCOTS = [
  'Trevo violeta',
  'Losango azul',
  'Almofada laranja',
  'Seixo verde',
  'Arco coral',
  'Cubo azul',
  'Nuvem amarela',
  'Estrela rosa',
  'Triângulo lilás',
  'Feijão turquesa',
  'Hexágono vermelho',
  'Coração verde-lima',
  'Gota roxa',
  'Cápsula azul',
  'Octógono laranja',
  'Sino verde',
  'Morango vermelho',
  'Lua dourada',
  'Planeta lilás',
  'Cacto verde',
  'Flor azul',
  'Chama laranja',
  'Cogumelo roxo',
  'Polvo verde-menta',
  'Raio violeta',
  'Pato amarelo',
  'Escudo carmim',
  'Gota azul',
  'Trevo laranja',
  'Losango lilás',
  'Estrela turquesa',
  'Feijão coral',
] as const

export function projectMascotSelection(mascotId: number | undefined): number {
  if (mascotId === undefined || Number.isInteger(mascotId) === false) {
    return AUTOMATIC_MASCOT
  }

  if (mascotId < 1 || mascotId > PROJECT_MASCOTS.length) {
    return AUTOMATIC_MASCOT
  }

  return mascotId
}
