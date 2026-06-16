# Task Plan: Fix Flash CBT Multi-Subject Bug

## Information Gathered

### File: backend/src/routes/sessions.js
- Route: `router.post('/submit')` - handles session submission
- Current bug: when mode is 'flash-cbt' with multiple subjects, the `subject` field is null/empty
- The subject is directly taken from `req.body.subject` which is null for multi-subject Flash CBT sessions

### File: public/results.html  
- `renderResults()` function displays subject breakdown
- Currently displays subject name as plain text in `.subj-name` div
- Need to handle comma-separated subject strings and display as chips/tags

## Plan

### Step 1: Fix backend/src/routes/sessions.js
Modify the session submit handler to:
1. Check if mode is 'flash-cbt' and subject is null/empty
2. Extract all unique subjects from the questions array in req.body
3. Join them as a comma-separated string
4. Store the joined string as subject

#### Code Changes:
```javascript
// In router.post('/submit', ...)
// After extracting answers from req.body, add:

let finalSubject = subject;

// For flash-cbt mode with no subject specified, extract subjects from questions
if (mode === 'flash-cbt' && !finalSubject && questions && questions.length > 0) {
  const uniqueSubjects = [...new Set(questions.map(q => q.subject).filter(Boolean))];
  if (uniqueSubjects.length > 0) {
    finalSubject = uniqueSubjects.join(', ');
  }
}

// Then use finalSubject when creating the session:
subject: finalSubject || null,
```

### Step 2: Fix public/results.html
Modify the subject display in `renderResults()` to:
1. Check if subject contains a comma (indicates multiple subjects)
2. If comma-separated, split and display as chips/tags
3. Otherwise display as plain text

#### Code Changes:
In the `renderResults()` function, modify subjectRow generation:
```javascript
// Replace subject display logic
const displaySubject = (subj) => {
  if (subj.includes(',')) {
    // Split and display as chips
    return subj.split(',').map(s => 
      `<span class="subject-chip">${s.trim()}</span>`
    ).join('');
  }
  return subj;
};

// Update subjectRows mapping
const subjectRows = Object.entries(subjectBreakdown).map(([subj,data]) => {
  // ... existing code ...
  return `<div class="subj-row"><div class="subj-name">${displaySubject(subj)}</div>...</div>`;
}).join('');
```

### Step 3: Add CSS for chips in results.html
Add styles for `.subject-chip` class:
```css
.subject-chip {
  display: inline-block;
  padding: 2px 8px;
  background: var(--navy);
  color: #fff;
  border-radius: 12px;
  font-size: 11px;
  margin-right: 4px;
  margin-bottom: 4px;
}
```

## Dependent Files
1. backend/src/routes/sessions.js - Main fix
2. public/results.html - Display fix + CSS

## Followup Steps
1. Test the backend fix by submitting a Flash CBT session covering multiple subjects
2. Verify the results page displays subjects as chips properly
