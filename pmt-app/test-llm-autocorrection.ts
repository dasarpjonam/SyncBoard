/**
 * Manual Test for LLM Auto-correction
 * 
 * This test demonstrates the normalization of user inputs
 * for status, type, and assignee fields.
 */

interface WorkspaceConfig {
  statuses: string[];
  types: string[];
  users: string[];
}

// Utility function to find best match for auto-correction
function findBestMatch(input: string, options: string[]): string | null {
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

// Normalize tool arguments to match workspace configuration
function normalizeToolArgs(
  args: Record<string, any>, 
  config: WorkspaceConfig
): Record<string, any> {
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
const config: WorkspaceConfig = {
  statuses: ['To Do', 'In Progress', 'In Review', 'Done'],
  types: ['Task', 'Bug', 'Feature', 'Epic'],
  users: ['Alice', 'Bob', 'Charlie']
};

console.log('=== LLM Auto-correction Test Cases ===\n');

// Test 1: Lowercase status
console.log('Test 1: Lowercase status');
const test1 = normalizeToolArgs({ status: 'done' }, config);
console.log('Result:', test1.status === 'Done' ? '✅ PASS' : '❌ FAIL');
console.log();

// Test 2: Uppercase status
console.log('Test 2: Uppercase status');
const test2 = normalizeToolArgs({ status: 'IN PROGRESS' }, config);
console.log('Result:', test2.status === 'In Progress' ? '✅ PASS' : '❌ FAIL');
console.log();

// Test 3: No spaces in status
console.log('Test 3: No spaces in status');
const test3 = normalizeToolArgs({ status: 'inprogress' }, config);
console.log('Result:', test3.status === 'In Progress' ? '✅ PASS' : '❌ FAIL');
console.log();

// Test 4: With hyphens
console.log('Test 4: With hyphens');
const test4 = normalizeToolArgs({ status: 'in-progress' }, config);
console.log('Result:', test4.status === 'In Progress' ? '✅ PASS' : '❌ FAIL');
console.log();

// Test 5: Lowercase type
console.log('Test 5: Lowercase type');
const test5 = normalizeToolArgs({ type: 'bug' }, config);
console.log('Result:', test5.type === 'Bug' ? '✅ PASS' : '❌ FAIL');
console.log();

// Test 6: Lowercase user
console.log('Test 6: Lowercase user');
const test6 = normalizeToolArgs({ assignee: 'bob' }, config);
console.log('Result:', test6.assignee === 'Bob' ? '✅ PASS' : '❌ FAIL');
console.log();

// Test 7: Uppercase user
console.log('Test 7: Uppercase user');
const test7 = normalizeToolArgs({ assignee: 'ALICE' }, config);
console.log('Result:', test7.assignee === 'Alice' ? '✅ PASS' : '❌ FAIL');
console.log();

// Test 8: Multiple fields at once
console.log('Test 8: Multiple fields at once');
const test8 = normalizeToolArgs(
  { status: 'todo', type: 'feature', assignee: 'charlie' },
  config
);
console.log('Result:', 
  test8.status === 'To Do' && 
  test8.type === 'Feature' && 
  test8.assignee === 'Charlie' ? '✅ PASS' : '❌ FAIL'
);
console.log();

// Test 9: Invalid value (should not match)
console.log('Test 9: Invalid value (should not match)');
const test9 = normalizeToolArgs({ status: 'nonexistent' }, config);
console.log('Result:', test9.status === 'nonexistent' ? '✅ PASS (unchanged as expected)' : '❌ FAIL');
console.log();

// Test 10: Partial match
console.log('Test 10: Partial match (contains)');
const test10 = normalizeToolArgs({ status: 'progress' }, config);
console.log('Result:', test10.status === 'In Progress' ? '✅ PASS' : '❌ FAIL');
console.log();

console.log('=== Summary ===');
console.log('All tests demonstrate the auto-correction functionality.');
console.log('The normalizeToolArgs function is now integrated into ChatInterface.tsx');
console.log('and will automatically correct user inputs when processing LLM tool calls.');
