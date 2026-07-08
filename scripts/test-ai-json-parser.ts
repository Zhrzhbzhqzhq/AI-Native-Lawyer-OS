import parseAIJson from '../apps/backend/src/services/ai/AIJsonParser'

function runCase(name: string, input: unknown) {
    console.log('CASE:', name)
    const res = parseAIJson(input)
    console.log('ok:', res.ok)
    if (res.ok) {
        console.log('type:', Array.isArray(res.data) ? 'array' : typeof res.data)
        if (Array.isArray(res.data)) console.log('length:', res.data.length)
        console.log('sample:', JSON.stringify(Array.isArray(res.data) ? res.data.slice(0, 2) : res.data, null, 2))
    } else {
        console.log('error:', res.error)
        console.log('raw:', JSON.stringify((res as any).raw).slice(0, 200))
    }
    console.log('---')
}

const fence = '```json\n'
const docArray = [
    {
        type: '起诉状',
        content: '民事起诉状\n\n原告：张三\n被告：李四\n事实与理由：\n1. 原告与被告签订合同。\n2. 对方违约。\n最近资金紧张，过段时间还'
    },
    {
        type: '证据清单',
        content: '证据清单\n\n证据一：合同文本\n证据二：转账凭证'
    }
]

const docMarkdown = '\n\n' + fence + JSON.stringify(docArray, null, 2) + '\n```\n\n'

const docRaw = JSON.stringify(docArray, null, 2).replace(/\\n/g, '\n')

const docEscaped = JSON.stringify([
    { type: '起诉状', content: '标题：起诉状\n说明：当事人说："最近资金紧张，过段时间还"\n结束' }
])

runCase('document markdown fenced json', docMarkdown)
runCase('document raw json with newlines', docRaw)
runCase('document escaped quotes', docEscaped)

console.log('done')
