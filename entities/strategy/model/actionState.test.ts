import { describe, expect, it } from 'vitest'

import { actionState } from './actionState'

const strategy = {
  allowedActions: ['INJECT_CAPITAL' as const],
  blockedActions: [{ action: 'WITHDRAW_CAPITAL' as const, reasonCode: 'NO_WITHDRAWABLE_BALANCE' }],
}

describe('actionState', () => {
  it('allowedActions에 있으면 allowed', () => {
    expect(actionState(strategy, 'INJECT_CAPITAL')).toEqual({ kind: 'allowed' })
  })
  it('blockedActions에 있으면 사유와 함께 blocked', () => {
    expect(actionState(strategy, 'WITHDRAW_CAPITAL')).toEqual({ kind: 'blocked', reasonCode: 'NO_WITHDRAWABLE_BALANCE' })
  })
  it('둘 다에 없으면 hidden', () => {
    expect(actionState(strategy, 'RESET_VR')).toEqual({ kind: 'hidden' })
  })
})
