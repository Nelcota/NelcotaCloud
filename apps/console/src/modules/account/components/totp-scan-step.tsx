import type { TotpEnrollment } from '@nelcota/sdk'
import type { JSX } from 'react'

import { buttonVariants } from '@/shared/ui/button-variants'
import { CopyableValue } from '@/shared/ui/copyable-value'
import { QrCode } from '@/shared/ui/qr-code'

/** The secret three ways: QR code for a phone camera, the key to type, a link on the phone itself. */
export function TotpScanStep({ enrollment }: { enrollment: TotpEnrollment }): JSX.Element {
  return (
    <>
      <p className="text-muted-foreground text-sm text-pretty">
        Escaneie o QR code com seu app autenticador (Google Authenticator, 1Password, Authy…).
      </p>
      <QrCode
        value={enrollment.otpauth_uri}
        label="QR code para adicionar a conta no app autenticador"
      />
      <CopyableValue label="Sem câmera? Digite esta chave no app" value={enrollment.secret} />
      <a
        href={enrollment.otpauth_uri}
        className={buttonVariants({ variant: 'outline', size: 'sm', className: 'w-fit' })}
      >
        Abrir no app autenticador
      </a>
    </>
  )
}
