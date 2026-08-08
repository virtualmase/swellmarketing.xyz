# Crawler Policy

Last verified: 2026-08-08

## Intent

- Keep public pages available to general search crawlers and documented answer-retrieval crawlers.
- Opt out of documented general-purpose model-training uses where a distinct control exists.
- Use robots.txt for crawl or use controls that operators explicitly document.
- Use llms.txt only as a guide to important public content, never as permission control.
- Verify delivery with HTTP responses, WAF/CDN behavior, rendering, and logs where available.

## Current decisions

| Token | Decision | Reason |
|---|---|---|
| `*` | Allow | Public site intended for discovery. |
| `OAI-SearchBot` | Allowed through `*` | OpenAI documents it for search discovery and citation. |
| `GPTBot` | Disallow | OpenAI documents it as the control for potential model training. |
| `Claude-SearchBot`, `Claude-User` | Allowed through `*` | Anthropic documents these for search and user-directed retrieval. |
| `ClaudeBot`, `anthropic-ai` | Disallow | Anthropic documents these separately from search/user retrieval. |
| `PerplexityBot` | Allowed through `*` | Perplexity documents it for search results, not foundation-model training. |
| `Applebot` | Allowed through `*` | Apple documents it for search features. |
| `Applebot-Extended` | Disallow | Apple documents it as the control for generative foundation-model training use. |
| `Google-Extended` | Disallow | Preserves the training opt-out, with the tradeoff below. |

## Known tradeoff

Google currently documents `Google-Extended` as one token controlling both future Gemini model training and some Gemini grounding uses. Disallowing it preserves the training opt-out but may reduce eligibility for those grounding uses. It does not affect Google Search inclusion or ranking. Revisit this decision if Google separates the controls or Swell changes its publishing policy.

## First-party references

- OpenAI, Publishers and Developers FAQ: https://help.openai.com/en/articles/12627856-publishers-and-developers-faq
- Anthropic, web crawler controls: https://support.anthropic.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler
- Google, common crawlers and `Google-Extended`: https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers
- Apple, About Applebot: https://support.apple.com/en-ie/119829
- Perplexity, crawler documentation: https://docs.perplexity.ai/docs/resources/perplexity-crawlers

Review crawler tokens against these sources before changing the policy; names and purposes are not permanent.
