/**
 * Test Geographic Filtering Logic
 *
 * This script tests the filtering logic to ensure it works correctly
 */

// Mock filters and items
const testCases = [
  {
    name: 'Scenario 1: Väljer Sundsvall kommun',
    filters: {
      regionCodes: [],
      municipalityCodes: ['2281'], // Sundsvall
      showItemsWithoutLocation: true
    },
    items: [
      { title: 'Event 1', municipalityCode: '2281', regionCode: 'Y' }, // Sundsvall - SHOULD MATCH
      { title: 'Event 2', municipalityCode: '2280', regionCode: 'Y' }, // Örnsköldsvik - SHOULD NOT MATCH
      { title: 'Event 3', municipalityCode: null, regionCode: 'Y' }, // Västernorrland (no municipality) - SHOULD NOT MATCH
      { title: 'Event 4', municipalityCode: null, regionCode: null }, // No location - SHOULD MATCH (showItemsWithoutLocation=true)
    ],
    expectedCount: 2,
    expectedTitles: ['Event 1', 'Event 4']
  },
  {
    name: 'Scenario 2: Väljer Västernorrlands län',
    filters: {
      regionCodes: ['Y'],
      municipalityCodes: [],
      showItemsWithoutLocation: true
    },
    items: [
      { title: 'Event 1', municipalityCode: '2281', regionCode: 'Y' }, // Sundsvall - SHOULD MATCH
      { title: 'Event 2', municipalityCode: '2280', regionCode: 'Y' }, // Örnsköldsvik - SHOULD MATCH
      { title: 'Event 3', municipalityCode: null, regionCode: 'Y' }, // Västernorrland (no municipality) - SHOULD MATCH
      { title: 'Event 4', municipalityCode: null, regionCode: 'X' }, // Gävleborg - SHOULD NOT MATCH
      { title: 'Event 5', municipalityCode: null, regionCode: null }, // No location - SHOULD MATCH (showItemsWithoutLocation=true)
    ],
    expectedCount: 4,
    expectedTitles: ['Event 1', 'Event 2', 'Event 3', 'Event 5']
  },
  {
    name: 'Scenario 3: Väljer Sundsvall, stänger av "Visa utan plats"',
    filters: {
      regionCodes: [],
      municipalityCodes: ['2281'],
      showItemsWithoutLocation: false
    },
    items: [
      { title: 'Event 1', municipalityCode: '2281', regionCode: 'Y' }, // Sundsvall - SHOULD MATCH
      { title: 'Event 2', municipalityCode: '2280', regionCode: 'Y' }, // Örnsköldsvik - SHOULD NOT MATCH
      { title: 'Event 3', municipalityCode: null, regionCode: null }, // No location - SHOULD NOT MATCH (showItemsWithoutLocation=false)
    ],
    expectedCount: 1,
    expectedTitles: ['Event 1']
  },
  {
    name: 'Scenario 4: Inga filter valda',
    filters: {
      regionCodes: [],
      municipalityCodes: [],
      showItemsWithoutLocation: true
    },
    items: [
      { title: 'Event 1', municipalityCode: '2281', regionCode: 'Y' },
      { title: 'Event 2', municipalityCode: null, regionCode: null },
      { title: 'Event 3', municipalityCode: '2280', regionCode: 'Y' },
    ],
    expectedCount: 3,
    expectedTitles: ['Event 1', 'Event 2', 'Event 3']
  }
];

// Filter logic (extracted from useGeoFilters)
function applyFilters(items, filters) {
  const hasGeoFilters = filters.regionCodes.length > 0 || filters.municipalityCodes.length > 0;

  if (!hasGeoFilters) {
    return items;
  }

  return items.filter(item => {
    const hasLocation = !!(
      item.countryCode ||
      item.regionCode ||
      item.municipalityCode
    );

    if (!hasLocation) {
      return filters.showItemsWithoutLocation;
    }

    let matches = false;

    if (filters.municipalityCodes.length > 0) {
      if (item.municipalityCode && filters.municipalityCodes.includes(item.municipalityCode)) {
        matches = true;
      }
    }

    if (filters.regionCodes.length > 0) {
      if (item.regionCode && filters.regionCodes.includes(item.regionCode)) {
        matches = true;
      }
    }

    return matches;
  });
}

// Run tests
console.log('🧪 Testing Geographic Filtering Logic\n');

let allPassed = true;

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`  Filters: ${JSON.stringify(testCase.filters)}`);

  const filtered = applyFilters(testCase.items, testCase.filters);
  const actualTitles = filtered.map(item => item.title);

  const passed =
    filtered.length === testCase.expectedCount &&
    actualTitles.every(title => testCase.expectedTitles.includes(title)) &&
    testCase.expectedTitles.every(title => actualTitles.includes(title));

  if (passed) {
    console.log(`  ✅ PASSED: ${filtered.length} items matched`);
    console.log(`     Expected: ${testCase.expectedTitles.join(', ')}`);
    console.log(`     Got:      ${actualTitles.join(', ')}`);
  } else {
    console.log(`  ❌ FAILED:`);
    console.log(`     Expected ${testCase.expectedCount} items: ${testCase.expectedTitles.join(', ')}`);
    console.log(`     Got ${filtered.length} items: ${actualTitles.join(', ')}`);
    allPassed = false;
  }
  console.log();
});

if (allPassed) {
  console.log('✅ All tests passed!');
  process.exit(0);
} else {
  console.log('❌ Some tests failed!');
  process.exit(1);
}
