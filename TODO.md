# TODO: Create Admin Community Moderation Page

## Steps

### STEP 1: Create public/admin/community.html
- [x] Copy content from public/admin/sessions.html as base
- [ ] Save as public/admin/community.html

### STEP 2: Update page metadata
- [ ] Change title to "Community Moderation"
- [ ] Change subtitle to "Manage discussion posts, pin helpful answers, remove inappropriate content"

### STEP 3: Replace stat boxes
- [ ] Replace with Total Posts, Total Replies, Reported Posts stats

### STEP 4: Replace toolbar/table section
- [ ] Add search input and filter dropdown
- [ ] Replace table with community posts table

### STEP 5: Replace JavaScript
- [ ] Implement loadPosts, renderStats, filterPosts, renderTable functions
- [ ] Implement togglePin, toggleHelpful, deletePost functions

### STEP 6: Update sidebar active link
- [ ] Add "active" class to community.html link
- [ ] Remove "active" from sessions.html link

### STEP 7: Add community link to all admin sidebar files
- [ ] dashboard.html
- [ ] users.html
- [ ] questions.html
- [ ] sessions.html
- [ ] subscriptions.html
- [ ] leaderboard.html
- [ ] blog.html
- [ ] battles.html
- [ ] study-halls.html
- [ ] notifications.html
- [ ] settings.html

### Backend STEP 8: Add PATCH route to community.js
- [ ] Add router.patch('/:id') endpoint for pin/helpful updates
