import { redirect } from 'next/navigation'

export default async function BranchRootPage({ 
  params 
}: { 
  params: Promise<{ partner: string, branch: string }> 
}) {
  const { partner, branch } = await params
  redirect(`/${partner}/${branch}/catalogo`)
}
