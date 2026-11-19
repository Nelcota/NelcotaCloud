import type { SmtpDraft } from '@/modules/project-settings/smtp/model/smtp-draft'

/** What every step of the SMTP dialog takes: the draft and how to change it. */
export type SmtpStepProps = {
  draft: SmtpDraft
  onChange: (draft: SmtpDraft) => void
}
