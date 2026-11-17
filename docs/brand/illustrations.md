# Console illustrations brief

Every guided dialog and confirmation in the console shows a picture of what is about to happen.
Until drawn art exists, each one shows a flow diagram made of icons. This list is the brief for
the drawn versions.

## Delivering a drawing

1. Save it as `apps/console/public/illustrations/<name>.svg` (PNG/WebP at 2x also work).
2. Map it in `apps/console/src/shared/ui/illustration/illustration-art.ts`:
   `'webhook-flow': '/illustrations/webhook-flow.svg'`.

The diagram for that name is replaced everywhere it appears; nothing else changes.

## Format

- Wide and short: drawn for a 560 × 192 px area (shown up to 192 px tall, scaled down on phones).
- Transparent background. It sits on a graphite panel in dark mode (default) and on light gray
  in light mode, so it must read on both. Avoid pure black or white outlines.
- Palette: the console's graphite neutrals plus one accent, Signal Blue (`oklch(0.55 0.2 262)`).
  Red only for what is cut or lost.
- No text inside the art: captions are in the dialog, in Portuguese, and screen readers get the
  sentence below instead.
- The logo at `docs/brand/nelcota-logo.png` must not be redrawn; refer to NelcotaCloud as a
  cloud or a neutral platform shape.

## Illustrations

Each line gives the name, then the story the drawing must tell.

### API keys

- `key-any`: before a kind is chosen, an app or a server uses its key to talk to NelcotaCloud.
- `key-publishable`: the publishable key goes inside the customer's app, which uses it to sign
  users up and in at NelcotaCloud.
- `key-secret`: the secret key stays on the customer's server, which uses it to administer the
  project.
- `key-revoke`: whatever still uses the key (app or server) is cut off from NelcotaCloud at once.

### Projects

- `project-isolation`: NelcotaCloud creates a database only for this project, apart from the
  others.
- `project-site`: email links and social login bring the user back to the app's website.
- `project-connection`: the app connects to NelcotaCloud, which keeps its users in the project's
  own database.
- `project-delete`: the app loses its login at NelcotaCloud, and the project's database and users
  are erased.

### Social login

`<provider>` is `google` or `github`.

- `oauth-login-<provider>`: the user taps "Entrar com Google/GitHub" in the app, confirms at
  the provider, NelcotaCloud gets the answer and the user is back in the app, logged in.
- `oauth-remove-<provider>`: the "Entrar com …" button stops working in the app.

### Email

- `smtp-own-server`: NelcotaCloud hands each email to the customer's SMTP server, which
  delivers it to the user's inbox.
- `smtp-platform`: emails go out through NelcotaCloud's own SMTP again.

### Webhooks

- `webhook-flow`: something happens to a user in the app; NelcotaCloud sends a signed POST to
  the customer's server.
- `webhook-delete`: NelcotaCloud stops sending events to that server at once.

### Team

- `team-invite`: the person gets the invitation by email and, by accepting it in the console,
  joins the project's team.
- `team-remove`: a member loses access to the project.
- `team-leave`: you lose access to the project.
- `team-transfer`: you hand the project over and someone else becomes the owner.

### Users

- `user-ban`: the blocked user can no longer sign in to the app.
- `user-end-sessions`: the user's devices are signed out of the app; the account stays.
- `user-reset-mfa`: the authenticator app is no longer asked for; password only until MFA is
  turned on again.
- `user-delete`: the account leaves the project's database, with its social logins and sessions.

### Console account

- `account-mfa-enroll`: the phone's authenticator app shows a 6-digit code the console asks for
  at each login.
- `account-mfa-disable`: the console stops asking for the code; only the password protects the
  account.
