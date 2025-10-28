// Tipos para manos de poker y puntuación

export type PokerHandType =
  | 'high_card'
  | 'pair'
  | 'two_pair'
  | 'three_of_a_kind'
  | 'straight'
  | 'flush'
  | 'full_house'
  | 'four_of_a_kind'
  | 'straight_flush'
  | 'royal_flush'

export interface PokerHand {
  type: PokerHandType
  name: string            // Nombre en español
  chips: number           // Puntos base (fichas)
  multiplier: number      // Multiplicador base
}

export interface HandScore {
  handType: PokerHandType
  chips: number           // Total de fichas (base + mejoras)
  multiplier: number      // Total multiplicador (base + mejoras)
  score: number           // Puntuación final = chips * multiplier
}

// Configuración base de manos de poker (valores de Balatro)
export const POKER_HANDS: Record<PokerHandType, PokerHand> = {
  high_card: {
    type: 'high_card',
    name: 'Carta Alta',
    chips: 5,
    multiplier: 1
  },
  pair: {
    type: 'pair',
    name: 'Pareja',
    chips: 10,
    multiplier: 2
  },
  two_pair: {
    type: 'two_pair',
    name: 'Doble Pareja',
    chips: 20,
    multiplier: 2
  },
  three_of_a_kind: {
    type: 'three_of_a_kind',
    name: 'Trío',
    chips: 30,
    multiplier: 3
  },
  straight: {
    type: 'straight',
    name: 'Escalera',
    chips: 30,
    multiplier: 4
  },
  flush: {
    type: 'flush',
    name: 'Color',
    chips: 35,
    multiplier: 4
  },
  full_house: {
    type: 'full_house',
    name: 'Full',
    chips: 40,
    multiplier: 4
  },
  four_of_a_kind: {
    type: 'four_of_a_kind',
    name: 'Poker',
    chips: 60,
    multiplier: 7
  },
  straight_flush: {
    type: 'straight_flush',
    name: 'Escalera de Color',
    chips: 100,
    multiplier: 8
  },
  royal_flush: {
    type: 'royal_flush',
    name: 'Escalera Real',
    chips: 100,
    multiplier: 8
  }
}

// Orden de jerarquía de manos (para comparación)
export const HAND_HIERARCHY: PokerHandType[] = [
  'high_card',
  'pair',
  'two_pair',
  'three_of_a_kind',
  'straight',
  'flush',
  'full_house',
  'four_of_a_kind',
  'straight_flush',
  'royal_flush'
]
