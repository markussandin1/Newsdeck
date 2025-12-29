/**
 * Generate Name Variants for Location Matching
 *
 * Generates common variations of geographic names for fuzzy matching.
 *
 * Examples:
 * - "Stockholms län" → ["Stockholms län", "Stockholm", "Stockholms"]
 * - "Uppsala län" → ["Uppsala län", "Uppsala"]
 * - "Upplands Väsby" → ["Upplands Väsby", "Upplands Vasby", "Väsby", "Vasby"]
 */

/**
 * Generate variants for a location name
 * @param {string} name - The location name (e.g., "Stockholms län")
 * @param {string} type - 'region' or 'municipality'
 * @returns {string[]} - Array of name variants
 */
export function generateNameVariants(name, type = 'region') {
  const variants = new Set();

  // Always include the exact name
  variants.add(name);

  if (type === 'region') {
    // For regions (counties), generate variants without "län"
    const withoutLan = name.replace(/\s+län$/i, '').trim();
    if (withoutLan !== name) {
      variants.add(withoutLan);
    }

    // Remove possessive 's' (e.g., "Stockholms" → "Stockholm")
    const withoutPossessive = withoutLan.replace(/s$/i, '');
    if (withoutPossessive !== withoutLan && withoutPossessive.length > 3) {
      variants.add(withoutPossessive);
    }

    // Common abbreviations
    const abbreviations = {
      'Stockholms län': ['Stockholm', 'Sthlm'],
      'Västra Götalands län': ['Västra Götaland', 'VG', 'Göteborg'],
      'Skåne län': ['Skåne', 'Malmö'],
      'Värmlands län': ['Värmland', 'Karlstad'],
      'Norrbottens län': ['Norrbotten', 'Luleå'],
      'Västerbottens län': ['Västerbotten', 'Umeå'],
      'Västernorrlands län': ['Västernorrland', 'Sundsvall']
    };

    if (abbreviations[name]) {
      abbreviations[name].forEach(abbr => variants.add(abbr));
    }
  }

  if (type === 'municipality') {
    // For municipalities with compound names, add the last part
    // E.g., "Upplands Väsby" → "Väsby"
    const parts = name.split(/\s+/);
    if (parts.length > 1) {
      variants.add(parts[parts.length - 1]);
    }

    // Add variant without prefix (e.g., "Upplands-Bro" → "Bro")
    const withoutPrefix = name.replace(/^[A-Za-zÅÄÖåäö]+-/, '');
    if (withoutPrefix !== name) {
      variants.add(withoutPrefix);
    }
  }

  // Add ASCII variants for names with Swedish characters
  const asciiVariant = name
    .replace(/å/gi, 'a')
    .replace(/ä/gi, 'a')
    .replace(/ö/gi, 'o');
  if (asciiVariant !== name) {
    variants.add(asciiVariant);

    // Also add ASCII variants of other generated variants
    if (type === 'municipality') {
      const parts = asciiVariant.split(/\s+/);
      if (parts.length > 1) {
        variants.add(parts[parts.length - 1]);
      }
    }
  }

  return Array.from(variants);
}

// Example usage (for testing)
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Region variants for "Stockholms län":');
  console.log(generateNameVariants('Stockholms län', 'region'));

  console.log('\nRegion variants for "Västra Götalands län":');
  console.log(generateNameVariants('Västra Götalands län', 'region'));

  console.log('\nMunicipality variants for "Upplands Väsby":');
  console.log(generateNameVariants('Upplands Väsby', 'municipality'));

  console.log('\nMunicipality variants for "Upplands-Bro":');
  console.log(generateNameVariants('Upplands-Bro', 'municipality'));

  console.log('\nMunicipality variants for "Örnsköldsvik":');
  console.log(generateNameVariants('Örnsköldsvik', 'municipality'));
}
