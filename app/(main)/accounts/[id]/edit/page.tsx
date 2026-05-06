interface Props {
  params: Promise<{ id: string }>
}

export default async function AccountEditPage({ params }: Props) {
  const { id } = await params
  return (
    <main>
      <h1>계좌 수정 ({id})</h1>
    </main>
  )
}
