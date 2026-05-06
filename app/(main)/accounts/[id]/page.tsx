interface Props {
  params: Promise<{ id: string }>
}

export default async function AccountDetailPage({ params }: Props) {
  const { id } = await params
  return (
    <main>
      <h1>계좌 상세 ({id})</h1>
    </main>
  )
}
