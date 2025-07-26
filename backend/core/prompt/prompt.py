class PromptManager:
    """
    Professional prompt management system for document processing.
    Provides centralized access to all prompts used in the application.
    """
    
    def __init__(self, user_instructions: str = "Explain the document in a way that is easy to understand and engaging."):
        """Initialize the PromptManager with default user instructions."""
        self.user_instructions = user_instructions
    
    def get_document_parser_prompt(self) -> str:
        """
        Returns the prompt for document parsing and content extraction.
        
        Returns:
            str: Document parser prompt with instructions and format specifications
        """
        return """You are an expert document parser. Your task is to extract and structure content from uploaded documents.

Instructions:
1. Parse the document and extract all paragraphs
2. Maintain the original order and structure
3. Identify section headers, titles, and subsections
4. Preserve any formatting markers (bold, italic, etc.)
5. Handle mathematical formulas, code blocks, and special content appropriately
6. Return a structured format with paragraph IDs and metadata
"""
    
    def get_document_summary_prompt(self) -> str:
        """
        Returns the prompt for generating document summaries.
        
        Returns:
            str: Document summary prompt with analysis instructions
        """
        return """You are an expert document summarizer. Create a comprehensive overview of the uploaded document.

Instructions:
1. Analyze the entire document content
2. Identify the main topic, key themes, and central arguments
3. Highlight important concepts, methodologies, and findings
4. Note the document's structure and organization
5. Provide context about the document's purpose and audience
6. Keep the summary concise but informative
"""
    
    def get_conversation_summary_prompt(self) -> str:
        """
        Returns the prompt for summarizing user interactions and progress.
        
        Returns:
            str: Conversation summary prompt with tracking instructions
        """
        return """You are an expert conversation summarizer. Create a summary of the user's interaction with the document.

Instructions:
1. Track the user's progress through the document
2. Note which paragraphs have been processed and explained
3. Record any user preferences or custom prompts used
4. Maintain context of previous explanations
5. Identify patterns in user engagement
6. Provide insights for improving the experience
"""
    
    def get_paragraph_parsing_main_prompt(self, user_instructions: str = None) -> str:
        """
        Returns the main prompt for paragraph analysis and explanation.
        
        Args:
            user_instructions (str, optional): Custom user instructions. 
                                             Defaults to class default if not provided.
        
        Returns:
            str: Main paragraph parsing prompt with user instructions integrated
        """
        instructions = user_instructions or self.user_instructions
        
        return f"""You are an expert paragraph analyzer and explainer. Your task is to process individual paragraphs based on user-defined prompts.

Instructions:
1. Read the provided paragraph carefully
2. Understand the context and technical level
3. Apply the user's specific prompt to generate an explanation
4. Maintain accuracy while adapting to the requested style
5. Consider the paragraph's role in the larger document
6. Provide clear, engaging explanations that enhance understanding
7. User Instructions: {instructions}

"""
    
    def get_paragraph_parsing_sub_prompt(self) -> str:
        """
        Returns the specialized prompt for content-type specific paragraph processing.
        
        Returns:
            str: Sub-prompt for handling different content types
        """
        return """You are a specialized paragraph processor for specific content types.

Instructions:
1. Identify the type of content in the paragraph
2. Apply specialized processing based on content type
3. Maintain technical accuracy while improving clarity
4. Consider the audience's background knowledge
5. Provide context-appropriate explanations

Content Type Handlers:

MATHEMATICAL FORMULAS:
- Explain each component of the formula
- Provide intuitive understanding of what it represents
- Give examples of when and how it's used
- Break down complex mathematical notation

CODE BLOCKS:
- Explain the purpose and functionality
- Break down key algorithms or functions
- Highlight important variables and their roles
- Provide context for when this code would be used

TECHNICAL DEFINITIONS:
- Provide clear, precise explanations
- Give examples and non-examples
- Explain why the definition matters
- Connect to broader concepts

EXPERIMENTAL RESULTS:
- Explain what was measured and how
- Interpret the significance of results
- Connect to the research question
- Highlight limitations and implications
"""

    def get_chunk_summary_prompt(self, chunk: str) -> str:
        prompt = f"""You are an expert educational summarizer with deep knowledge across technical and non-technical subjects.

Your task is to read a given text chunk from a document and generate a simplified, self-explanatory summary that can be clearly understood by:
- A curious 13-year-old (8th grade level), and
- A Ph.D. researcher looking for conceptual clarity

📌 Instructions:
1. Read and understand the chunk completely — its purpose, content, and context.
2. Capture the **core ideas** and **essential details** without skipping technical meaning.
3. Rewrite the content into a **very clear**, **simple**, and **self-contained** explanation.
4. Avoid jargon, or briefly explain it if unavoidable.
5. Use simple analogies or real-world examples where helpful, but don’t oversimplify critical ideas.
6. Do not assume prior knowledge from the reader.
7. The summary should **preserve the integrity and nuance** of the original, but **simplify the language and flow**.

🎯 Output:
- Write the summary in a friendly, clear tone.
- Format as a short paragraph or bullet points (if appropriate).
- Do not include any external information — only what’s present in the input chunk.

💡 Example tone: “Imagine you’re explaining this to both a sharp school kid and a brilliant researcher — they should both say ‘Now I get it!’ after reading.”

<<<TEXT CHUNK STARTS BELOW>>>
{chunk}
<<<TEXT CHUNK ENDS>>>

"""
        return prompt
    
    def get_group_chunk_summary_prompt(self, combined_chunks: str) -> str:
    #     group_chunk_summary_prompt = f"""
    # You are an expert language model summarizer, editor, and educator.

    # You have received multiple content chunks from a document. Each chunk represents a different section or paragraph. Your job is to consolidate all of them into a **clear, accurate, and logically structured summary**.

    # 🎯 Objectives:
    # 1. **Fully understand** the meaning and intent of each chunk.
    # 2. **Merge them into a single, coherent summary**, keeping the structure and flow natural.
    # 3. **Eliminate any repetition or redundancy** across chunks.
    # 4. Retain the **original meaning, integrity, and technical value** of the content.
    # 5. Do **not include external facts or assumptions**.

    # 📦 Output Guidelines:
    # - Ensure all major points and concepts are preserved.
    # - No headings or formatting beyond plain text.

    # 📝 Document Chunks to summarize:
    # {combined_chunks}

    # ✍️ Final draft summary:
    # """
    
        group_chunk_summary_prompt = f"""
You are a world-class summarization expert. Condense the following document chunks into one concise, accurate, and logically ordered summary. Remove redundancy, preserve all key points and technical integrity, and add nothing beyond the source.

📝 Input chunks:
{combined_chunks}

✍️ Final summary:
"""
        return group_chunk_summary_prompt
    
    
    def get_final_summary_prompt(self, combined_summaries: str) -> str:
        
    #         🧠 Your Responsibilities:
    # 1. Carefully read the provided summaries to understand the full document.
    # 2. Consolidate them into a single summary that:
    # - Is **clear, well-structured, and self-contained**
    # - **Avoids repetition** and eliminates overlaps
    # - Preserves **all key ideas and technical insights**
    # - Matches the **tone and clarity expected in the original prompt** (i.e., understandable by a school student and insightful to a researcher)
    # 3. Maintain **neutral tone**, no personal opinions or added commentary.
    # 4. Ensure the summary is ready for presentation, reporting, or further simplification.
        
        
        final_summary_prompt = f"""
Rewrite the following summaries into one clear and cohesive summary. Eliminate any repetition, and maintain the accuracy and integrity of the original summaries.

📝 Preliminary summaries to merge:
{combined_summaries}

✍️ Final, unified summary:
"""


        return final_summary_prompt
    
    def get_normal_prompt(self, prompt: str) -> str:
        
        return f"""
    Please explain the topic in detail from scratch, assuming I am a complete beginner. Break it down step by step in simple terms. Cover all relevant aspects—what it is, why it matters, how it works, and where it’s used. Don’t jump into code yet; I want to build a strong conceptual foundation first. Use analogies, examples, and your expert knowledge or research to make it as clear and understandable as possible. Go as deep as needed, but keep the language simple and accessible. 
    """
    

    def get_bundle_summary_prompt(self, text: str) -> str:
        
        return f"""
    You are an expert document summarizer. Create a comprehensive overview of the uploaded document.

Instructions:
1. Analyze the entire document content
2. Identify the main topic, key themes, and central arguments
3. Highlight important concepts, methodologies, and findings
4. Note the document's structure and organization
5. Provide context about the document's purpose and audience
6. Keep the summary concise but informative.

{text}
    """
    
    def get_pranav_tailored_summary_prompt(self, bundle_context: str, bundle_summary: str) -> str:
        response_prompt = f"""
You are a PhD-level professor and domain expert with deep technical expertise and exceptional explanatory skills. Your role is to conceptually analyze the given passage in relation to its surrounding context. This is not a summarization task — your objective is to produce a precise, structured, and insightful explanation that captures how the passage contributes to the broader thematic and logical flow of the document.

The context includes summaries of the preceding, current, and subsequent sections of the document, which together form the conceptual backdrop for your analysis.

Context Window:
{bundle_context}

Bundle Summaries:
{bundle_summary}

In your response, address the following:
- How does the passage relate to the progression of ideas across the three summarized sections?
- What role does it play — e.g., introducing a shift, elaborating on a theme, bridging concepts, or setting up future discussion?
- What logical, thematic, or structural connections does it maintain with surrounding sections?
- Are there any implicit assumptions, dependencies, or transitions that strengthen continuity?
- Highlight any subtle shifts or deeper meanings that emerge only when considering the broader context.

Please provide a well-composed, conceptually rich explanation that reflects a deep understanding of the material. Avoid mentioning terms like “chunk” or variable names. Write in an academic tone, as if composing a commentary for a research seminar or scholarly review.
"""
        return response_prompt