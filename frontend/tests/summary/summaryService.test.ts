import { describe, it, expect } from 'vitest'
import { computeSummaryFromRows } from '../../lib/services/SummaryService'

const uid = 'user-1'

// Fixture helpers
function owedRow(groupId: string, groupName: string, amount: number) {
  return {
    amount,
    expenses: {
      group_id: groupId,
      groups: { name: groupName },
    },
  }
}

function toMeRow(groupId: string, groupName: string, amount: number, paidBy: string) {
  return {
    amount,
    expenses: {
      group_id: groupId,
      groups: { name: groupName },
      paid_by: paidBy,
    },
  }
}

describe('computeSummaryFromRows', () => {
  it('builds global and per-group totals from rows', () => {
    const owedRows = [
      owedRow('g1', 'Grupo 1', 30), // debo 30 en g1
      owedRow('g2', 'Grupo 2', 20), // debo 20 en g2
    ]

    const toMeRows = [
      toMeRow('g1', 'Grupo 1', 50, uid), // me deben 50 en g1
      toMeRow('g2', 'Grupo 2', 10, uid), // me deben 10 en g2
      toMeRow('g1', 'Grupo 1', 5, 'other'), // pagado por otro -> se ignora
    ]

    const { summary } = computeSummaryFromRows(uid, owedRows as any, toMeRows as any)

    expect(summary).toMatchInlineSnapshot(`
      {
        "byGroup": [
          {
            "group_id": "g1",
            "group_name": "Grupo 1",
            "net": 20,
            "owedByMe": 30,
            "owedToMe": 50,
          },
          {
            "group_id": "g2",
            "group_name": "Grupo 2",
            "net": -10,
            "owedByMe": 20,
            "owedToMe": 10,
          },
        ],
        "net": 10,
        "owedByMe": 50,
        "owedToMe": 60,
      }
    `)
  })

  it('handles empty inputs', () => {
    const { summary } = computeSummaryFromRows(uid, [], [])
    expect(summary).toMatchInlineSnapshot(`
      {
        "byGroup": [],
        "net": 0,
        "owedByMe": 0,
        "owedToMe": 0,
      }
    `)
  })
})
