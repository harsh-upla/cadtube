export function formatBytes(bytes: number, decimals: number = 2): string {
  if (!+bytes) return '0 Bytes';

  // The standard binary base (1024 bytes = 1 KB)
  const k = 1024;
  
  // Ensure we don't have negative decimals
  const dm = decimals < 0 ? 0 : decimals;
  
  // The array of size suffixes
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  // Calculate the index of the sizes array using logarithms
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // Divide the bytes by the appropriate power of 1024 and append the suffix
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Subscribers Formats function
export function formatSubscribers(count: number): string {
  // Return the original number as a string if it's under 1,000
  if (count < 1000) {
    return count.toString();
  }

  // Define thresholds and their corresponding suffixes
  const thresholds = [
    { value: 1e12, suffix: 'T' }, // Trillion
    { value: 1e9, suffix: 'B' },  // Billion
    { value: 1e6, suffix: 'M' },  // Million
    { value: 1e3, suffix: 'k' }   // Thousand (lowercase as requested)
  ];

  for (const threshold of thresholds) {
    if (count >= threshold.value) {
      // Divide by the threshold and fix to 1 decimal place
      const formatted = (count / threshold.value).toFixed(1);
      
      // Remove trailing '.0' for clean round numbers (e.g., 12.0M -> 12M)
      return formatted.replace(/\.0$/, '') + threshold.suffix;
    }
  }

  return count.toString();
}

export function safeTitle(title: string): string {
  if (!title) return "untitled_video";

  return title
    // 1. Decode HTML entities (YouTube titles often have &amp;, &#39;, etc.)
    .replace(/&amp;/g, 'and')
    .replace(/&quot;/g, '')
    .replace(/&#39;/g, '')
    
    // 2. Normalize to decompose accents/diacritics (e.g., "é" becomes "e")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    
    // 3. Force lowercase for consistent system cross-compatibility
    .toLowerCase()
    
    // 4. Replace spaces, slashes, and backslashes with a single underscore
    .replace(/[\s/\\\s]+/g, "_")
    
    // 5. Remove anything that is NOT a lowercase letter, number, underscore, or hyphen
    // This instantly wipes out Windows/Linux illegal chars like: < > : " | ? *
    .replace(/[^a-z0-9_-]/g, "")
    
    // 6. Clean up any accidental consecutive underscores or hyphens
    .replace(/__+/g, "_")
    .replace(/--+/g, "-")
    
    // 7. Trim underscores/hyphens from the absolute start and end
    .replace(/^[-_]+|[-_]+$/g, "")
    
    // 8. Truncate to 100 characters max (Prevents OS "filename too long" errors)
    .substring(0, 100);
}