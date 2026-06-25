# AI Skill Gap & Learning Management Portal

A static, dependency-light single-page web app for tracking employee skill gaps
against target roles and managing learning. It talks to an existing AWS API
Gateway backend — there is no build step.

## Features

**Employee view**
- Select an employee + target role and run a **skill gap analysis** (matched %,
  matched/missing skills, recommended courses, animated progress bar)
- View **skill-gap history** with client-side pagination, favorites, and per-entry
  or full CSV download
- Export the current analysis to **CSV** or **PDF**
- **Request** addition of a learned skill / certification
- Profile panel + a header notification pill for approval/rejection status

**Manager view**
- Review and **approve / reject** pending skill requests
- List **expiring certifications** (next 90 days)
- **Team skill-gap tracker** (runs the analysis across the whole team)
- **Assign learning** to a team member
- **Manage employees**: update target roles and create new employees

## Project structure

```
index.html          Markup only — no inline CSS/JS
css/
  styles.css        Consolidated theme (light/dark) + components
js/
  config.js         API base URL + endpoint paths + constants
  api.js            fetch wrapper, one function per endpoint
  ui.js             Theme, nav, view switching, helpers, toasts, shared state
  employee.js       Employee-view logic
  manager.js        Manager-view logic
  app.js            Bootstrap + central [data-action] event delegation
```

The UI uses two third-party libraries from CDNs:
[Choices.js](https://github.com/Choices-js/Choices) (searchable dropdowns) and
[html2pdf.js](https://github.com/eKoopmans/html2pdf.js) (PDF export).

## Running

Open `index.html` directly in a browser, or serve the folder:

```bash
# Python
python -m http.server 8080
# then visit http://localhost:8080
```

## Configuration

The backend base URL and all endpoint paths live in
[`js/config.js`](js/config.js). Update `CONFIG.API_BASE` to point at a different
deployment.
