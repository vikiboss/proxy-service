import { createHandler, markdownContent } from './handler.ts'

Deno.serve(createHandler(markdownContent))
