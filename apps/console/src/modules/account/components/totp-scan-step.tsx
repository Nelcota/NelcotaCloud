import type { TotpEnrollment } from '@nelcota/sdk'
import type { JSX } from 'react'

import { CopyableValue } from '@/shared/ui/copyable-value'
import { Button } from '@/shared/ui/primitives/button'
import { QrCode } from '@/shared/ui/qr-code'

/** The secret three ways: QR code for a phone camera, the key to type, a link on the phone itself. */
export function TotpScanStep({ enrollment }: { enrollment: TotpEnrollment }): JSX.Element {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
      <QrCode
        value={enrollment.otpauth_uri}
        label="QR code para adicionar a conta no app autenticador"
      />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-4">
        <p className="text-sm text-pretty text-muted-foreground">
          Escaneie o QR code com seu app autenticador (Google Authenticator, 1Password, Authy…).
        </p>
        <div className="w-full">
          <CopyableValue label="Sem câmera? Digite esta chave no app" value={enrollment.secret} />
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={enrollment.otpauth_uri}>Abrir no app autenticador</a>
        </Button>
      </div>
    </div>
  )
}
