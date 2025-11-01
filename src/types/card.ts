// Tipos para el sistema de cartas

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

export interface Card {
  id: string          // Identificador único
  suit: Suit          // Palo
  rank: Rank          // Valor
  selected: boolean   // Si está seleccionada por el jugador
  // Mejoras (para fases posteriores)
  bonus?: number      // Puntos bonus
  multiplier?: number // Multiplicador
  enhancement?: 'bonus' | 'mult' | 'wild' | 'glass' | 'steel' | 'stone' | 'gold' | 'lucky'
  edition?: 'foil' | 'holographic' | 'polychrome' // Edición visual
}

export interface Deck {
  cards: Card[]
}

// Nombres de palos en español
export const SUIT_NAMES: Record<Suit, string> = {
  hearts: 'Corazones',
  diamonds: 'Diamantes',
  clubs: 'Tréboles',
  spades: 'Picas'
}

// Símbolos de palos
export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠'
}

// Colores de palos
export const SUIT_COLORS: Record<Suit, 'red' | 'black'> = {
  hearts: 'red',
  diamonds: 'red',
  clubs: 'black',
  spades: 'black'
}

// Valores numéricos de las cartas para ordenamiento
export const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14
}

export const ALL_RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
export const ALL_SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
