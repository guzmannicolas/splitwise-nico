import { EqualSplitStrategy } from './EqualSplitStrategy'
import { FullSplitStrategy } from './FullSplitStrategy'
import { CustomSplitStrategy } from './CustomSplitStrategy'
import type { SplitRegistry } from './types'
import type { SplitType } from '../types'

const registry: SplitRegistry = {
  equal: new EqualSplitStrategy(),
  full: new FullSplitStrategy(),
  custom: new CustomSplitStrategy()
}

export function getSplitStrategy(type: SplitType) {
  const strategy = registry[type]
  if (!strategy) throw new Error(`Split strategy not found: ${type}`)
  return strategy
}

export { registry }
