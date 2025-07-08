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
    
    def get_final_summary_prompt(self, combined_summaries: str) -> str:
        final_summary_prompt = f"""
You are an expert document summarizer and editor.

You’ve been given a set of partial summaries, each created from a different section or paragraph of a larger document. Your task is to **carefully consolidate all of them** into a single, well-structured, polished final summary.

🧠 Your Goals:
1. Read through all the provided partial summaries.
2. Merge them into **one coherent and logically flowing summary**.
3. **Avoid repeating** the same ideas or facts — eliminate redundancy.
4. **Preserve clarity, simplicity, and completeness** — even a curious 13-year-old should understand the result, but a Ph.D. reader should still find it useful.
5. **Follow the original tone and style**: simple, self-contained, and explanatory.
6. Maintain the **original integrity and key ideas** across all sections.
7. Organize content in a natural flow — from high-level ideas to supporting details if appropriate.

📌 Output Format:
- A single, polished summary paragraph (or two short paragraphs, max).
- No bullet points unless needed for clarity.
- Do not add new information not present in the original summaries.

📝 Preliminary summaries:
{combined_summaries}

✍️ Final, unified summary:
"""
        return final_summary_prompt












