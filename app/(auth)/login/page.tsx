import { Suspense } from 'react'
import { getMetaBundle } from '@entities/meta'
import { LoginPageContent } from './LoginPageContent'

// (auth) 그룹엔 MetaProvider가 없어 서버에서 meta를 받아 넘긴다. 조회 실패는 승인 안내를 숨긴다(필요하다고 단정하지 않는다)
export default async function LoginPage() {
  const approvalRequired = await getMetaBundle().then((meta) => meta.approvalRequired, () => false)
  return (
    <Suspense>
      <LoginPageContent approvalRequired={approvalRequired} />
    </Suspense>
  )
}
