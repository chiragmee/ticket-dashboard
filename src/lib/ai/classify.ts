import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function classifyCategory(subject: string, description: string): Promise<string> {
  const validCategories = ['bug', 'feature', 'query', 'other']

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [
        {
          role: 'user',
          content: `Classify this support ticket into exactly one category.

Categories:
- bug: software defect, error, crash, something not working, broken functionality
- feature: new feature request, add functionality, improvement, enhancement, make better, optimize
- query: question, how to, help needed, information request, clarification
- other: anything that doesn't fit above

Ticket subject: ${subject}
Ticket description: ${description?.slice(0, 500) ?? ''}

Reply with just the category word (bug/feature/query/other), nothing else.`,
        },
      ],
    })

    const result = (message.content[0] as { text: string }).text.trim().toLowerCase()
    return validCategories.includes(result) ? result : 'query'
  } catch {
    return 'query'
  }
}

export async function classifyPriority(subject: string, description: string): Promise<string> {
  const validPriorities = ['urgent', 'high', 'normal', 'low']

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [
        {
          role: 'user',
          content: `Classify the urgency of this support ticket.

Priorities:
- urgent: system down, complete outage, data loss, can't login, payments failing, production broken — immediate action needed
- high: major feature broken, significant business impact, affects multiple users, error blocking key workflow
- normal: single user issue, partial functionality broken, general bugs with a workaround available
- low: cosmetic issue, minor inconvenience, feature request, general question, how-to query

Ticket subject: ${subject}
Ticket description: ${description?.slice(0, 500) ?? ''}

Reply with just the priority word (urgent/high/normal/low), nothing else.`,
        },
      ],
    })

    const result = (message.content[0] as { text: string }).text.trim().toLowerCase()
    return validPriorities.includes(result) ? result : 'normal'
  } catch {
    return 'normal'
  }
}

export async function classifyDomain(subject: string, description: string): Promise<string> {
  const validDomains = ['krt', 'brigade', 'acb', 'other']

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [
        {
          role: 'user',
          content: `Classify this support ticket into a product domain.

Domains:
- krt: mentions Knowledge Realty Trust, KRT, Nucleus, or Spark app/product
- brigade: mentions Brigade, Brigade NXT, Brigade WTC, or Brigade properties
- acb: mentions ACB, Anacity Business, or business portal
- other: none of the above domains mentioned

Ticket subject: ${subject}
Ticket description: ${description?.slice(0, 500) ?? ''}

Reply with just the domain code (krt/brigade/acb/other), nothing else.`,
        },
      ],
    })

    const result = (message.content[0] as { text: string }).text.trim().toLowerCase()
    return validDomains.includes(result) ? result : 'other'
  } catch {
    return 'other'
  }
}
