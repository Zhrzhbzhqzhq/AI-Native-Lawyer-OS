import type { DocumentCaseUnderstanding } from './document_context_builder'

export type DocumentParties = {
  plaintiff: string
  defendant: string
}

const NON_PARTY_ROLE = /工作人员|参与人员|经办人|联系人|代理人|律师/
const PLAINTIFF_ROLE = /原告|申请人|上诉人|起诉方|主张方/
const DEFENDANT_ROLE = /被告|被申请人|被上诉人|相对方|义务方/
const PLAINTIFF_POSITION = /要求.{0,20}(?:支付|给付|返还|赔偿)|主张.{0,24}(?:支付|给付|返还|赔偿|履行)|已(?:发送|发出).{0,12}(?:催收|催款)|启动.{0,8}(?:诉讼|纠纷)/
const DEFENDANT_POSITION = /拒绝.{0,12}(?:支付|给付|返还|赔偿)|拒付|暂缓.{0,12}支付|未(?:同意|履行).{0,12}支付|欠付|拖欠/

export function projectDocumentParties(understanding: DocumentCaseUnderstanding | null): DocumentParties {
  const actors = (understanding?.actors || []).filter((actor) => (
    actor.name.trim().length > 0 && !NON_PARTY_ROLE.test(actor.role)
  ))
  const plaintiff = actors.find((actor) => PLAINTIFF_ROLE.test(actor.role))
    || actors.find((actor) => PLAINTIFF_POSITION.test(actor.position))
  const defendant = actors.find((actor) => DEFENDANT_ROLE.test(actor.role))
    || actors.find((actor) => actor.id !== plaintiff?.id && DEFENDANT_POSITION.test(actor.position))

  return {
    plaintiff: plaintiff?.name.trim() || '',
    defendant: defendant?.name.trim() || '',
  }
}

export default projectDocumentParties
