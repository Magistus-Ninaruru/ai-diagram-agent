export interface DiagramData {
  mermaid: string | null;
  drawioXml: string | null;
}

/**
 * Extract mermaid code and draw.io XML from AI response text.
 * Handles both complete and partial (streaming) responses.
 */
export function parseDiagrams(text: string): DiagramData {
  return {
    mermaid: extractCodeBlock(text, "mermaid", true),
    drawioXml: extractCodeBlock(text, "drawio-xml", false), // XML must be complete
  };
}

function extractCodeBlock(
  text: string,
  lang: string,
  allowPartial: boolean
): string | null {
  // Match ```lang ... ``` blocks
  const regex = new RegExp("```" + lang + "\\s*\\n([\\s\\S]*?)```", "g");
  const matches: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1].trim());
  }

  if (matches.length > 0) {
    // Return the last complete match (most recent diagram)
    return matches[matches.length - 1];
  }

  // Check for an incomplete block (still streaming) — only for forgiving formats
  if (!allowPartial) return null;

  const incompleteRegex = new RegExp("```" + lang + "\\s*\\n([\\s\\S]+?)$");
  const incompleteMatch = incompleteRegex.exec(text);
  if (incompleteMatch) {
    const content = incompleteMatch[1].trim();
    // Only return if there's meaningful content
    if (content.length > 10) {
      return content;
    }
  }

  return null;
}
