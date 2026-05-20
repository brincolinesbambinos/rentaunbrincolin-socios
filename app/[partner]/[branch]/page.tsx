import { redirect } from 'next/navigation'

export default async function BranchRootPage({
  params,
  searchParams
}: {
  params: Promise<{ partner: string, branch: string }>,
  searchParams: Promise<{ sp?: string }>
}) {
  const { partner, branch } = await params
  const { sp } = await searchParams
  const spSuffix = sp === '1' ? '?sp=1' : ''
  redirect(`/${partner}/${branch}/catalogo${spSuffix}`)
}
