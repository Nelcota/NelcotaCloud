import type { JSX } from 'react'

import { SiteUrl } from '@/modules/overview/components/site-url'
import { useSettingsQuery } from '@/modules/project-settings/queries/use-project-settings'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { PageHeader } from '@/shared/ui/page-header'

export function OverviewHeader({ projectId }: { projectId: string }): JSX.Element {
  const settings = useSettingsQuery(projectId)

  return (
    <>
      <PageHeader title="Visão geral" description={<SiteUrl url={settings.data?.site_url} />} />
      <ErrorAlert error={settings.error} />
    </>
  )
}
