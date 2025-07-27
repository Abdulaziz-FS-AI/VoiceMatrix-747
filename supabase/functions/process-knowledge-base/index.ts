import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const { assistantId, content } = await req.json()
    
    if (!assistantId || !content) {
      return new Response('Missing assistantId or content', { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Processing knowledge base for assistant:', assistantId)

    // 1. Delete existing chunks for this assistant
    const { error: deleteError } = await supabase
      .from('knowledge_chunks')
      .delete()
      .in('knowledge_base_id', 
        supabase
          .from('knowledge_bases')
          .select('id')
          .eq('assistant_id', assistantId)
      )

    if (deleteError) {
      console.error('Failed to delete existing chunks:', deleteError)
    }

    // 2. Chunk content
    const chunks = chunkContent(content)
    console.log(`Created ${chunks.length} chunks`)

    // 3. Process chunks in batches to avoid rate limits
    const batchSize = 10
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize)
      
      try {
        // Generate embeddings for this batch
        const embeddings = await generateEmbeddings(batch.map(c => c.text))
        
        // Get knowledge base ID
        const { data: knowledgeBase } = await supabase
          .from('knowledge_bases')
          .select('id')
          .eq('assistant_id', assistantId)
          .single()

        if (!knowledgeBase) {
          throw new Error('Knowledge base not found')
        }

        // Prepare chunk data
        const chunkData = batch.map((chunk, index) => ({
          knowledge_base_id: knowledgeBase.id,
          content: chunk.text,
          embedding: embeddings[index],
          chunk_index: i + index,
          metadata: chunk.metadata
        }))

        // Insert chunks
        const { error: insertError } = await supabase
          .from('knowledge_chunks')
          .insert(chunkData)

        if (insertError) {
          console.error('Failed to insert batch:', insertError)
          throw insertError
        }

        console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`)

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (batchError) {
        console.error(`Failed to process batch starting at ${i}:`, batchError)
        throw batchError
      }
    }

    // 4. Mark knowledge base as processed
    const { error: updateError } = await supabase
      .from('knowledge_bases')
      .update({ processed_at: new Date().toISOString() })
      .eq('assistant_id', assistantId)

    if (updateError) {
      console.error('Failed to mark as processed:', updateError)
    }

    console.log('Knowledge base processing completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        chunksCreated: chunks.length 
      }), 
      {
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Knowledge base processing failed:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Processing failed' 
      }), 
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})

function chunkContent(content: string) {
  // Smart chunking algorithm
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0)
  const chunks: Array<{text: string, metadata: any}> = []
  
  const maxTokens = 800 // Conservative limit
  let currentChunk = ''
  
  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim()
    
    // Estimate tokens (rough: 4 chars = 1 token)
    const currentTokens = Math.ceil(currentChunk.length / 4)
    const paragraphTokens = Math.ceil(trimmedParagraph.length / 4)
    
    if (currentTokens + paragraphTokens > maxTokens && currentChunk) {
      // Save current chunk
      chunks.push({
        text: currentChunk.trim(),
        metadata: { 
          type: 'paragraph_group',
          tokens: currentTokens 
        }
      })
      
      // Start new chunk with some overlap
      const lastSentence = getLastSentence(currentChunk)
      currentChunk = lastSentence ? lastSentence + ' ' + trimmedParagraph : trimmedParagraph
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmedParagraph
    }
  }
  
  // Add final chunk
  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      metadata: { 
        type: 'paragraph_group',
        tokens: Math.ceil(currentChunk.length / 4) 
      }
    })
  }
  
  return chunks
}

function getLastSentence(text: string): string {
  const sentences = text.split(/[.!?]+/)
  if (sentences.length > 1) {
    const lastSentence = sentences[sentences.length - 2]?.trim()
    return lastSentence ? lastSentence + '.' : ''
  }
  return ''
}

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured')
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: texts
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${response.status} ${error}`)
  }

  const data = await response.json()
  return data.data.map((item: any) => item.embedding)
}