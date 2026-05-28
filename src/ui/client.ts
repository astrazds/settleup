import { clientActionsScript } from './client-actions'
import { clientBootstrapScript } from './client-bootstrap'
import { clientDraftMoneyScript } from './client-draft-money'
import { clientEventPagePolicyScript } from './client-event-page-policy'
import { clientHttpScript } from './client-http'
import { clientRenderScript } from './client-render'
import { clientTemplateScript } from './client-templates'

const clientSections = [
  clientBootstrapScript,
  clientTemplateScript,
  clientEventPagePolicyScript,
  clientRenderScript,
  clientActionsScript,
  clientDraftMoneyScript,
  clientHttpScript
] as const satisfies readonly string[]

export const clientScript = `${clientSections.join('\n\n')}\n`
