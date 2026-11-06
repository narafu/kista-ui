import { notFound } from 'next/navigation'
import { PageHeader } from '@widgets/page-header'
import { canWithdrawCapital, findStrategy } from '@entities/strategy'
import { WithdrawCapitalForm } from '@features/strategy/withdraw-capital'
import { listAccounts } from '@entities/account'
import { brokerCurrency } from '@shared/lib/api-schema'
import { requirePageToken } from '@shared/lib/auth/token'
import type { DismissMode } from '@shared/lib/dismiss'

interface Props {
  params: Promise<{ id: string; sid: string }>
  // 'push'(기본): 일반 페이지 라우트. 'back': 인터셉팅 라우트(@modal)
  dismiss?: DismissMode
}

export async function WithdrawCapitalFormBody({ params, dismiss }: Props) {
  const { params: { id, sid }, token } = await requirePageToken(params)

  // 입력 단위·자릿수가 계좌 통화를 따른다(주식 USD, 업비트 KRW, 바이낸스 USDT)
  const [strategy, accounts] = await Promise.all([findStrategy(id, sid, token), listAccounts(token)])
  const account = accounts.find((a) => a.id === id)
  if (!strategy || !account || !canWithdrawCapital(strategy)) {
    return notFound()
  }

  return (
    <>
      <PageHeader eyebrow={strategy.ticker} eyebrowHref={`/accounts/${id}/strategies/${sid}`} title="투자금 인출" description="진행 중인 사이클에서 예수금을 인출" />
      <WithdrawCapitalForm accountId={id} strategy={strategy} currency={brokerCurrency(account.broker)} dismiss={dismiss} />
    </>
  )
}
