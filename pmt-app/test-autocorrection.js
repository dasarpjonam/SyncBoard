// Test the auto-correction logic

// Simulated config
const config = {
  types: ['Task', 'Bug', 'Feature', 'Epic'],
  statuses: ['To Do', 'In Progress', 'In Review', 'Done'],
  users: ['Alice', 'Bob', 'Charlie', 'David']
};

// Copy of findBestMatch from ChatInterface.tsx
function findBestMatch(input, options) {
  if (!input || options.length === 0) return null;
  
  const lower = input.toLowerCase().trim();
  
  // Exact match (case-insensitive)
  const exact = options.find(opt => opt.toLowerCase() === lower);
  if (exact) return exact;
  
  // Contains match
  const contains = options.find(opt => 
    opt.toLowerCase().includes(lower) || lower.includes(opt.toLowerCase())
  );
  if (contains) return contains;
  
  // Remove spaces/dashes and try again
  const normalized = lower.replace(/[\s-]/g, '');
  const normalizedMatch = options.find(opt => 
    opt.toLowerCase().replace(/[\s-]/g, '') === normalized
  );
  if (normalizedMatch) return normalizedMatch;
  
  return null;
}

// Copy of normalizeToolArgs from ChatInterface.tsx
function normalizeToolArgs(args, config) {
  const normalized = { ...args };
  
  // Normalize status
  if (args.status) {
    const match = findBestMatch(args.status, config.statuses);
    if (match) {
      normalized.status = match;
      if (match !== args.status) {
        console.log(`[Auto-correction] status: "${args.status}" → "${match}"`);
      }
    }
  }
  
  // Normalize type
  if (args.type) {
    const match = findBestMatch(args.type, config.types);
    if (match) {
      normalized.type = match;
      if (match !== args.type) {
        console.log(`[Auto-correction] type: "${args.type}" → "${match}"`);
      }
    }
  }
  
  // Normalize assignee
  if (args.assignee && config.users.length > 0) {
    const match = findBestMatch(args.assignee, config.users);
    if (match) {
      normalized.assignee = match;
      if (match !== args.assignee) {
        console.log(`[Auto-correction] assignee: "${args.assignee}" → "${match}"`);
      }
    }
  }
  
  return normalized;
}

// Test cases
console.log('🧪 Testing LLM Auto-Correction Logic\n');

const testCases = [
  { input: { status: 'done', type: 'task', assignee: 'alice' }, desc: 'Lowercase inputs' },
  { input: { status: 'DONE', type: 'BUG', assignee: 'BOB' }, desc: 'Uppercase inputs' },
  { input: { status: 'in-progress', type: 'feature', assignee: 'charlie' }, desc: 'Hyphenated status' },
  { input: { status: 'inprogress', type: 'Feature', assignee: 'David' }, desc: 'No space in status' },
  { input: { status: 'In Review', type: 'Epic', assignee: 'Alice' }, desc: 'Exact matches (should not log)' },
  { input: { status: 'progress', type: 'bug', assignee: 'bob' }, desc: 'Partial matches' },
  { input: { status: 'invalid', type: 'unknown', assignee: 'Jane' }, desc: 'Invalid values (should not match)' },
];

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.desc}`);
  console.log(`Input:`, testCase.input);
  const result = normalizeToolArgs(testCase.input, config);
  console.log(`Output:`, result);
  console.log('');
});

console.log('✅ Auto-correction logic test completed!');
console.log('\n📋 Summary:');
console.log('- Lowercase → Proper case (done → Done)');
console.log('- Uppercase → Proper case (BOB → Bob)');
console.log('- Hyphenated → Spaces (in-progress → In Progress)');
console.log('- No spaces → Spaces (inprogress → In Progress)');
console.log('- Partial match → Full match (progress → In Progress)');
