import os
import re
import anthropic
from pathlib import Path
from typing import Dict, Any
import time

# Initialize Claude API client
client = anthropic.Anthropic(
    api_key=os.environ.get("ANTHROPIC_API_KEY")
)

def extract_frontmatter_and_content(file_content: str) -> tuple[str, str, str]:
    """
    Extracts frontmatter and content from a markdown file.
    Returns (frontmatter, content, full_file)
    """
    pattern = r'^---\s*\n(.*?)\n---\s*\n(.*)$'
    match = re.match(pattern, file_content, re.DOTALL)
    
    if match:
        return match.group(1), match.group(2), file_content
    else:
        return "", file_content, file_content

def parse_frontmatter(frontmatter: str) -> Dict[str, Any]:
    """Parse YAML-style frontmatter into a dictionary."""
    data = {}
    current_key = None
    lines = frontmatter.split('\n')
    
    for line in lines:
        if ':' in line and not line.startswith(' '):
            key, value = line.split(':', 1)
            current_key = key.strip()
            data[current_key] = value.strip()
        elif line.startswith('  ') and current_key:
            # Handle nested properties like image.url
            nested_line = line.strip()
            if ':' in nested_line:
                nested_key, nested_value = nested_line.split(':', 1)
                nested_key = nested_key.strip()
                nested_value = nested_value.strip().strip('"')
                
                if current_key not in data or isinstance(data[current_key], str):
                    data[current_key] = {}
                data[current_key][nested_key] = nested_value
    
    return data

def build_frontmatter(data: Dict[str, Any]) -> str:
    """Build frontmatter string from dictionary."""
    lines = []
    
    for key, value in data.items():
        if isinstance(value, dict):
            lines.append(f'{key}:')
            for nested_key, nested_value in value.items():
                # Wrap in quotes if it's a string path or text
                if nested_value:
                    lines.append(f'  {nested_key}: "{nested_value}"')
                else:
                    lines.append(f'  {nested_key}: ""')
        else:
            if value:
                lines.append(f'{key}: {value}')
            else:
                lines.append(f'{key}: ""')
    
    return '\n'.join(lines)

def process_with_claude(frontmatter_data: Dict[str, Any], content: str) -> tuple[Dict[str, Any], str]:
    """
    Send content to Claude API for processing and formatting.
    """
    
    # Build the prompt for Claude
    prompt = f"""You are processing a wedding testimonial from an Astro content collection. Please fix and format the following content according to these specifications:

**Frontmatter Requirements:**
1. coupleName: Format as "Name & Name" only - remove any extra details like surnames or locations
2. venue: Ensure this is the correct Australian wedding venue name as it appears on Google Maps and the venue's website
3. location: Format as "City, State" for Australian venues (e.g., "Brisbane, Queensland") or "Country" for international venues
4. If the venue location cannot be determined from the content, use "Brisbane City" for venue and "Brisbane, Queensland" for location

**Content Requirements:**
1. Format in UK/Australian English spelling
2. Break content into well-structured paragraphs for easy reading
3. Spell check and grammar check the content
4. At the end, format any wedding vendors as "Vendor Type: [Vendor Name](vendor-url)" with proper markdown links
5. Ensure vendor names and URLs are accurate and match real Australian wedding vendors

**Current Frontmatter:**
coupleName: {frontmatter_data.get('coupleName', '')}
venue: {frontmatter_data.get('venue', '')}
location: {frontmatter_data.get('location', '')}

**Current Content:**
{content}

**Output Format:**
Respond with a JSON object containing:
{{
  "coupleName": "corrected couple name",
  "venue": "corrected venue name",
  "location": "corrected location",
  "content": "fully formatted content with proper paragraphs and vendor links"
}}

IMPORTANT: 
- Only correct what needs correcting - leave accurate information as-is
- Ensure vendor links are real and working
- Use UK English spelling (colour, organised, etc.)
- Make sure paragraph breaks are logical and improve readability
- Do not make up vendor information - only format what's already present"""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        # Extract the JSON response
        response_text = response.content[0].text
        
        # Try to extract JSON from markdown code blocks if present
        json_match = re.search(r'```json\s*(.*?)\s*```', response_text, re.DOTALL)
        if json_match:
            response_text = json_match.group(1)
        
        # Parse the JSON response
        import json
        result = json.loads(response_text)
        
        # Update frontmatter data
        frontmatter_data['coupleName'] = result.get('coupleName', frontmatter_data.get('coupleName', ''))
        frontmatter_data['venue'] = result.get('venue', frontmatter_data.get('venue', ''))
        frontmatter_data['location'] = result.get('location', frontmatter_data.get('location', ''))
        
        # Get processed content
        processed_content = result.get('content', content)
        
        return frontmatter_data, processed_content
        
    except Exception as e:
        print(f"Error processing with Claude API: {e}")
        print(f"Response text: {response_text if 'response_text' in locals() else 'No response'}")
        return frontmatter_data, content

def process_markdown_file(filepath: Path, backup: bool = True):
    """
    Process a single markdown file.
    """
    print(f"\nProcessing: {filepath.name}")
    
    # Read the file
    with open(filepath, 'r', encoding='utf-8') as f:
        file_content = f.read()
    
    # Create backup if requested
    if backup:
        backup_path = filepath.with_suffix('.md.backup')
        with open(backup_path, 'w', encoding='utf-8') as f:
            f.write(file_content)
        print(f"  Backup created: {backup_path.name}")
    
    # Extract frontmatter and content
    frontmatter, content, _ = extract_frontmatter_and_content(file_content)
    
    if not frontmatter:
        print(f"  WARNING: No frontmatter found in {filepath.name}")
        return
    
    # Parse frontmatter
    frontmatter_data = parse_frontmatter(frontmatter)
    
    # Process with Claude API
    print(f"  Sending to Claude API...")
    updated_frontmatter, updated_content = process_with_claude(frontmatter_data, content)
    
    # Rebuild the file
    new_frontmatter = build_frontmatter(updated_frontmatter)
    new_file_content = f"---\n{new_frontmatter}\n---\n\n{updated_content}"
    
    # Write the updated file
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_file_content)
    
    print(f"  ✓ Updated successfully")
    
    # Rate limiting - be nice to the API
    time.sleep(1)

def main():
    """
    Main function to process all markdown files in the current directory.
    """
    print("Wedding Testimonial Formatter")
    print("=" * 50)
    
    # Check for API key
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("ERROR: ANTHROPIC_API_KEY environment variable not set")
        print("Please set your API key: export ANTHROPIC_API_KEY='your-key-here'")
        return
    
    # Get all markdown files in current directory
    current_dir = Path('.')
    md_files = list(current_dir.glob('*.md'))
    
    if not md_files:
        print("No markdown files found in current directory")
        return
    
    print(f"Found {len(md_files)} markdown file(s)")
    
    # Ask for confirmation
    response = input("\nProcess all files? (y/n): ").lower().strip()
    if response != 'y':
        print("Cancelled")
        return
    
    # Process each file
    success_count = 0
    for md_file in md_files:
        try:
            process_markdown_file(md_file)
            success_count += 1
        except Exception as e:
            print(f"  ERROR processing {md_file.name}: {e}")
    
    print("\n" + "=" * 50)
    print(f"Processing complete: {success_count}/{len(md_files)} files updated")
    print("Backup files created with .md.backup extension")

if __name__ == "__main__":
    main()