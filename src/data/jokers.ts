// Catálogo de Jokers disponibles en el juego

import type { Joker } from '../types/joker'

/**
 * Colección de Jokers básicos
 */
export const JOKERS_CATALOG: Joker[] = [
  // ========== JOKERS COMUNES ==========
  {
    id: 'joker_jolly',
    name: 'Jolly Joker',
    description: '+4 Mult',
    rarity: 'common',
    effects: [
      { type: 'mult_flat', value: 4 }
    ],
    cost: 3,
    sellValue: 1,
    emoji: '🃏',
    color: '#ff6b6b'
  },
  {
    id: 'joker_greedy',
    name: 'Joker Codicioso',
    description: '+3 Mult por cada carta de diamantes jugada',
    rarity: 'common',
    effects: [
      { 
        type: 'mult_per_card',
        value: 3,
        condition: { type: 'suit', stringValue: 'diamonds' },
        target: 'played'
      }
    ],
    cost: 4,
    sellValue: 2,
    emoji: '💎',
    color: '#e74c3c'
  },
  {
    id: 'joker_lusty',
    name: 'Joker Lujurioso',
    description: '+3 Mult por cada carta de corazones jugada',
    rarity: 'common',
    effects: [
      { 
        type: 'mult_per_card',
        value: 3,
        condition: { type: 'suit', stringValue: 'hearts' },
        target: 'played'
      }
    ],
    cost: 4,
    sellValue: 2,
    emoji: '❤️',
    color: '#e74c3c'
  },
  {
    id: 'joker_wrathful',
    name: 'Joker Colérico',
    description: '+3 Mult por cada carta de picas jugada',
    rarity: 'common',
    effects: [
      { 
        type: 'mult_per_card',
        value: 3,
        condition: { type: 'suit', stringValue: 'spades' },
        target: 'played'
      }
    ],
    cost: 4,
    sellValue: 2,
    emoji: '♠️',
    color: '#2c3e50'
  },
  {
    id: 'joker_gluttonous',
    name: 'Joker Glotón',
    description: '+3 Mult por cada carta de tréboles jugada',
    rarity: 'common',
    effects: [
      { 
        type: 'mult_per_card',
        value: 3,
        condition: { type: 'suit', stringValue: 'clubs' },
        target: 'played'
      }
    ],
    cost: 4,
    sellValue: 2,
    emoji: '♣️',
    color: '#27ae60'
  },

  // ========== JOKERS POCO COMUNES ==========
  {
    id: 'joker_sly',
    name: 'Joker Astuto',
    description: '+50 Chips por cada pareja jugada',
    rarity: 'uncommon',
    effects: [
      {
        type: 'chips_conditional',
        value: 50,
        condition: { type: 'hand_type', handType: 'pair' }
      }
    ],
    cost: 5,
    sellValue: 2,
    emoji: '🦊',
    color: '#f39c12'
  },
  {
    id: 'joker_crazy',
    name: 'Joker Loco',
    description: '+12 Mult si la mano contiene una Escalera',
    rarity: 'uncommon',
    effects: [
      {
        type: 'mult_conditional',
        value: 12,
        condition: { type: 'hand_type', handType: 'straight' }
      }
    ],
    cost: 5,
    sellValue: 2,
    emoji: '🤪',
    color: '#9b59b6'
  },
  {
    id: 'joker_droll',
    name: 'Joker Gracioso',
    description: '+10 Mult si la mano contiene un Trío',
    rarity: 'uncommon',
    effects: [
      {
        type: 'mult_conditional',
        value: 10,
        condition: { type: 'hand_type', handType: 'three_of_a_kind' }
      }
    ],
    cost: 5,
    sellValue: 2,
    emoji: '🎭',
    color: '#3498db'
  },
  {
    id: 'joker_half',
    name: 'Medio Joker',
    description: '+20 Mult si juegas 3 cartas o menos',
    rarity: 'uncommon',
    effects: [
      {
        type: 'mult_conditional',
        value: 20,
        condition: { type: 'played_cards', numberValue: 3, operator: '<=' }
      }
    ],
    cost: 5,
    sellValue: 2,
    emoji: '🎪',
    color: '#e67e22'
  },

  // ========== JOKERS RAROS ==========
  {
    id: 'joker_mystic',
    name: 'Joker Místico',
    description: '+15 Mult cuando jugues un Color',
    rarity: 'rare',
    effects: [
      {
        type: 'mult_conditional',
        value: 15,
        condition: { type: 'hand_type', handType: 'flush' }
      }
    ],
    cost: 8,
    sellValue: 4,
    emoji: '🔮',
    color: '#8e44ad'
  },
  {
    id: 'joker_banner',
    name: 'Estandarte',
    description: '+30 Chips por cada descarte restante',
    rarity: 'rare',
    effects: [
      {
        type: 'chips_conditional',
        value: 30,
        condition: { type: 'remaining_cards', numberValue: 1, operator: '>=' }
      }
    ],
    cost: 8,
    sellValue: 4,
    emoji: '🚩',
    color: '#c0392b'
  },
  {
    id: 'joker_scary',
    name: 'Joker Aterrador',
    description: '+2 Mult por cada carta de figura (J, Q, K) jugada',
    rarity: 'rare',
    effects: [
      {
        type: 'mult_per_card',
        value: 2,
        condition: { type: 'rank', stringValue: 'face' },
        target: 'played'
      }
    ],
    cost: 8,
    sellValue: 4,
    emoji: '👻',
    color: '#34495e'
  },

  // ========== JOKERS LEGENDARIOS ==========
  {
    id: 'joker_blueprint',
    name: 'Plano',
    description: 'Copia el efecto del Joker a su derecha',
    rarity: 'legendary',
    effects: [
      {
        type: 'special',
        value: 0
      }
    ],
    cost: 12,
    sellValue: 6,
    emoji: '📋',
    color: '#3498db'
  },
  {
    id: 'joker_brainstorm',
    name: 'Tormenta Mental',
    description: 'Copia el efecto del Joker más a la izquierda',
    rarity: 'legendary',
    effects: [
      {
        type: 'special',
        value: 0
      }
    ],
    cost: 12,
    sellValue: 6,
    emoji: '🧠',
    color: '#e91e63'
  }
]

/**
 * Obtener Joker por ID
 */
export function getJokerById(id: string): Joker | undefined {
  return JOKERS_CATALOG.find(j => j.id === id)
}

/**
 * Obtener Jokers por rareza
 */
export function getJokersByRarity(rarity: Joker['rarity']): Joker[] {
  return JOKERS_CATALOG.filter(j => j.rarity === rarity)
}

/**
 * Obtener Joker aleatorio
 */
export function getRandomJoker(rarityWeights?: Record<string, number>): Joker {
  const weights = rarityWeights || {
    common: 0.6,
    uncommon: 0.3,
    rare: 0.08,
    legendary: 0.02
  }
  
  const rand = Math.random()
  let rarity: Joker['rarity']
  
  if (rand < weights.common) {
    rarity = 'common'
  } else if (rand < weights.common + weights.uncommon) {
    rarity = 'uncommon'
  } else if (rand < weights.common + weights.uncommon + weights.rare) {
    rarity = 'rare'
  } else {
    rarity = 'legendary'
  }
  
  const jokersOfRarity = getJokersByRarity(rarity)
  return jokersOfRarity[Math.floor(Math.random() * jokersOfRarity.length)]
}
